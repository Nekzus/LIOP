// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { bn254 } from "micro-zk-proofs";
import { LiopVerifier } from "../../../src/crypto/verifier.js";
import {
	serializeGrothProof,
	serializeVKey,
} from "../../../src/crypto/groth16-verifier.js";
import {
	ProofType,
	encodeJournalV2,
	receiptCodec,
} from "../../../src/security/zk.js";

describe("Gateway Proxy ZK Verification (Task 8)", () => {
	const verifier = new LiopVerifier();

	// Test circuit setup
	const testCircuit = {
		nVars: 3,
		nPubInputs: 1,
		nOutputs: 0,
		constraints: [[{ 1: 1n }, { 0: 1n }, { 1: 1n }]],
	};
	const setup = bn254.groth.setup(testCircuit);
	const circuitName = "gateway-proxy-circuit";
	LiopVerifier.registerVKey(circuitName, serializeVKey(setup.vkey));

	const proxyLogic = "return data.map(x => x * 2);";
	const logicDigest = verifier.deriveImageId(Buffer.from(proxyLogic, "utf-8"));
	const guestImageId = crypto.randomBytes(32);
	const resultBody = JSON.stringify({ items: [2, 4, 6] });
	const outputDigest = crypto.createHash("sha256").update(resultBody).digest();

	it("should verify v2 Groth16 receipt through proxy router options", async () => {
		const witness = [1n, 4n, 4n];
		const proofWithSignals = await bn254.groth.createProof(setup.pkey, witness);
		const proofBuf = serializeGrothProof(proofWithSignals);

		const journalBuf = encodeJournalV2({
			guestImageId,
			logicDigest,
			datasetDigest: crypto.randomBytes(32),
			outputDigest,
			fuelConsumed: 5000n,
			executionTimestamp: BigInt(Date.now()),
		});

		const receiptV2 = receiptCodec.encodeV2(ProofType.GROTH16, journalBuf, proofBuf);

		const isValid = await verifier.verifyZkReceipt(
			Buffer.from(proxyLogic, "utf-8"),
			logicDigest.toString("hex"),
			receiptV2,
			{
				circuitName,
				guestImageIdHex: guestImageId.toString("hex"),
				expectedOutput: resultBody,
				zkPolicy: "required",
			},
		);

		expect(isValid).toBe(true);
	});

	it("should reject tampered output in v2 Groth16 receipt (tamper/replay protection)", async () => {
		const witness = [1n, 4n, 4n];
		const proofWithSignals = await bn254.groth.createProof(setup.pkey, witness);
		const proofBuf = serializeGrothProof(proofWithSignals);

		const journalBuf = encodeJournalV2({
			guestImageId,
			logicDigest,
			datasetDigest: crypto.randomBytes(32),
			outputDigest,
			fuelConsumed: 5000n,
			executionTimestamp: BigInt(Date.now()),
		});

		const receiptV2 = receiptCodec.encodeV2(ProofType.GROTH16, journalBuf, proofBuf);

		const tamperedResultBody = JSON.stringify({ items: [999] });

		const isValid = await verifier.verifyZkReceipt(
			Buffer.from(proxyLogic, "utf-8"),
			logicDigest.toString("hex"),
			receiptV2,
			{
				circuitName,
				guestImageIdHex: guestImageId.toString("hex"),
				expectedOutput: tamperedResultBody, // Mismatch with outputDigest
				zkPolicy: "required",
			},
		);

		expect(isValid).toBe(false);
	});
});
