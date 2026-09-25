// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { ProofMode } from "../../../src/rpc/types.js";
import { ProofType, receiptCodec } from "../../../src/security/zk.js";
import processLogicExecution from "../../../src/workers/logic-execution.js";

describe("ZK-VM Clearance Tier Hardening & Prover Failure Resilience (P0 Invariant)", () => {
	const createPayload = (proofMode: ProofMode) => ({
		ciphertext: new Uint8Array(1088),
		secretKeyObj: new Uint8Array(2400),
		wasmBinary: Buffer.from("return { total: 42 };"),
		inputs: {},
		sessionTimestamp: Date.now(),
		isEncrypted: false,
		proofMode,
	});

	it("should strictly reject execution with an error when proofMode is PROOF_MODE_ZK_BLOCKING without native prover", async () => {
		const payload = createPayload(ProofMode.PROOF_MODE_ZK_BLOCKING);

		await expect(processLogicExecution(payload)).rejects.toThrow(
			/ZK PROOF GENERATION FAILED: Native Groth16 prover module unavailable for required policy/,
		);
	});

	it("should allow graceful degradation with simulated proof when proofMode is PROOF_MODE_ZK_OPTIMISTIC", async () => {
		const payload = createPayload(ProofMode.PROOF_MODE_ZK_OPTIMISTIC);

		const result = await processLogicExecution(payload);
		expect(result).toBeDefined();
		expect(result.output).toEqual({ total: 42 });
		expect(result.proof_type).toBe(ProofType.GROTH16);
		expect(result.zk_receipt).toBeDefined();

		const decoded = receiptCodec.decode(Buffer.from(result.zk_receipt!, "base64"));
		expect(decoded.version).toBe(2);
		expect(decoded.proofType).toBe(ProofType.GROTH16);
	});
});
