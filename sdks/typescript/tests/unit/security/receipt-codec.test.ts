// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import {
	ProofType,
	RECEIPT_VERSION_V1,
	RECEIPT_VERSION_V2,
	ZK_JOURNAL_V2_SIZE,
	ZkVerificationError,
	decodeJournalV2,
	encodeJournalV2,
	receiptCodec,
	type ZkJournalV2,
} from "../../../src/security/zk.js";

describe("Binary Receipt Codec Engine (Task 2)", () => {
	const mockJournalFields: ZkJournalV2 = {
		guestImageId: crypto.randomBytes(32),
		logicDigest: crypto.randomBytes(32),
		datasetDigest: crypto.randomBytes(32),
		outputDigest: crypto.randomBytes(32),
		fuelConsumed: 42000n,
		executionTimestamp: 1774450000000n,
	};

	describe("encodeJournalV2 / decodeJournalV2", () => {
		it("should encode and decode ZkJournalV2 with exact 144 bytes roundtrip", () => {
			const encoded = encodeJournalV2(mockJournalFields);
			expect(encoded.length).toBe(ZK_JOURNAL_V2_SIZE);

			const decoded = decodeJournalV2(encoded);
			expect(decoded.guestImageId.equals(mockJournalFields.guestImageId)).toBe(true);
			expect(decoded.logicDigest.equals(mockJournalFields.logicDigest)).toBe(true);
			expect(decoded.datasetDigest.equals(mockJournalFields.datasetDigest)).toBe(true);
			expect(decoded.outputDigest.equals(mockJournalFields.outputDigest)).toBe(true);
			expect(decoded.fuelConsumed).toBe(mockJournalFields.fuelConsumed);
			expect(decoded.executionTimestamp).toBe(mockJournalFields.executionTimestamp);
		});

		it("should reject invalid field buffer lengths on encode", () => {
			expect(() =>
				encodeJournalV2({
					...mockJournalFields,
					guestImageId: Buffer.alloc(31),
				}),
			).toThrow(ZkVerificationError);

			expect(() =>
				encodeJournalV2({
					...mockJournalFields,
					logicDigest: Buffer.alloc(33),
				}),
			).toThrow(ZkVerificationError);
		});

		it("should reject buffer with size !== 144 on decode", () => {
			expect(() => decodeJournalV2(Buffer.alloc(143))).toThrow(ZkVerificationError);
			expect(() => decodeJournalV2(Buffer.alloc(145))).toThrow(ZkVerificationError);
			expect(() => decodeJournalV2(Buffer.alloc(0))).toThrow(ZkVerificationError);
		});
	});

	describe("receiptCodec v2", () => {
		const mockProof = crypto.randomBytes(256);
		const journalBuf = encodeJournalV2(mockJournalFields);

		it("should encode and decode Receipt v2 with Groth16 proof", () => {
			const encoded = receiptCodec.encodeV2(ProofType.GROTH16, journalBuf, mockProof);
			expect(encoded[0]).toBe(RECEIPT_VERSION_V2);
			expect(encoded[1]).toBe(ProofType.GROTH16);

			const decoded = receiptCodec.decode(encoded);
			expect(decoded.version).toBe(RECEIPT_VERSION_V2);
			expect(decoded.proofType).toBe(ProofType.GROTH16);
			expect(decoded.journal.equals(journalBuf)).toBe(true);
			expect(decoded.proof.equals(mockProof)).toBe(true);
		});

		it("should reject corrupted receipt v2 (tampered checksum)", () => {
			const encoded = receiptCodec.encodeV2(ProofType.GROTH16, journalBuf, mockProof);
			// Flip one bit in payload
			encoded[10] ^= 0x01;

			expect(() => receiptCodec.decode(encoded)).toThrow(ZkVerificationError);
		});

		it("should reject truncated receipt v2 buffer", () => {
			expect(() => receiptCodec.decode(Buffer.from([0x02, 0x02]))).toThrow(
				ZkVerificationError,
			);
		});
	});

	describe("receiptCodec v1 backwards compatibility", () => {
		it("should decode legacy v1 HMAC receipt format correctly", () => {
			const legacyJournal = Buffer.from(
				JSON.stringify({ image_id: "test", dataset_hash: "hash" }),
			);
			const journalLen = Buffer.alloc(2);
			journalLen.writeUInt16BE(legacyJournal.length);
			const seal = crypto.randomBytes(32);
			const legacyReceipt = Buffer.concat([
				Buffer.from([RECEIPT_VERSION_V1]),
				journalLen,
				legacyJournal,
				seal,
			]);

			const decoded = receiptCodec.decode(legacyReceipt);
			expect(decoded.version).toBe(RECEIPT_VERSION_V1);
			expect(decoded.proofType).toBe(ProofType.HMAC_LEGACY);
			expect(decoded.journal.equals(legacyJournal)).toBe(true);
			expect(decoded.proof.equals(seal)).toBe(true);
		});
	});
});
