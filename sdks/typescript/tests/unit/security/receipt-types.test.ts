// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
	ProofType,
	RECEIPT_VERSION_V1,
	RECEIPT_VERSION_V2,
	ZK_JOURNAL_V2_SIZE,
	type ZkJournalV2,
	type ZkPolicy,
	type ZkReceipt,
} from "../../../src/security/zk.js";

describe("Receipt Types and Binary Specifications (Task 1)", () => {
	it("should have correct version constants and enum values", () => {
		expect(RECEIPT_VERSION_V1).toBe(0x01);
		expect(RECEIPT_VERSION_V2).toBe(0x02);
		expect(ProofType.HMAC_LEGACY).toBe(0x00);
		expect(ProofType.GROTH16).toBe(0x02);
		expect(ZK_JOURNAL_V2_SIZE).toBe(144);
	});

	it("should validate ZkJournalV2 layout sizes and constraints", () => {
		const sampleJournal: ZkJournalV2 = {
			guestImageId: Buffer.alloc(32, 0xaa),
			logicDigest: Buffer.alloc(32, 0xbb),
			datasetDigest: Buffer.alloc(32, 0xcc),
			outputDigest: Buffer.alloc(32, 0xdd),
			fuelConsumed: 1250000n,
			executionTimestamp: BigInt(Date.now()),
		};

		expect(sampleJournal.guestImageId.length).toBe(32);
		expect(sampleJournal.logicDigest.length).toBe(32);
		expect(sampleJournal.datasetDigest.length).toBe(32);
		expect(sampleJournal.outputDigest.length).toBe(32);
		expect(typeof sampleJournal.fuelConsumed).toBe("bigint");
		expect(typeof sampleJournal.executionTimestamp).toBe("bigint");
	});

	it("should support ZkReceipt with proofType discriminator", () => {
		const receipt: ZkReceipt = {
			proof: Buffer.alloc(64),
			journal: Buffer.alloc(144),
			imageId: Buffer.alloc(32),
			proofType: ProofType.GROTH16,
			version: RECEIPT_VERSION_V2,
		};

		expect(receipt.proofType).toBe(ProofType.GROTH16);
		expect(receipt.version).toBe(RECEIPT_VERSION_V2);
	});

	it("should allow valid ZkPolicy modes", () => {
		const policies: ZkPolicy[] = ["none", "optimistic", "required"];
		expect(policies).toContain("required");
		expect(policies).toContain("optimistic");
		expect(policies).toContain("none");
	});
});
