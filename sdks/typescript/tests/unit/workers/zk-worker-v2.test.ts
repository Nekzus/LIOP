// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { bn254, type CircuitInfo } from "micro-zk-proofs";
import workerHandler, { type ZkVerificationPayload } from "../../../src/workers/zk-verifier.js";
import {
	ProofType,
	encodeJournalV2,
	receiptCodec,
	type ZkJournalV2,
} from "../../../src/security/zk.js";
import {
	serializeGrothProof,
	serializeVKey,
} from "../../../src/crypto/groth16-verifier.js";
import { deriveLogicImageDigest } from "../../../src/crypto/logic-image-id.js";

describe("ZK Verifier Worker V2 Routing (Task 4)", () => {
	const mockLogic = Buffer.from("return data.filter(x => x > 10);");
	const logicDigest = deriveLogicImageDigest(mockLogic);
	const dummyGuestImageId = crypto.randomBytes(32);
	const expectedOutput = [{ val: 42 }];
	const outputDigest = crypto
		.createHash("sha256")
		.update(JSON.stringify(expectedOutput))
		.digest();

	// Test circuit for Groth16
	const testCircuit: CircuitInfo = {
		nVars: 3,
		nPubInputs: 1,
		nOutputs: 0,
		constraints: [[{ 1: 1n }, { 0: 1n }, { 1: 1n }]],
	};
	const setup = bn254.groth.setup(testCircuit);

	it("should route and verify Groth16 v2 receipt in worker", async () => {
		const witness = [1n, 5n, 5n];
		const proofWithSignals = await bn254.groth.createProof(setup.pkey, witness);
		const proofBuffer = serializeGrothProof(proofWithSignals);
		const vkeyBuffer = serializeVKey(setup.vkey);

		const journalFields: ZkJournalV2 = {
			guestImageId: dummyGuestImageId,
			logicDigest: logicDigest,
			datasetDigest: crypto.randomBytes(32),
			outputDigest: outputDigest,
			fuelConsumed: 50000n,
			executionTimestamp: BigInt(Date.now()),
		};

		const journalBuf = encodeJournalV2(journalFields);
		const receiptBuf = receiptCodec.encodeV2(ProofType.GROTH16, journalBuf, proofBuffer);

		const task: ZkVerificationPayload = {
			action: "verify_receipt",
			logicPayload: mockLogic,
			remoteImageIdHex: logicDigest.toString("hex"),
			guestImageIdHex: dummyGuestImageId.toString("hex"),
			vkeyRaw: vkeyBuffer,
			zkReceipt: receiptBuf,
			expectedOutput: expectedOutput,
		};

		const result = await workerHandler(task);
		expect(result.verified).toBe(true);
		expect(result.message).toContain("Groth16 Zero-Knowledge Proof Mathematically Certified");
	});

	it("should reject Groth16 v2 receipt if logic digest mismatches (anti-tamper)", async () => {
		const witness = [1n, 5n, 5n];
		const proofWithSignals = await bn254.groth.createProof(setup.pkey, witness);
		const proofBuffer = serializeGrothProof(proofWithSignals);
		const vkeyBuffer = serializeVKey(setup.vkey);

		const tamperedLogicDigest = crypto.randomBytes(32);
		const journalFields: ZkJournalV2 = {
			guestImageId: dummyGuestImageId,
			logicDigest: tamperedLogicDigest, // Mismatch
			datasetDigest: crypto.randomBytes(32),
			outputDigest: outputDigest,
			fuelConsumed: 50000n,
			executionTimestamp: BigInt(Date.now()),
		};

		const journalBuf = encodeJournalV2(journalFields);
		const receiptBuf = receiptCodec.encodeV2(ProofType.GROTH16, journalBuf, proofBuffer);

		const task: ZkVerificationPayload = {
			action: "verify_receipt",
			logicPayload: mockLogic,
			remoteImageIdHex: logicDigest.toString("hex"),
			guestImageIdHex: dummyGuestImageId.toString("hex"),
			vkeyRaw: vkeyBuffer,
			zkReceipt: receiptBuf,
			expectedOutput: expectedOutput,
		};

		const result = await workerHandler(task);
		expect(result.verified).toBe(false);
		expect(result.message).toContain("Logic Digest Mismatch");
	});

	it("should reject legacy v1 receipt when zkPolicy is required", async () => {
		const sessionSecret = crypto.randomBytes(32);
		const legacyJournal = Buffer.from(
			JSON.stringify({
				image_id: logicDigest.toString("hex"),
				dataset_hash: "hash",
				output_hash: outputDigest.toString("hex"),
				fuel: 100,
				ts: Date.now(),
			}),
		);
		const journalLen = Buffer.alloc(2);
		journalLen.writeUInt16BE(legacyJournal.length);
		const seal = crypto.createHmac("sha256", sessionSecret).update(legacyJournal).digest();
		const legacyReceipt = Buffer.concat([Buffer.from([0x01]), journalLen, legacyJournal, seal]);

		const task: ZkVerificationPayload = {
			action: "verify_receipt",
			logicPayload: mockLogic,
			remoteImageIdHex: logicDigest.toString("hex"),
			zkReceipt: legacyReceipt,
			sessionSecret: sessionSecret,
			zkPolicy: "required",
			expectedOutput: expectedOutput,
		};

		const result = await workerHandler(task);
		expect(result.verified).toBe(false);
		expect(result.message).toContain("Policy Violation");
	});
});
