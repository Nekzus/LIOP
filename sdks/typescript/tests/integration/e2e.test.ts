import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { NmpServer } from "../../src/server/index.js";

/**
 * End-to-End Integration Tests (Local, No Network)
 *
 * Validates the complete Logic-on-Origin pipeline through the NmpServer
 * without requiring a real gRPC connection or P2P mesh.
 */
describe("E2E Logic-on-Origin Pipeline", () => {
	let server: NmpServer;

	beforeAll(async () => {
		server = new NmpServer(
			{ name: "E2E-TestNode", version: "1.0.0" },
			{
				security: {
					piiPatterns: [],
					forbiddenKeys: ["id", "name", "ssn"],
				},
			},
		);

		server.setSandboxData([
			{ id: "P001", name: "Alice", age: 32, condition: "Hypertension" },
			{ id: "P002", name: "Bob", age: 45, condition: "Diabetes Type 2" },
			{ id: "P003", name: "Charlie", age: 28, condition: "Healthy" },
			{ id: "P004", name: "Diana", age: 55, condition: "Diabetes Type 2" },
		]);

		server.tool(
			"compute_on_origin",
			"Executes Logic-on-Origin against medical records",
			{ payload: z.string() },
			async (args) => ({
				content: [{ type: "text", text: args.payload }],
			}),
		);
	});

	afterAll(async () => {
		await server.close();
	});

	it("should execute valid logic and return computed results", async () => {
		const result = await server.callTool({
			name: "compute_on_origin",
			arguments: {
				payload: `---BEGIN_LOGIC---
const records = env.records;
const count = records.length;
const avgAge = records.reduce((sum, r) => sum + r.age, 0) / count;
return JSON.stringify({ count, average_age: avgAge });
---END_LOGIC---`,
			},
		});

		expect(result.isError).toBeUndefined();
		const data = JSON.parse(
			JSON.parse(result.content[0].text || "{}").computation_result,
		);
		expect(data.count).toBe(4);
		expect(data.average_age).toBe(40);
	});

	it("should reject malformed payloads missing magic boundaries", async () => {
		const result = await server.callTool({
			name: "compute_on_origin",
			arguments: {
				payload: "return 42;",
			},
		});

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("Missing magic bytes");
	});

	it("should block PII exfiltration via forbidden keys", async () => {
		const result = await server.callTool({
			name: "compute_on_origin",
			arguments: {
				payload: `---BEGIN_LOGIC---
const records = env.records;
return JSON.stringify(records.map(r => ({ id: r.id, name: r.name, age: r.age })));
---END_LOGIC---`,
			},
		});

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("Egress Security Violation");
	});

	it("should allow aggregated results without PII", async () => {
		const result = await server.callTool({
			name: "compute_on_origin",
			arguments: {
				payload: `---BEGIN_LOGIC---
const records = env.records;
const diabetesCount = records.filter(r => r.condition === "Diabetes Type 2").length;
return JSON.stringify({ diabetes_count: diabetesCount, total: records.length });
---END_LOGIC---`,
			},
		});

		expect(result.isError).toBeUndefined();
		const data = JSON.parse(
			JSON.parse(result.content[0].text || "{}").computation_result,
		);
		expect(data.diabetes_count).toBe(2);
		expect(data.total).toBe(4);
	});

	it("should throttle after repeated violations", async () => {
		// First, exhaust the throttle counter by sending 5 malformed payloads
		for (let i = 0; i < 5; i++) {
			await server.callTool({
				name: "compute_on_origin",
				arguments: { payload: `invalid-attempt-${i}` },
			});
		}

		// Sixth attempt should be throttled
		const result = await server.callTool({
			name: "compute_on_origin",
			arguments: { payload: "should-be-throttled" },
		});

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("NMP_THROTTLED");
	});

	it("should cache validated logic payloads by SHA-256 hash", async () => {
		// Create a fresh server to avoid throttle state from previous test
		const freshServer = new NmpServer({
			name: "CacheTestNode",
			version: "1.0.0",
		});
		freshServer.setSandboxData([{ value: 10 }, { value: 20 }]);

		freshServer.tool(
			"cached_compute",
			"Cached Logic-on-Origin",
			{ payload: z.string() },
			async (args) => ({
				content: [{ type: "text", text: args.payload }],
			}),
		);

		const payload = `---BEGIN_LOGIC---
const records = env.records;
return JSON.stringify({ sum: records.reduce((a, r) => a + r.value, 0) });
---END_LOGIC---`;

		// First execution: gets cached after success
		const result1 = await freshServer.callTool({
			name: "cached_compute",
			arguments: { payload },
		});
		expect(result1.isError).toBeUndefined();

		// Second execution: should hit cache (same SHA-256 hash)
		const result2 = await freshServer.callTool({
			name: "cached_compute",
			arguments: { payload },
		});
		expect(result2.isError).toBeUndefined();
		expect(result1.content[0].text).toBe(result2.content[0].text);

		await freshServer.close();
	});
});
