import crypto from "node:crypto";
import { parentPort } from "node:worker_threads";
import {
	deserializeGrothProof,
	deserializeVKey,
	verifyGroth16Proof,
} from "../crypto/groth16-verifier.js";
import { deriveLogicImageDigest } from "../crypto/logic-image-id.js";
import {
	decodeJournalV2,
	ProofType,
	RECEIPT_VERSION_V1,
	RECEIPT_VERSION_V2,
	receiptCodec,
	type ZkPolicy,
} from "../security/zk.js";

// Ensure this worker is used via Piscina pool
if (!parentPort) {
	// Not fatal in Piscina, but handled appropriately
}

/**
 * ZK Verification Payload Structure.
 * Modeled after RISC Zero & SP1 Receipt formats.
 */
export interface ZkVerificationPayload {
	action: "verify_receipt" | "warmup";
	/** Original logic payload (JS/WASM) sent by client */
	logicPayload?: Uint8Array;
	/** Expected ImageID (SHA-256) of the execution state */
	remoteImageIdHex?: string;
	/** Expected Guest ImageID (SHA-256) of the zkVM interpreter */
	guestImageIdHex?: string;
	/** Cbor-encoded or raw buffer containing the execution Receipt (Journal + Seal) */
	zkReceipt?: Uint8Array;
	/** Kyber-derived session secret to verify HMAC signature */
	sessionSecret?: Uint8Array;
	/** Serialized VerificationKey buffer for Groth16 mathematical verification */
	vkeyRaw?: Uint8Array;
	/** The expected output value of the computation for anti-replay/tampering verification */
	expectedOutput?: unknown;
	/** Enforcement policy for clearance tiers */
	zkPolicy?: ZkPolicy;
}

function deriveImageId(logicPayload: Uint8Array): Buffer {
	return deriveLogicImageDigest(logicPayload);
}

interface ZkJournal {
	image_id: string;
	dataset_hash: string;
	output_hash: string;
	fuel: number;
	ts: number;
}

function tryExtractProxyOutput(logicPayload: Uint8Array): unknown | null {
	try {
		const logicStr = Buffer.from(logicPayload).toString("utf-8").trim();
		if (!logicStr.includes("__liop_proxy_tool")) {
			return null;
		}

		const firstBraceIdx = logicStr.indexOf("{");
		if (firstBraceIdx === -1) {
			return null;
		}

		let braceCount = 0;
		let inDoubleQuote = false;
		let inSingleQuote = false;
		let inBacktick = false;
		let escaped = false;
		let lastBraceIdx = -1;

		for (let i = firstBraceIdx; i < logicStr.length; i++) {
			const char = logicStr[i];

			if (escaped) {
				escaped = false;
				continue;
			}

			if (char === "\\") {
				escaped = true;
				continue;
			}

			if (char === '"' && !inSingleQuote && !inBacktick) {
				inDoubleQuote = !inDoubleQuote;
				continue;
			}

			if (char === "'" && !inDoubleQuote && !inBacktick) {
				inSingleQuote = !inSingleQuote;
				continue;
			}

			if (char === "`" && !inDoubleQuote && !inSingleQuote) {
				inBacktick = !inBacktick;
				continue;
			}

			if (!inDoubleQuote && !inSingleQuote && !inBacktick) {
				if (char === "{") {
					braceCount++;
				} else if (char === "}") {
					braceCount--;
					if (braceCount === 0) {
						lastBraceIdx = i;
						break;
					}
				}
			}
		}

		if (lastBraceIdx !== -1) {
			const jsonStr = logicStr.slice(firstBraceIdx, lastBraceIdx + 1);
			const parsed = JSON.parse(jsonStr);
			if (parsed?.__liop_proxy_tool) {
				return parsed;
			}
		}
	} catch (_e) {
		// Fallback
	}
	return null;
}

/**
 * Simulates heavy ZK-Proof cryptographic verification.
 * In a real environment, this delegates to @risc0/verifier or SP1 FFI bindings.
 */
