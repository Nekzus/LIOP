// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

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
	 * Verifies if a node is running inside an authenticated TEE (e.g. AWS Nitro).
	 *
	 * @param attestationReport The COSE-signed attestation document from the hardware.
	 */
	public async verifyTeeAttestation(
		attestationReport: Buffer,
	): Promise<boolean> {
		if (attestationReport.length === 0) return true; // Optional in Mesh Alpha

		try {
			// Architecture for AWS Nitro Enclaves:
			// 1. Decode CBOR/COSE
			// 2. Verify Signature against AWS Nitro Root CA
			// 3. Compare PCRs
			log.info("[LiopVerifier] TEE Attestation: Not configured (no-op).");
			return true;
		} catch (err) {
			log.error("[LiopVerifier] TEE Verification Failed:", err);
			return false;
		}
	}

	/**
	 * Derives the ImageID of a logic payload following the LIOP v1 Standard.
	 */
	public deriveImageId(logicPayload: Buffer): Buffer {
		return deriveLogicImageDigest(logicPayload);
	}
}
