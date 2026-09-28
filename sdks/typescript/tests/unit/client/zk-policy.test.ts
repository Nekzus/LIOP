// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { bn254 } from "micro-zk-proofs";
import { LiopClient } from "../../../src/client/index.js";
import { LiopVerifier } from "../../../src/crypto/verifier.js";
import {
	serializeGrothProof,
	serializeVKey,
} from "../../../src/crypto/groth16-verifier.js";
import { Kyber768Wrapper } from "../../../src/rpc/crypto/kyber.js";
import {
	ProofType,
	encodeJournalV2,
	receiptCodec,
} from "../../../src/security/zk.js";

describe("Client Stream Verification & ZK Policy (Task 7)", () => {
	// Setup a small Groth16 circuit for testing
	const testCircuit = {
		nVars: 3,
		nPubInputs: 1,
		nOutputs: 0,
		constraints: [[{ 1: 1n }, { 0: 1n }, { 1: 1n }]],
	};
	const setup = bn254.groth.setup(testCircuit);
	const circuitName = "client-zk-test-circuit";
	LiopVerifier.registerVKey(circuitName, serializeVKey(setup.vkey));

	const dummySecret = crypto.randomBytes(32);

	async function createMockClientWithStream(streamEmitter: EventEmitter) {
		const client = new LiopClient();
		const { publicKey: clientPublicKey } = await Kyber768Wrapper.generateKeyPair();

		// Mock meshNode
		(client as any).meshNode = {
			getPeerId: () => "mock-peer-id",
			sign: async (payload: Buffer) => payload,
		};

		// Mock RPC client
		const mockRpc = {
			negotiateIntent: async () => ({
				accepted: true,
				kyber_public_key: clientPublicKey,
				session_token: "mock-session-token",
			}),
			executeLogic: () => streamEmitter,
		};

		(client as any).rpcClients.set("static", mockRpc);
		return client;
	}

	it("should verify Groth16 v2 receipt and attach zkVerified and zkProofType", async () => {
		const streamEmitter = new EventEmitter();
		const client = await createMockClientWithStream(streamEmitter);

		const testPayload = Buffer.from("return 42;");
		const logicDigest = (client as any).verifier.deriveImageId(testPayload);
		const guestImageId = crypto.randomBytes(32);
		const semanticEvidence = "42";
		const outputDigest = crypto
			.createHash("sha256")
			.update(semanticEvidence)
			.digest();

		const witness = [1n, 6n, 6n];
		const proofWithSignals = await bn254.groth.createProof(setup.pkey, witness);
		const proofBuf = serializeGrothProof(proofWithSignals);

		const journalBuf = encodeJournalV2({
			guestImageId,
			logicDigest,
			datasetDigest: crypto.randomBytes(32),
			outputDigest,
			fuelConsumed: 2000n,
			executionTimestamp: BigInt(Date.now()),
		});

		const receiptV2 = receiptCodec.encodeV2(ProofType.GROTH16, journalBuf, proofBuf);

		// Execute callTool in background
		const callPromise = client.callTool(
			{ name: "test_tool", arguments: {} },
			testPayload,
			{ circuitName, zkPolicy: "required" },
		);

		// Emit response on stream
		setTimeout(() => {
			streamEmitter.emit("data", {
				semantic_evidence: semanticEvidence,
				cryptographic_proof: logicDigest,
				zk_receipt: receiptV2,
				is_error: false,
			});
		}, 10);

		const result = await callPromise;
		expect(result.isError).toBe(false);
		expect(result.zkVerified).toBe(true);
		expect(result.zkProofType).toBe(ProofType.GROTH16);
		expect(result.content[0].text).toBe(semanticEvidence);
	});

	it("should abort with PROTOCOL INTEGRITY VIOLATION when v1 receipt received under zkPolicy required", async () => {
		const streamEmitter = new EventEmitter();
		const client = await createMockClientWithStream(streamEmitter);

		const testPayload = Buffer.from("return 42;");
		const logicDigest = (client as any).verifier.deriveImageId(testPayload);
		const semanticEvidence = "42";

		// Build legacy v1 receipt
		const legacyJournal = Buffer.from(
			JSON.stringify({
				image_id: logicDigest.toString("hex"),
				dataset_hash: "hash",
				output_hash: crypto.createHash("sha256").update(semanticEvidence).digest("hex"),
				fuel: 100,
				ts: Date.now(),
			}),
		);
		const journalLen = Buffer.alloc(2);
		journalLen.writeUInt16BE(legacyJournal.length);
		const seal = crypto.createHmac("sha256", dummySecret).update(legacyJournal).digest();
		const legacyReceipt = Buffer.concat([Buffer.from([0x01]), journalLen, legacyJournal, seal]);

		const callPromise = client.callTool(
			{ name: "test_tool", arguments: {} },
			testPayload,
			{ zkPolicy: "required" }, // Requires ZK proof, but receives legacy HMAC
		);

		setTimeout(() => {
			streamEmitter.emit("data", {
				semantic_evidence: semanticEvidence,
				cryptographic_proof: logicDigest,
				zk_receipt: legacyReceipt,
				is_error: false,
			});
		}, 10);

		await expect(callPromise).rejects.toThrow(
			"PROTOCOL INTEGRITY VIOLATION: ZK-Receipt verification failed.",
		);
	});
});
