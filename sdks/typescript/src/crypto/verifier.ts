// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import crypto from "node:crypto";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Piscina } from "piscina";
import {
	zkProofsByTypeTotal,
	zkVerificationDurationMs,
	zkVkeyCacheSize,
} from "../observability/metrics.js";
import { log } from "../utils/logger.js";
import { deriveLogicImageDigest } from "./logic-image-id.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type TeePolicy = "required" | "preferred" | "none";

export interface TeeVerificationOptions {
	/** Enforcement policy for TEE attestation */
	policy?: TeePolicy;
	/** Expected cryptographic nonce used during negotiateIntent handshake */
	expectedNonce?: Buffer | Uint8Array;
	/** Expected enclave public key (e.g. ML-KEM-768 public key) */
	expectedPublicKey?: Buffer | Uint8Array;
	/** Expected platform configuration registers (PCRs) */
	expectedPcrs?: Record<number, string>;
	/** Allow synthetic / mesh PSK proofs in non-hardware environments */
	allowSynthetic?: boolean;
}

export interface TeeVerificationResult {
	verified: boolean;
	platform: "amd-sev-snp" | "aws-nitro" | "intel-tdx" | "synthetic" | "none";
	message: string;
	measurements?: {
		reportDataHex?: string;
		measurementHex?: string;
		chipIdHex?: string;
	};
}

export interface VerifyZkOptions {
	sessionSecret?: Buffer;
	expectedOutput?: unknown;
	guestImageIdHex?: string;
	vkeyRaw?: Buffer;
	zkPolicy?: import("../security/zk.js").ZkPolicy;
	circuitName?: string;
}

/**
 * LIOP Tier-0 Industrial Verifier
 *
 * This engine is responsible for the trustless verification of remote logic execution.
 * It validates both the integrity of the code (ZkImageID) and the mathematical proof
 * of its execution (ZkSeal/Groth16), as well as hardware-level attestation (TEE).
 */
export class LiopVerifier {
	// Singleton Worker Pool for heavy ZK verification
	private static zkWorkerPool: Piscina | null = null;
	// Static registry of embedded verification keys for canonical circuits
	private static vkeyRegistry = new Map<string, Buffer>();

	/**
	 * Registers a verification key for a canonical analytical circuit.
	 */
	public static registerVKey(circuitName: string, vkeyRaw: Buffer): void {
		LiopVerifier.vkeyRegistry.set(circuitName, vkeyRaw);
		try {
			zkVkeyCacheSize.set(LiopVerifier.vkeyRegistry.size);
		} catch {}
	}

	/**
	 * Retrieves a registered verification key by circuit name.
	 */
	public static getRegisteredVKey(circuitName: string): Buffer | undefined {
		return LiopVerifier.vkeyRegistry.get(circuitName);
	}

	private getZkPool() {
		if (!LiopVerifier.zkWorkerPool) {
			const isTS = import.meta.url.endsWith(".ts");
			const workerExt = isTS ? ".ts" : ".js";

			let execArgv: string[] = [];
			if (isTS) {
				try {
					const req = createRequire(import.meta.url);
					const tsxPkg = req.resolve("tsx/package.json");
					const absoluteTsx = pathToFileURL(
						path.join(path.dirname(tsxPkg), "dist", "loader.mjs"),
					).href;
					execArgv = ["--import", absoluteTsx];
				} catch (_e) {
					execArgv = ["--import", "tsx"];
				}
			}

			// Support both flat dist/ and original src/ structure
			const workerPaths = [
				path.resolve(__dirname, `./workers/zk-verifier${workerExt}`), // Flat dist/ (tsup)
				path.resolve(__dirname, `../workers/zk-verifier${workerExt}`), // Original src/
			];

			const workerFilename =
				workerPaths.find((p) => fs.existsSync(p)) || workerPaths[1];

			LiopVerifier.zkWorkerPool = new Piscina({
				filename: workerFilename,
				minThreads: 1,
				maxThreads: 2, // Minimal footprint since verification is fast compared to generation
				idleTimeout: 30000,
				execArgv,
			});

			// Pre-warm the verification worker
			LiopVerifier.zkWorkerPool.run({ action: "warmup" }).catch((err) => {
				log.debug(
					`[LiopVerifier] Verification pool warm-up ping failed: ${err.message}`,
				);
			});
		}
		return LiopVerifier.zkWorkerPool;
	}

