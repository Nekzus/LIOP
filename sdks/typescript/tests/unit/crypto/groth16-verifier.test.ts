// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
	VERIFICATION_LATENCY_BUDGET_MS,
	deserializeGrothProof,
	deserializeVKey,
	serializeGrothProof,
	serializeVKey,
	verifyGroth16Proof,
} from "../../../src/crypto/groth16-verifier.js";
import { bn254, type CircuitInfo } from "micro-zk-proofs";

describe("Groth16 Verifier with micro-zk-proofs (Task 3)", () => {
	// Simple multiplier test circuit: in1 * in2 = out
	const testCircuit: CircuitInfo = {
		nVars: 3,
		nPubInputs: 1, // in1 is public
		nOutputs: 0,
		// in1 * 1 = in1
		constraints: [[{ 1: 1n }, { 0: 1n }, { 1: 1n }]],
	};

	const setup = bn254.groth.setup(testCircuit);

	it("should verify valid Groth16 proof under latency budget", async () => {
		const witness = [1n, 7n, 7n];
		const proofWithSignals = await bn254.groth.createProof(setup.pkey, witness);

		// Warmup JIT for noble-curves Miller loop
		verifyGroth16Proof(setup.vkey, proofWithSignals);

		const start = performance.now();
		const isValid = verifyGroth16Proof(setup.vkey, proofWithSignals);
		const elapsed = performance.now() - start;

		expect(isValid).toBe(true);
		expect(elapsed).toBeLessThan(VERIFICATION_LATENCY_BUDGET_MS);
	});

	it("should return false for proof with incorrect public signals", async () => {
		const witness = [1n, 7n, 7n];
		const proofWithSignals = await bn254.groth.createProof(setup.pkey, witness);

		// Tamper public signals
		const tamperedSignals = {
			...proofWithSignals,
			publicSignals: [999n],
		};

		const isValid = verifyGroth16Proof(setup.vkey, tamperedSignals);
		expect(isValid).toBe(false);
	});

	it("should safely return false without throwing unhandled exceptions on invalid curve points", async () => {
		const witness = [1n, 7n, 7n];
		const proofWithSignals = await bn254.groth.createProof(setup.pkey, witness);

		// Tamper point coordinates to create an invalid curve point
		const invalidCurveProof = {
			...proofWithSignals,
			proof: {
				...proofWithSignals.proof,
				pi_a: [proofWithSignals.proof.pi_a[0] + 1n, proofWithSignals.proof.pi_a[1], proofWithSignals.proof.pi_a[2]] as typeof proofWithSignals.proof.pi_a,
			},
		};

		const isValid = verifyGroth16Proof(setup.vkey, invalidCurveProof);
		expect(isValid).toBe(false);
	});

	it("should serialize and deserialize VerificationKey and ProofWithSignals", async () => {
		const witness = [1n, 12n, 12n];
		const proofWithSignals = await bn254.groth.createProof(setup.pkey, witness);

		const vkeyBuffer = serializeVKey(setup.vkey);
		const proofBuffer = serializeGrothProof(proofWithSignals);

		expect(Buffer.isBuffer(vkeyBuffer)).toBe(true);
		expect(Buffer.isBuffer(proofBuffer)).toBe(true);

		const restoredVKey = deserializeVKey(vkeyBuffer);
		const restoredProof = deserializeGrothProof(proofBuffer);

		const isValid = verifyGroth16Proof(restoredVKey, restoredProof);
		expect(isValid).toBe(true);
	});
});
