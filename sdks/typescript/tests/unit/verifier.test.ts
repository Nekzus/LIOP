import { describe, expect, it } from "vitest";
import { LiopVerifier } from "../../src/crypto/verifier.js";
import crypto from "node:crypto";

function mockZK(imageId: string): Buffer {
	const journal = Buffer.from(JSON.stringify({ image_id: imageId }));
	const journalLen = Buffer.alloc(2);
	journalLen.writeUInt16BE(journal.length);
	const seal = Buffer.alloc(32);
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
			mockZK(imageId),
		);

		expect(isValid).toBe(true);
	});

	it("should reject mismatching Evidence Hash (Tamper Detection)", async () => {
		const imageId = verifier.deriveImageId(mockPayload).toString("hex");
		const tamperedPayload = Buffer.from("return 2;");

		const isValid = await verifier.verifyZkReceipt(
			tamperedPayload,
			imageId,
			mockZK(imageId),
		);

		expect(isValid).toBe(false);
	});

	it("should reject mismatching ImageID (Proof Detection)", async () => {
		const wrongImageId = "0".repeat(64);

		const isValid = await verifier.verifyZkReceipt(
			mockPayload,
			wrongImageId,
			mockZK(wrongImageId),
		);

		expect(isValid).toBe(false);
	});
});