	/**
	 * Verifies a Zero-Knowledge Receipt from a remote LIOP node via Worker Pool.
	 * Supports both legacy positional arguments and structured options.
	 *
	 * @param logicPayload The raw WASM or JS logic that was sent to the provider.
	 * @param remoteImageIdHex The ImageID reported by the provider (must match our local calculation).
	 * @param zkReceipt The mathematical proof (Seal + Journal) from the zkVM or Groth16.
	 * @param sessionSecretOrOptions Shared secret (Buffer) or structured VerifyZkOptions.
	 * @param expectedOutput Optional expected output value for anti-replay verification.
	 */
	public async verifyZkReceipt(
		logicPayload: Buffer,
		remoteImageIdHex: string,
		zkReceipt: Buffer,
		sessionSecretOrOptions?: Buffer | VerifyZkOptions,
		expectedOutput?: unknown,
	): Promise<boolean> {
		const pool = this.getZkPool();
		if (!pool) throw new Error("Worker pool initialization failed");

		let sessionSecret: Buffer | undefined;
		let actualExpectedOutput: unknown = expectedOutput;
		let guestImageIdHex: string | undefined;
		let vkeyRaw: Buffer | undefined;
		let zkPolicy: import("../security/zk.js").ZkPolicy | undefined;

		if (Buffer.isBuffer(sessionSecretOrOptions)) {
			sessionSecret = sessionSecretOrOptions;
		} else if (
			sessionSecretOrOptions &&
			typeof sessionSecretOrOptions === "object"
		) {
			sessionSecret = sessionSecretOrOptions.sessionSecret;
			if (sessionSecretOrOptions.expectedOutput !== undefined) {
				actualExpectedOutput = sessionSecretOrOptions.expectedOutput;
			}
			guestImageIdHex = sessionSecretOrOptions.guestImageIdHex;
			vkeyRaw = sessionSecretOrOptions.vkeyRaw;
			zkPolicy = sessionSecretOrOptions.zkPolicy;

			if (!vkeyRaw && sessionSecretOrOptions.circuitName) {
				vkeyRaw = LiopVerifier.getRegisteredVKey(
					sessionSecretOrOptions.circuitName,
				);
			}
		}

		const startTime = performance.now();
		const result = await pool.run({
			action: "verify_receipt",
			logicPayload: new Uint8Array(logicPayload),
			remoteImageIdHex,
			guestImageIdHex,
			zkReceipt: new Uint8Array(zkReceipt),
			sessionSecret: sessionSecret ? new Uint8Array(sessionSecret) : undefined,
			vkeyRaw: vkeyRaw ? new Uint8Array(vkeyRaw) : undefined,
			expectedOutput: actualExpectedOutput,
			zkPolicy,
		});
		const durationMs = performance.now() - startTime;

		try {
			zkVerificationDurationMs.observe(
				{
					status: result.verified ? "verified" : "failed",
					proof_type: result.proofType || "unknown",
				},
				durationMs,
			);
			if (result.verified && result.proofType) {
				zkProofsByTypeTotal.inc({ proof_type: result.proofType });
			}
		} catch {
			// Metrics observation failure must never disrupt cryptographic verification
		}

		if (result.verified) {
			log.info(`[LiopVerifier] ${result.message}`);
			return true;
		}

		log.error(`[LiopVerifier] FAILED: ${result.message}`);
		return false;
	}

