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
});
