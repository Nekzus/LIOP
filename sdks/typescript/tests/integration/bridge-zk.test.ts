// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { bn254 } from "micro-zk-proofs";
import { LiopMcpBridge } from "../../src/bridge/index.js";
import { LiopVerifier } from "../../src/crypto/verifier.js";
import {
	serializeGrothProof,
	serializeVKey,
} from "../../src/crypto/groth16-verifier.js";
import { deriveLogicImageDigest } from "../../src/crypto/logic-image-id.js";
import {
	ProofType,
	encodeJournalV2,
	receiptCodec,
} from "../../src/security/zk.js";

describe("LiopMcpBridge ZK Verification (Task 6)", () => {
	// Simple test circuit
	const testCircuit = {
		nVars: 3,
		nPubInputs: 1,
		nOutputs: 0,
		constraints: [[{ 1: 1n }, { 0: 1n }, { 1: 1n }]],
	};
	const setup = bn254.groth.setup(testCircuit);
	const circuitName = "bridge-test-circuit";
	LiopVerifier.registerVKey(circuitName, serializeVKey(setup.vkey));

	const testPayload = "return data.sum();";
	const logicDigest = deriveLogicImageDigest(Buffer.from(testPayload, "utf-8"));
	const guestImageId = crypto.randomBytes(32);
	const computationResult = 1200;
	const outputDigest = crypto
		.createHash("sha256")
		.update(JSON.stringify(computationResult))
		.digest();

	it("should verify Groth16 v2 receipt in MCP tools/call and stamp audit_status", async () => {
		const witness = [1n, 8n, 8n];
		const proofWithSignals = await bn254.groth.createProof(setup.pkey, witness);
		const proofBuffer = serializeGrothProof(proofWithSignals);

		const journalBuf = encodeJournalV2({
			guestImageId,
			logicDigest,
			datasetDigest: crypto.randomBytes(32),
			outputDigest,
			fuelConsumed: 1000n,
			executionTimestamp: BigInt(Date.now()),
		});

		const receiptV2 = receiptCodec.encodeV2(ProofType.GROTH16, journalBuf, proofBuffer);

		// Mock LiopServer that returns the tool result with ZK receipt
		const mockLiopServer = {
			constructor: { name: "LiopServer" },
			getTool: () => ({ name: "calculate_sum" }),
			callTool: async () => ({
				content: [
					{
						type: "text",
						text: JSON.stringify({
							computation_result: computationResult,
							image_id: logicDigest.toString("hex"),
							guest_image_id: guestImageId.toString("hex"),
							circuit_name: circuitName,
							zk_receipt: receiptV2.toString("base64"),
						}),
					},
				],
			}),
		};

		const bridge = new LiopMcpBridge(mockLiopServer as any);

		const response = (await bridge.handleJsonRpcRequest({
			jsonrpc: "2.0",
			id: 1,
			method: "tools/call",
			params: {
				name: "calculate_sum",
				arguments: {
					payload: testPayload,
				},
			},
		})) as any;

		expect(response.error).toBeUndefined();
		expect(response.result).toBeDefined();

		const contentText = response.result.content[0].text;
		const parsed = JSON.parse(contentText);
		expect(parsed.audit_status).toBe(
			"VERIFIED: Groth16 Zero-Knowledge Proof Certified by LiopMcpBridge",
		);
		expect(parsed.computation_result).toBe(computationResult);
	});

	it("should reject tampered Groth16 v2 receipt in MCP tools/call with Alert", async () => {
		const witness = [1n, 8n, 8n];
		const proofWithSignals = await bn254.groth.createProof(setup.pkey, witness);
		const proofBuffer = serializeGrothProof(proofWithSignals);

		// Tamper the logic digest in journal
		const tamperedLogicDigest = crypto.randomBytes(32);
		const journalBuf = encodeJournalV2({
			guestImageId,
			logicDigest: tamperedLogicDigest,
			datasetDigest: crypto.randomBytes(32),
			outputDigest,
			fuelConsumed: 1000n,
			executionTimestamp: BigInt(Date.now()),
		});

		const receiptV2 = receiptCodec.encodeV2(ProofType.GROTH16, journalBuf, proofBuffer);

		const mockLiopServer = {
			constructor: { name: "LiopServer" },
			getTool: () => ({ name: "calculate_sum" }),
			callTool: async () => ({
				content: [
					{
						type: "text",
						text: JSON.stringify({
							computation_result: computationResult,
							image_id: logicDigest.toString("hex"),
							guest_image_id: guestImageId.toString("hex"),
							circuit_name: circuitName,
							zk_receipt: receiptV2.toString("base64"),
						}),
					},
				],
			}),
		};

		const bridge = new LiopMcpBridge(mockLiopServer as any);

		const response = (await bridge.handleJsonRpcRequest({
			jsonrpc: "2.0",
			id: 2,
			method: "tools/call",
			params: {
				name: "calculate_sum",
				arguments: {
					payload: testPayload,
				},
			},
		})) as any;

		expect(response.result.isError).toBe(true);
		expect(response.result.content[0].text).toContain("ALERT [LIOP ZERO-TRUST SHIELD]");
	});
});
