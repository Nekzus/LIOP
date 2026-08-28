import { describe, expect, it } from "vitest";
import processLogicExecution from "../../../src/workers/logic-execution.js";

describe("Strict Session Lifetime Enforcement (NIST SP 800-53 / PCI-DSS)", () => {
	it("should allow execution when session timestamp is fresh (< 3600s)", async () => {
		const freshTimestamp = Date.now() - 60 * 1000; // 1 minute old
		const dummyData = {
			ciphertext: new Uint8Array(1088),
			secretKeyObj: new Uint8Array(2400),
			wasmBinary: new Uint8Array(32),
			inputs: {},
			sessionTimestamp: freshTimestamp,
			isEncrypted: false,
		};

		// Should not throw TTL expiration error
		try {
			await processLogicExecution(dummyData);
		} catch (error) {
			expect((error as Error).message).not.toContain("Session secret expired");
			expect((error as Error).message).not.toContain("Timestamp is in the future");
		}
	});

	it("should reject execution when session key has expired (> 3600s TTL limit)", async () => {
		const expiredTimestamp = Date.now() - 3605 * 1000; // 3605 seconds old (> 1 hour)
		const dummyData = {
			ciphertext: new Uint8Array(1088),
			secretKeyObj: new Uint8Array(2400),
			wasmBinary: new Uint8Array(32),
			inputs: {},
			sessionTimestamp: expiredTimestamp,
			isEncrypted: false,
		};

		await expect(processLogicExecution(dummyData)).rejects.toThrow(
			/\[LIOP-PQC\] Session secret expired: Age \(\d+s\) exceeds 3600s TTL limit/,
		);
	});

	it("should reject execution when session timestamp is suspiciously in the future", async () => {
		const futureTimestamp = Date.now() + 120 * 1000; // 2 minutes in the future
		const dummyData = {
			ciphertext: new Uint8Array(1088),
			secretKeyObj: new Uint8Array(2400),
			wasmBinary: new Uint8Array(32),
			inputs: {},
			sessionTimestamp: futureTimestamp,
			isEncrypted: false,
		};

		await expect(processLogicExecution(dummyData)).rejects.toThrow(
			/\[LIOP-PQC\] Session secret invalid: Timestamp is in the future/,
		);
	});
});
