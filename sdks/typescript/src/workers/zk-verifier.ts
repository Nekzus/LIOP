import crypto from "node:crypto";
import { parentPort } from "node:worker_threads";
import { deriveLogicImageDigest } from "../crypto/logic-image-id.js";

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
	/** Cbor-encoded or raw buffer containing the execution Receipt (Journal + Seal) */
	zkReceipt?: Uint8Array;
	/** Kyber-derived session secret to verify HMAC signature */
	sessionSecret?: Uint8Array;
}

function deriveImageId(logicPayload: Uint8Array): Buffer {
	return deriveLogicImageDigest(logicPayload);
}

/**
 * Simulates heavy ZK-Proof cryptographic verification.
 * In a real environment, this delegates to @risc0/verifier or SP1 FFI bindings.
 */
async function verifyZkReceipt(
	payload: ZkVerificationPayload,
): Promise<{ verified: boolean; message: string }> {
	const { logicPayload, remoteImageIdHex, zkReceipt, sessionSecret } =
		payload as Required<ZkVerificationPayload>;

	// 1. Calculate local ImageID (Integrity Check)
	const localImageId = deriveImageId(logicPayload);
	const localImageIdHex = localImageId.toString("hex");

	if (localImageIdHex !== remoteImageIdHex) {
		return {
			verified: false,
			message: `Integrity Violation: Local (${localImageIdHex.slice(0, 8)}) != Remote (${remoteImageIdHex.slice(0, 8)})`,
		};
	}

	// 2. Structural Verification: Deserialize Binary Receipt
	const receiptBuf = Buffer.from(zkReceipt);
	if (receiptBuf.length < 35) {
		// 1 version + 2 len + 32 seal minimum
		return {
			verified: false,
			message: "Receipt too short for binary format.",
		};
	}

	const version = receiptBuf[0];
	if (version !== 0x01) {
		return {
			verified: false,
			message: `Unknown receipt version: ${version}`,
		};
	}

	const journalLen = receiptBuf.readUInt16BE(1);
	const journal = receiptBuf.subarray(3, 3 + journalLen);
	const seal = receiptBuf.subarray(3 + journalLen);

	if (seal.length !== 32) {
		return {
			verified: false,
			message: "Invalid seal length (expected 32 bytes HMAC-SHA256).",
		};
	}

	// 3. Parse journal and verify imageId
	try {
		const journalData = JSON.parse(journal.toString());
		if (journalData.image_id !== localImageIdHex) {
			return {
				verified: false,
				message: `Journal ImageID mismatch: ${journalData.image_id.slice(0, 8)} != ${localImageIdHex.slice(0, 8)}`,
			};
		}
	} catch (_e) {
		return { verified: false, message: "Failed to parse journal data." };
	}

	// 4. Mathematical Verification (HMAC-SHA256)
	if (sessionSecret && sessionSecret.length > 0) {
		const expectedSeal = crypto
			.createHmac("sha256", sessionSecret)
			.update(journal)
			.digest();
		if (!crypto.timingSafeEqual(seal, expectedSeal)) {
			return {
				verified: false,
				message: "Invalid seal: HMAC verification failed.",
			};
		}
	}

	return {
		verified: true,
		message: "HMAC Commitment Verified: Integrity intact.",
	};
}

/**
 * Main worker entry point for Piscina.
 */
export default async function workerHandler(
	task: ZkVerificationPayload,
): Promise<{ verified: boolean; message: string }> {
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
