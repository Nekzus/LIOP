// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { deriveLogicImageDigest } from "../../../src/crypto/logic-image-id.js";
import { Dilithium65Wrapper } from "../../../src/rpc/crypto/dilithium.js";
import {
	ProofType,
	RECEIPT_VERSION_V2,
	encodeJournalV2,
	receiptCodec,
} from "../../../src/security/zk.js";
import workerHandler from "../../../src/workers/zk-verifier.js";

describe("Post-Quantum Hybrid Receipts (FIPS 204 ML-DSA-65 + Groth16 / Brecha 2)", () => {
	const keypair = Dilithium65Wrapper.generateKeyPair();
	const guestImageId = crypto.randomBytes(32);
	const logicSource = "return { success: true };";
	const logicDigest = deriveLogicImageDigest(Buffer.from(logicSource));
	const datasetDigest = crypto.randomBytes(32);
	const expectedOutput = JSON.stringify({ success: true });
	const outputDigest = crypto
		.createHash("sha256")
		.update(expectedOutput)
		.digest();

	const journalBuf = encodeJournalV2({
		guestImageId,
		logicDigest,
		datasetDigest,
		outputDigest,
		fuelConsumed: 300n,
		executionTimestamp: BigInt(Date.now()),
	});

	const dummyProof = Buffer.alloc(128, 0x42);

	it("should encode and decode a v2.1 Hybrid Receipt with exact FIPS 204 dimensions", () => {
		const messageToSign = crypto
			.createHash("sha256")
			.update(Buffer.concat([journalBuf, dummyProof]))
			.digest();

		const signature = Dilithium65Wrapper.sign(messageToSign, keypair.secretKey);
		const publicKey = keypair.publicKey;

		expect(signature.length).toBe(3309);
		expect(publicKey.length).toBe(1952);

		const encoded = receiptCodec.encodeHybridV2(
			journalBuf,
			dummyProof,
			Buffer.from(signature),
			Buffer.from(publicKey),
		);

		expect(encoded[0]).toBe(RECEIPT_VERSION_V2);
		expect(encoded[1]).toBe(ProofType.GROTH16_PQC_HYBRID);

		const decoded = receiptCodec.decode(encoded);
		expect(decoded.version).toBe(RECEIPT_VERSION_V2);
		expect(decoded.proofType).toBe(ProofType.GROTH16_PQC_HYBRID);
		expect(decoded.journal.equals(journalBuf)).toBe(true);
		expect(decoded.proof.equals(dummyProof)).toBe(true);
		expect(decoded.pqcSignature).toBeDefined();
		expect(decoded.pqcSignature?.length).toBe(3309);
		expect(decoded.pqcPublicKey).toBeDefined();
		expect(decoded.pqcPublicKey?.length).toBe(1952);
	});

	it("should successfully verify a legitimate ML-DSA-65 co-signed hybrid receipt in zk-verifier", async () => {
		const messageToSign = crypto
			.createHash("sha256")
			.update(Buffer.concat([journalBuf, dummyProof]))
			.digest();

		const signature = Dilithium65Wrapper.sign(messageToSign, keypair.secretKey);
		const encoded = receiptCodec.encodeHybridV2(
			journalBuf,
			dummyProof,
			Buffer.from(signature),
			Buffer.from(keypair.publicKey),
		);

		const result = await workerHandler({
			action: "verify_receipt",
			zkReceipt: encoded,
			logicPayload: Buffer.from(logicSource),
			remoteImageIdHex: logicDigest.toString("hex"),
			guestImageIdHex: guestImageId.toString("hex"),
		});
		expect(result.verified).toBe(true);
		expect(result.proofType).toBe("groth16_pqc_hybrid");
		expect(result.message).toContain("ML-DSA-65 Post-Quantum Hybrid Receipt Certified");
	});

	it("should strictly reject a hybrid receipt if the ML-DSA-65 signature is tampered", async () => {
		const messageToSign = crypto
			.createHash("sha256")
			.update(Buffer.concat([journalBuf, dummyProof]))
			.digest();

		const signature = Buffer.from(Dilithium65Wrapper.sign(messageToSign, keypair.secretKey));
		// Tamper with 1 byte of the PQC signature
		signature[10] ^= 0xff;

		const encoded = receiptCodec.encodeHybridV2(
			journalBuf,
			dummyProof,
			signature,
			Buffer.from(keypair.publicKey),
		);

		const result = await workerHandler({
			action: "verify_receipt",
			zkReceipt: encoded,
			logicPayload: Buffer.from(logicSource),
			remoteImageIdHex: logicDigest.toString("hex"),
			guestImageIdHex: guestImageId.toString("hex"),
			expectedOutput,
			zkPolicy: "optimistic",
		});

		expect(result.verified).toBe(false);
		expect(result.message).toContain("PQC Signature Verification Failed");
	});
});