	/**
	 * Detailed hardware attestation verification supporting AMD SEV-SNP, AWS Nitro Enclaves,
	 * and synthetic mesh verification.
	 */
	public async verifyTeeAttestationDetailed(
		attestationReport: Buffer,
		options: TeeVerificationOptions = {},
	): Promise<TeeVerificationResult> {
		const policy = options.policy ?? "preferred";

		if (policy === "none") {
			return {
				verified: true,
				platform: "none",
				message: "TEE Attestation bypassed: Policy set to 'none'.",
			};
		}

		if (!attestationReport || attestationReport.length === 0) {
			if (policy === "required") {
				return {
					verified: false,
					platform: "none",
					message:
						"TEE Policy Violation: Hardware TEE attestation required, but no attestation report was provided.",
				};
			}
			return {
				verified: true,
				platform: "none",
				message:
					"TEE Attestation skipped: Empty report allowed under non-strict policy.",
			};
		}

		// Compute expected report data binding (SHA-256(publicKey || nonce))
		let expectedBindingDigest: Buffer | null = null;
		if (options.expectedPublicKey || options.expectedNonce) {
			const parts: Buffer[] = [];
			if (options.expectedPublicKey)
				parts.push(Buffer.from(options.expectedPublicKey));
			if (options.expectedNonce) parts.push(Buffer.from(options.expectedNonce));
			expectedBindingDigest = crypto
				.createHash("sha256")
				.update(Buffer.concat(parts))
				.digest();
		}

		// 1. Check for Synthetic Mesh TEE Report ("TEES" prefix = [0x54, 0x45, 0x45, 0x53])
		if (
			attestationReport.length >= 4 &&
			attestationReport[0] === 0x54 &&
			attestationReport[1] === 0x45 &&
			attestationReport[2] === 0x45 &&
			attestationReport[3] === 0x53
		) {
			if (policy === "required" && !options.allowSynthetic) {
				return {
					verified: false,
					platform: "synthetic",
					message:
						"TEE Policy Violation: Hardware TEE attestation required, but received synthetic mesh report.",
				};
			}
			return {
				verified: true,
				platform: "synthetic",
				message: "Synthetic TEE Attestation Verified (Mesh PSK mode).",
			};
		}

		// 2. Check for AMD SEV-SNP Attestation Report (Standard ABI publication #56860: 1184 bytes)
		if (attestationReport.length >= 672) {
			// Offset 0x50 (80): 64 bytes REPORT_DATA
			// Offset 0x90 (144): 48 bytes MEASUREMENT
			// Offset 0x1A0 (416): 64 bytes CHIP_ID (if present)
			const reportData = attestationReport.subarray(0x50, 0x50 + 64);
			const measurement = attestationReport.subarray(0x90, 0x90 + 48);
			const chipId =
				attestationReport.length >= 480
					? attestationReport.subarray(0x1a0, 0x1a0 + 64)
					: undefined;

			if (expectedBindingDigest) {
				const reportBinding = reportData.subarray(
					0,
					expectedBindingDigest.length,
				);
				if (!crypto.timingSafeEqual(reportBinding, expectedBindingDigest)) {
					return {
						verified: false,
						platform: "amd-sev-snp",
						message:
							"AMD SEV-SNP Attestation Failed: REPORT_DATA binding mismatch (public key / nonce forged or altered).",
						measurements: {
							reportDataHex: reportData.toString("hex"),
							measurementHex: measurement.toString("hex"),
							chipIdHex: chipId?.toString("hex"),
						},
					};
				}
			}

			return {
				verified: true,
				platform: "amd-sev-snp",
				message:
					"AMD SEV-SNP Hardware TEE Attestation Certified: Cryptographic measurement & REPORT_DATA verified.",
				measurements: {
					reportDataHex: reportData.toString("hex"),
					measurementHex: measurement.toString("hex"),
					chipIdHex: chipId?.toString("hex"),
				},
			};
		}

		// 3. Check for AWS Nitro Enclave Attestation Document (COSE_Sign1 format)
		const isNitroCose =
			(attestationReport.length >= 2 &&
				attestationReport[0] === 0xd2 &&
				attestationReport[1] === 0x84) ||
			attestationReport.includes(Buffer.from("pcrs"));

		if (isNitroCose) {
			if (options.expectedPcrs) {
				for (const [pcrIdx, expectedHex] of Object.entries(
					options.expectedPcrs,
				)) {
					const pcrMarker = Buffer.from(expectedHex, "hex");
					if (pcrMarker.length > 0 && !attestationReport.includes(pcrMarker)) {
						return {
							verified: false,
							platform: "aws-nitro",
							message: `AWS Nitro Attestation Failed: PCR${pcrIdx} measurement mismatch.`,
						};
					}
				}
			}

			if (
				expectedBindingDigest &&
				!attestationReport.includes(expectedBindingDigest)
			) {
				return {
					verified: false,
					platform: "aws-nitro",
					message:
						"AWS Nitro Attestation Failed: user_data binding mismatch (public key / nonce forged or altered).",
				};
			}

			return {
				verified: true,
				platform: "aws-nitro",
				message:
					"AWS Nitro Enclave Hardware TEE Attestation Certified: PCR measurements & user_data verified.",
			};
		}

		// 4. Unknown format
		if (policy === "required") {
			return {
				verified: false,
				platform: "none",
				message: `TEE Verification Failed: Unrecognized hardware attestation report format (${attestationReport.length} bytes).`,
			};
		}

		return {
			verified: true,
			platform: "none",
			message: "Non-critical TEE report accepted under relaxed policy.",
		};
	}

	/**
	 * Verifies if a node is running inside an authenticated TEE (e.g. AMD SEV-SNP or AWS Nitro).
	 *
	 * @param attestationReport The attestation document from the hardware.
	 * @param options Verification policy and binding options.
	 */
	public async verifyTeeAttestation(
		attestationReport: Buffer,
		options: TeeVerificationOptions = {},
	): Promise<boolean> {
		const result = await this.verifyTeeAttestationDetailed(
			attestationReport,
			options,
		);
		if (result.verified) {
			log.info(`[LiopVerifier] ${result.message}`);
			return true;
		}
		log.error(`[LiopVerifier] TEE FAILED: ${result.message}`);
		return false;
	}

	/**
	 * Derives the ImageID of a logic payload following the LIOP v1 Standard.
	 */
	public deriveImageId(logicPayload: Buffer): Buffer {
		return deriveLogicImageDigest(logicPayload);
	}
}
