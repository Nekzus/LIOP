import { describe, expect, it } from "vitest";
import { LiopVerifier } from "../../src/crypto/verifier.js";
import crypto from "node:crypto";

const dummySecret = crypto.randomBytes(32);

function mockZK(imageId: string, secret?: Buffer, datasetHash?: string): Buffer {
	const journal = Buffer.from(JSON.stringify({
		image_id: imageId,
		dataset_hash: datasetHash || crypto.createHash("sha256").update("[]").digest("hex"),
	}));
	const journalLen = Buffer.alloc(2);
	journalLen.writeUInt16BE(journal.length);
	const seal = secret ? crypto.createHmac("sha256", secret).update(journal).digest() : Buffer.alloc(32);
	return Buffer.concat([Buffer.from([0x01]), journalLen, journal, seal]);
}

describe("LiopVerifier (Industrial Tier-0)", () => {
	const verifier = new LiopVerifier();
	const mockPayload = Buffer.from("return 1;");

	it("should derive deterministic ImageID (SHA-256)", async () => {
		const id1 = verifier.deriveImageId(mockPayload);
		const id2 = verifier.deriveImageId(mockPayload);

		expect(id1.toString("hex")).toBe(id2.toString("hex"));
		expect(id1.toString("hex")).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
	});

	it("should verify a matching ZK-Receipt ImageID", async () => {
		const imageId = verifier.deriveImageId(mockPayload).toString("hex");
		const isValid = await verifier.verifyZkReceipt(
			mockPayload,
			imageId,
			mockZK(imageId, dummySecret),
			dummySecret,
		);

		expect(isValid).toBe(true);
	});

	it("should reject mismatching Evidence Hash (Tamper Detection)", async () => {
		const imageId = verifier.deriveImageId(mockPayload).toString("hex");
		const tamperedPayload = Buffer.from("return 2;");

		const isValid = await verifier.verifyZkReceipt(
			tamperedPayload,
			imageId,
			mockZK(imageId, dummySecret),
			dummySecret,
		);

		expect(isValid).toBe(false);
	});

	it("should reject mismatching ImageID (Proof Detection)", async () => {
		const wrongImageId = "0".repeat(64);

		const isValid = await verifier.verifyZkReceipt(
			mockPayload,
			wrongImageId,
			mockZK(wrongImageId, dummySecret),
			dummySecret,
		);

		expect(isValid).toBe(false);
	});

	it("should include dataset_hash in ZK-Receipt journal (Phase 110)", () => {
		const imageId = verifier.deriveImageId(mockPayload).toString("hex");
		const datasetHash = crypto.createHash("sha256").update(JSON.stringify([{ id: 1 }])).digest("hex");
		const receipt = mockZK(imageId, dummySecret, datasetHash);

		// Parse journal from receipt: v1 byte + 2-byte length + journal
		const journalLen = receipt.readUInt16BE(1);
		const journalBuf = receipt.subarray(3, 3 + journalLen);
		const journal = JSON.parse(journalBuf.toString("utf-8"));

		expect(journal.dataset_hash).toBe(datasetHash);
		expect(journal.dataset_hash).toMatch(/^[a-f0-9]{64}$/);
	});
});
