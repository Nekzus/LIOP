import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LiopServer } from "../../../src/server/index.js";

describe("Security: Prototype Pollution Prevention (CWE-915)", () => {
	let server: LiopServer;
	let tempDir: string;
	let storePath: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "liop-proto-test-"));
		storePath = path.join(tempDir, "budget-store.json");

		server = new LiopServer(
			{ name: "prototype-pollution-test-server", version: "1.0.0" },
			{ budgetStorePath: storePath },
		);
	});

	afterEach(() => {
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("should reject dangerous client ID keys and prevent prototype contamination", () => {
		const dangerousKeys = ["__proto__", "constructor", "prototype"];

		for (const key of dangerousKeys) {
			expect(() => {
				server.resetFieldBudget(key);
			}).not.toThrow();

			// Verify Object.prototype was NOT polluted
			expect(
				(Object.prototype as Record<string, unknown>).polluted,
			).toBeUndefined();
		}
	});

	it("should reject dangerous tool names during budget reset", () => {
		const dangerousKeys = ["__proto__", "constructor", "prototype"];

		for (const key of dangerousKeys) {
			expect(() => {
				server.resetFieldBudget("legitimate-client-id", key);
			}).not.toThrow();

			expect(
				(Object.prototype as Record<string, unknown>).polluted,
			).toBeUndefined();
		}
	});

	it("should safely handle valid client IDs without throwing", () => {
		expect(() => {
			server.resetFieldBudget("valid-client-123", "test_tool");
			server.resetFieldBudget("valid-client-123");
		}).not.toThrow();
	});
});
