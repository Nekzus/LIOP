/**
 * LIOP ZK-Receipt Anti-Replay and Output Tampering Integration Tests
 */
import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { LiopVerifier } from "../../src/crypto/verifier.js";

// Helper to generate a valid ZK-Receipt binary structure
function generateMockZkReceipt(
	imageId: string,
	output: unknown,
	secret: Buffer,
	datasetHash?: string,
): Buffer {
	const outputStr =
		typeof output === "string"
			? output
			: output === undefined
				? "undefined"
				: JSON.stringify(output);

	const outputHash = crypto
		.createHash("sha256")
		.update(outputStr)
		.digest("hex");

	const dHash =
		datasetHash ||
		crypto.createHash("sha256").update("[]").digest("hex");

	const journal = Buffer.from(
		JSON.stringify({
			image_id: imageId,
			dataset_hash: dHash,
			output_hash: outputHash,
			fuel: 5000,
			ts: Date.now(),
		}),
	);

	const journalLen = Buffer.alloc(2);
	journalLen.writeUInt16BE(journal.length);

	const seal = crypto
		.createHmac("sha256", secret)
		.update(journal)
		.digest();

	return Buffer.concat([Buffer.from([0x01]), journalLen, journal, seal]);
}

describe("LIOP ZK-Receipt Anti-Replay & Tampering Protections", () => {
	const verifier = new LiopVerifier();
	const mockPayload = Buffer.from("return { balance: 100 };");
	const imageId = verifier.deriveImageId(mockPayload).toString("hex");
	const sessionSecretA = crypto.randomBytes(32);
	const sessionSecretB = crypto.randomBytes(32);
	const datasetHash = crypto.createHash("sha256").update(JSON.stringify([])).digest("hex");

	it("should VERIFY a legitimate execution and matching expectedOutput", async () => {
		const expectedOutput = { balance: 100 };
		const receipt = generateMockZkReceipt(imageId, expectedOutput, sessionSecretA, datasetHash);

		const isValid = await verifier.verifyZkReceipt(
			mockPayload,
			imageId,
			receipt,
			sessionSecretA,
			expectedOutput,
		);

		expect(isValid).toBe(true);
	});

	it("should REJECT when expectedOutput is altered (Tamper Detection)", async () => {
		const legitimateOutput = { balance: 100 };
		const tamperedOutput = { balance: 999999 }; // Attack payload

		const receipt = generateMockZkReceipt(imageId, legitimateOutput, sessionSecretA, datasetHash);

		const isValid = await verifier.verifyZkReceipt(
			mockPayload,
			imageId,
			receipt,
			sessionSecretA,
			tamperedOutput, // Client expects or received tampered data
		);

		expect(isValid).toBe(false);
	});

	it("should REJECT inter-session replay (HMAC failure due to different session secret)", async () => {
		const expectedOutput = { balance: 100 };
		// Receipt signed under Session A
		const receipt = generateMockZkReceipt(imageId, expectedOutput, sessionSecretA, datasetHash);

		// Verifier tries to validate it under Session B
		const isValid = await verifier.verifyZkReceipt(
			mockPayload,
			imageId,
			receipt,
			sessionSecretB,
			expectedOutput,
		);

		expect(isValid).toBe(false);
	});

	it("should REJECT inter-request replay (Same script, different output)", async () => {
		const firstOutput = { balance: 100 };
		const secondOutput = { balance: 200 };

		// Generate receipt for first computation
		const receipt1 = generateMockZkReceipt(imageId, firstOutput, sessionSecretA, datasetHash);

		// Attacker attempts to replay receipt1 for the second computation
		const isValid = await verifier.verifyZkReceipt(
			mockPayload,
			imageId,
			receipt1,
			sessionSecretA,
			secondOutput,
		);

		expect(isValid).toBe(false);
	});
});
