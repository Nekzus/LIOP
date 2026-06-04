import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { z } from "zod";
import { LiopServer } from "../../src/server/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.resolve(__dirname, "../infra/nexus-data");
const testBudgetPath = path.join(tempDir, "test-budgets.json");

describe("LIOP Persistent Query Budget Integration", () => {
	beforeAll(() => {
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}
		if (fs.existsSync(testBudgetPath)) {
			fs.unlinkSync(testBudgetPath);
		}
		const lockPath = `${testBudgetPath}.lock`;
		if (fs.existsSync(lockPath)) {
			fs.unlinkSync(lockPath);
		}
	});

	afterAll(() => {
		try {
			if (fs.existsSync(testBudgetPath)) {
				fs.unlinkSync(testBudgetPath);
			}
			const lockPath = `${testBudgetPath}.lock`;
			if (fs.existsSync(lockPath)) {
				fs.unlinkSync(lockPath);
			}
		} catch {
			// ignore
		}
	});

	it("should persist budget limits across restarts and block queries", async () => {
		const policy = {
			enforceAggregationFirst: true,
			queryBudgetPerField: 3,
			budgetStorePath: testBudgetPath,
		};

		const serverA = new LiopServer(
			{ name: "Server-A", version: "1.0.0" },
			{ budgetStorePath: testBudgetPath }
		);

		serverA.tool(
			"query_data",
			"Query sensitive metrics",
			{ payload: z.string() },
			async () => ({ content: [{ type: "text", text: "ok" }] }),
			policy
		);

		const dummyRecords = [{ val: 10 }, { val: 20 }, { val: 30 }];
		serverA.setSandboxData(dummyRecords);

		const queryPayload = "@LIOP{wasi_v1,Q}\nreturn { count: env.records.filter(r => r.val > 0).length }\n@END";
		
		const res1 = await serverA.callTool(
			{ name: "query_data", arguments: { payload: queryPayload } },
			"client-123"
		);
		expect(res1.isError).toBeUndefined();

		const res2 = await serverA.callTool(
			{ name: "query_data", arguments: { payload: queryPayload } },
			"client-123"
		);
		expect(res2.isError).toBeUndefined();

		const res3 = await serverA.callTool(
			{ name: "query_data", arguments: { payload: queryPayload } },
			"client-123"
		);
		expect(res3.isError).toBeUndefined();

		const res4 = await serverA.callTool(
			{ name: "query_data", arguments: { payload: queryPayload } },
			"client-123"
		);
		expect(res4.isError).toBe(true);
		expect(res4.content[0].text).toContain("Query budget exceeded");

		const serverB = new LiopServer(
			{ name: "Server-B", version: "1.0.0" },
			{ budgetStorePath: testBudgetPath }
		);

		serverB.tool(
			"query_data",
			"Query sensitive metrics",
			{ payload: z.string() },
			async () => ({ content: [{ type: "text", text: "ok" }] }),
			policy
		);
		serverB.setSandboxData(dummyRecords);

		const resB1 = await serverB.callTool(
			{ name: "query_data", arguments: { payload: queryPayload } },
			"client-123"
		);
		expect(resB1.isError).toBe(true);
		expect(resB1.content[0].text).toContain("Query budget exceeded");
	});

	it("should share and enforce budget limits concurrently across different instances", async () => {
		const policy = {
			enforceAggregationFirst: true,
			queryBudgetPerField: 5,
			budgetStorePath: testBudgetPath,
		};

		if (fs.existsSync(testBudgetPath)) {
			fs.unlinkSync(testBudgetPath);
		}

		const server1 = new LiopServer({ name: "Server-1", version: "1" });
		const server2 = new LiopServer({ name: "Server-2", version: "1" });

		const dummyRecords = [{ score: 90 }, { score: 85 }];
		server1.setSandboxData(dummyRecords);
		server2.setSandboxData(dummyRecords);

		server1.tool("get_scores", "Fetch scores", { payload: z.string() }, async () => ({ content: [] }), policy);
		server2.tool("get_scores", "Fetch scores", { payload: z.string() }, async () => ({ content: [] }), policy);

		const queryPayload = "@LIOP{wasi_v1,Q}\nreturn { count: env.records.filter(r => r.score > 0).length }\n@END";

		await server1.callTool({ name: "get_scores", arguments: { payload: queryPayload } }, "agent-abc");
		await server2.callTool({ name: "get_scores", arguments: { payload: queryPayload } }, "agent-abc");
		await server1.callTool({ name: "get_scores", arguments: { payload: queryPayload } }, "agent-abc");
		await server2.callTool({ name: "get_scores", arguments: { payload: queryPayload } }, "agent-abc");

		const res5 = await server1.callTool({ name: "get_scores", arguments: { payload: queryPayload } }, "agent-abc");
		expect(res5.isError).toBeUndefined();

		const res6 = await server2.callTool({ name: "get_scores", arguments: { payload: queryPayload } }, "agent-abc");
		expect(res6.isError).toBe(true);
		expect(res6.content[0].text).toContain("Query budget exceeded");
	});

	it("should handle heavy concurrent budget updates safely without file corruption", async () => {
		const policy = {
			enforceAggregationFirst: true,
			queryBudgetPerField: 1000,
			budgetStorePath: testBudgetPath,
		};

		if (fs.existsSync(testBudgetPath)) {
			fs.unlinkSync(testBudgetPath);
		}

		const server = new LiopServer(
			{ name: "Concurrent-Server", version: "1" },
			{
				workerPool: {
					maxQueue: 100,
					maxThreads: 4,
				},
				security: {
					rateLimit: {
						maxPerWindow: 100,
						globalMaxPerWindow: 200,
					},
				},
			}
		);
		server.setSandboxData([{ item: 1 }]);
		server.tool("check", "Check items", { payload: z.string() }, async () => ({ content: [] }), policy);

		const queryPayload = "@LIOP{wasi_v1,Q}\nreturn { count: env.records.filter(r => r.item !== undefined).length }\n@END";

		const promises = Array.from({ length: 30 }).map(() =>
			server.callTool({ name: "check", arguments: { payload: queryPayload } }, "concurrent-client")
		);

		const results = await Promise.all(promises);
		
		for (const res of results) {
			if (res.isError) {
				console.error("DEBUG CONCURRENT ERROR:", JSON.stringify(res));
			}
			expect(res.isError).toBeUndefined();
		}

		const data = JSON.parse(fs.readFileSync(testBudgetPath, "utf-8"));
		const count = data["concurrent-client"]["check"]["item"];
		expect(count).toBe(30);
	});

	it("should reset budget selectively by toolName via resetFieldBudget()", async () => {
		const policy = {
			enforceAggregationFirst: true,
			queryBudgetPerField: 2,
			budgetStorePath: testBudgetPath,
		};

		if (fs.existsSync(testBudgetPath)) {
			fs.unlinkSync(testBudgetPath);
		}

		const server = new LiopServer(
			{ name: "Reset-Server", version: "1" },
			{ budgetStorePath: testBudgetPath },
		);
		server.setSandboxData([{ val: 10 }, { score: 5 }]);

		server.tool("tool_a", "Tool A", { payload: z.string() }, async () => ({ content: [] }), policy);
		server.tool("tool_b", "Tool B", { payload: z.string() }, async () => ({ content: [] }), policy);

		const payloadA = "@LIOP{wasi_v1,Q}\nreturn { count: env.records.filter(r => r.val > 0).length }\n@END";
		const payloadB = "@LIOP{wasi_v1,Q}\nreturn { count: env.records.filter(r => r.score > 0).length }\n@END";

		// Exhaust budget for tool_a and tool_b
		await server.callTool({ name: "tool_a", arguments: { payload: payloadA } }, "reset-client");
		await server.callTool({ name: "tool_a", arguments: { payload: payloadA } }, "reset-client");
		await server.callTool({ name: "tool_b", arguments: { payload: payloadB } }, "reset-client");
		await server.callTool({ name: "tool_b", arguments: { payload: payloadB } }, "reset-client");

		// Both should be exhausted now
		const blocked_a = await server.callTool({ name: "tool_a", arguments: { payload: payloadA } }, "reset-client");
		expect(blocked_a.isError).toBe(true);
		const blocked_b = await server.callTool({ name: "tool_b", arguments: { payload: payloadB } }, "reset-client");
		expect(blocked_b.isError).toBe(true);

		// Reset only tool_a
		server.resetFieldBudget("reset-client", "tool_a");

		// tool_a should work again
		const unblocked_a = await server.callTool({ name: "tool_a", arguments: { payload: payloadA } }, "reset-client");
		expect(unblocked_a.isError).toBeUndefined();

		// tool_b should still be blocked
		const still_blocked_b = await server.callTool({ name: "tool_b", arguments: { payload: payloadB } }, "reset-client");
		expect(still_blocked_b.isError).toBe(true);

		// Verify persistent store reflects the selective reset:
		// tool_a was reset and then called once, so its count should be 1 (not the exhausted 2)
		const data = JSON.parse(fs.readFileSync(testBudgetPath, "utf-8"));
		expect(data["reset-client"]["tool_a"]["val"]).toBe(1);
		expect(data["reset-client"]["tool_b"]["score"]).toBe(2);
	});

	it("should reset all tools for a client via resetFieldBudget() without toolName", async () => {
		const policy = {
			enforceAggregationFirst: true,
			queryBudgetPerField: 1,
			budgetStorePath: testBudgetPath,
		};

		if (fs.existsSync(testBudgetPath)) {
			fs.unlinkSync(testBudgetPath);
		}

		const server = new LiopServer(
			{ name: "FullReset-Server", version: "1" },
			{ budgetStorePath: testBudgetPath },
		);
		server.setSandboxData([{ x: 1 }]);
		server.tool("t1", "T1", { payload: z.string() }, async () => ({ content: [] }), policy);

		const payload = "@LIOP{wasi_v1,Q}\nreturn { count: env.records.filter(r => r.x > 0).length }\n@END";

		// Exhaust budget
		await server.callTool({ name: "t1", arguments: { payload } }, "full-reset-client");
		const blocked = await server.callTool({ name: "t1", arguments: { payload } }, "full-reset-client");
		expect(blocked.isError).toBe(true);

		// Full reset (no toolName)
		server.resetFieldBudget("full-reset-client");

		// Should work again
		const unblocked = await server.callTool({ name: "t1", arguments: { payload } }, "full-reset-client");
		expect(unblocked.isError).toBeUndefined();

		// Verify persistent store was reset: count should be 1 (from the successful post-reset call)
		const data = JSON.parse(fs.readFileSync(testBudgetPath, "utf-8"));
		expect(data["full-reset-client"]["t1"]["x"]).toBe(1);
	});
});