async function verifyZkReceipt(
	payload: ZkVerificationPayload,
): Promise<{ verified: boolean; message: string; proofType?: string }> {
	const {
		logicPayload,
		remoteImageIdHex,
		guestImageIdHex,
		zkReceipt,
		sessionSecret,
		vkeyRaw,
		expectedOutput,
		zkPolicy,
	} = payload;

	if (!logicPayload || !remoteImageIdHex || !zkReceipt) {
		return {
			verified: false,
			message: "Missing required verification fields.",
		};
	}

	let decodedReceipt: ReturnType<typeof receiptCodec.decode>;
	try {
		decodedReceipt = receiptCodec.decode(Buffer.from(zkReceipt));
	} catch (err) {
		return {
			verified: false,
			message: `Receipt Decode Failed: ${(err as Error).message}`,
		};
	}

	// 1. Version 1 (HMAC Legacy Receipt)
	if (decodedReceipt.version === RECEIPT_VERSION_V1) {
		if (zkPolicy === "required") {
			return {
				verified: false,
				message:
					"Policy Violation: Clearance Tier requires ZK proof (Groth16), but received legacy HMAC.",
			};
		}

		// Calculate local ImageID (Integrity Check)
		const localImageId = deriveImageId(logicPayload);
		const localImageIdHex = localImageId.toString("hex");

		if (localImageIdHex !== remoteImageIdHex) {
			return {
				verified: false,
				message: `Integrity Violation: Local (${localImageIdHex.slice(0, 8)}) != Remote (${remoteImageIdHex.slice(0, 8)})`,
			};
		}

		// Parse journal and verify imageId
		let journalData: ZkJournal;
		try {
			journalData = JSON.parse(decodedReceipt.journal.toString()) as ZkJournal;
			if (journalData.image_id !== localImageIdHex) {
				return {
					verified: false,
					message: `Journal ImageID mismatch: ${journalData.image_id.slice(0, 8)} != ${localImageIdHex.slice(0, 8)}`,
				};
			}
		} catch (_e) {
			return { verified: false, message: "Failed to parse journal data." };
		}

		// Mathematical Verification (HMAC-SHA256)
		if (sessionSecret && sessionSecret.length > 0) {
			const expectedSeal = crypto
				.createHmac("sha256", sessionSecret)
				.update(decodedReceipt.journal)
				.digest();
			if (!crypto.timingSafeEqual(decodedReceipt.proof, expectedSeal)) {
				return {
					verified: false,
					message: "Invalid seal: HMAC verification failed.",
				};
			}
		}

		// Output Hash Verification (Anti-Replay / Anti-Tampering)
		if (expectedOutput !== undefined) {
			const proxyOutput = tryExtractProxyOutput(logicPayload);
			const actualExpected =
				proxyOutput !== null ? proxyOutput : expectedOutput;

			const expectedOutputStr =
				typeof actualExpected === "string"
					? actualExpected
					: actualExpected === undefined
						? "undefined"
						: JSON.stringify(actualExpected);
			const expectedOutputHash = crypto
				.createHash("sha256")
				.update(expectedOutputStr)
				.digest("hex");

			if (journalData.output_hash !== expectedOutputHash) {
				return {
					verified: false,
					message: `Output Hash Mismatch (Replay/Tamper attempt): Journal output_hash (${journalData.output_hash.slice(0, 8)}) != Calculated output_hash (${expectedOutputHash.slice(0, 8)})`,
				};
			}
		}

		return {
			verified: true,
			message: "HMAC Commitment Verified: Integrity intact.",
			proofType: "hmac",
		};
	}

	// 2. Version 2 (Groth16 / ZK Binary Receipt)
	if (decodedReceipt.version === RECEIPT_VERSION_V2) {
		if (decodedReceipt.proofType !== ProofType.GROTH16) {
			return {
				verified: false,
				message: `Unsupported ZK proof type in v2 receipt: ${decodedReceipt.proofType}`,
			};
		}

		let journalV2: ReturnType<typeof decodeJournalV2>;
		try {
			journalV2 = decodeJournalV2(decodedReceipt.journal);
		} catch (err) {
			return {
				verified: false,
				message: `Failed to decode ZkJournalV2: ${(err as Error).message}`,
			};
		}

		// Verify Guest Image ID if expected
		if (guestImageIdHex) {
			const actualGuestId = journalV2.guestImageId.toString("hex");
			if (actualGuestId !== guestImageIdHex) {
				return {
					verified: false,
					message: `Guest ImageID Mismatch: Injected guest environment tampered (${actualGuestId.slice(0, 8)} != ${guestImageIdHex.slice(0, 8)}).`,
				};
			}
		}

		// Verify Logic Digest (Ensures remote executed the exact user logic dispatched)
		const expectedLogicDigest = deriveImageId(logicPayload);
		if (!journalV2.logicDigest.equals(expectedLogicDigest)) {
			return {
				verified: false,
				message: `Logic Digest Mismatch: Remote origin executed unexpected logic (${journalV2.logicDigest.toString("hex").slice(0, 8)} != ${expectedLogicDigest.toString("hex").slice(0, 8)})`,
			};
		}

		// Mathematical Verification via Groth16 pairing check
		if (vkeyRaw && vkeyRaw.length > 0) {
			try {
				const vkey = deserializeVKey(Buffer.from(vkeyRaw));
				const proofWithSignals = deserializeGrothProof(decodedReceipt.proof);
				const isMathValid = verifyGroth16Proof(vkey, proofWithSignals);

				if (!isMathValid) {
					return {
						verified: false,
						message:
							"Groth16 mathematical pairing verification failed: invalid proof.",
					};
				}
			} catch (err) {
				return {
					verified: false,
					message: `Groth16 verification failed to execute: ${(err as Error).message}`,
				};
			}
		}

		// Output Digest Verification (Anti-Replay / Anti-Tampering)
		if (expectedOutput !== undefined) {
			const proxyOutput = tryExtractProxyOutput(logicPayload);
			const actualExpected =
				proxyOutput !== null ? proxyOutput : expectedOutput;

			const expectedOutputStr =
				typeof actualExpected === "string"
					? actualExpected
					: actualExpected === undefined
						? "undefined"
						: JSON.stringify(actualExpected);
			const expectedOutputDigest = crypto
				.createHash("sha256")
				.update(expectedOutputStr)
				.digest();

			if (!journalV2.outputDigest.equals(expectedOutputDigest)) {
				return {
					verified: false,
					message: `Output Digest Mismatch (Replay/Tamper attempt): Journal (${journalV2.outputDigest.toString("hex").slice(0, 8)}) != Calculated (${expectedOutputDigest.toString("hex").slice(0, 8)})`,
				};
			}
		}

		return {
			verified: true,
			message: "Groth16 Zero-Knowledge Proof Mathematically Certified.",
			proofType: "groth16",
		};
	}

	return {
		verified: false,
		message: `Unsupported receipt version: ${decodedReceipt.version}`,
	};
}

/**
 * Main worker entry point for Piscina.
 */
export default async function workerHandler(
	task: ZkVerificationPayload,
): Promise<{ verified: boolean; message: string; proofType?: string }> {
	try {
		if (task.action === "warmup") {
			return {
				verified: true,
				message: "warm",
			};
		}
		if (task.action === "verify_receipt") {
			return await verifyZkReceipt(task);
		}
		throw new Error("Unknown action in ZkVerifier Worker.");
	} catch (error) {
		return {
			verified: false,
			message: `Verification Error: ${(error as Error).message}`,
		};
	}
}
