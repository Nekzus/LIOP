/**
 * LIOP Scale and Industrial Stress Testing Suite (Phase 134)
 *
 * Verifies Differential Privacy convergence, dynamic K-Anonymity release,
 * WASI sandbox CPU fuel budgeting, and Piscina heap exhaustion (OOM) recovery.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { LiopServer } from "../../src/server/index.js";
import { generateBankDataset } from "../infra/utils/datasetGenerator.js";

describe("LIOP Industrial Scale & Stress Tests", () => {
	let server: LiopServer;

	beforeAll(async () => {
		server = new LiopServer(
			{ name: "Scale-Stress-Server", version: "1.0.0" },
			{
				security: {
					forbiddenKeys: ["id", "name", "accountHolder"],
				},
			},
		);

		// Tool with Differential Privacy configured, forcing DP even at scale 1000
		server.tool(
			"analyze_scale_dp",
			"Analyze bank transactions with Laplace noise at scale",
			{ payload: z.string() },
			async () => ({ content: [] }),
			{
				enforceAggregationFirst: true,
				// Epsilon 2.0, sensitivity 100,000 (max account balance)
				dpEpsilon: 2.0,
				dpSensitivity: 100000.0,
				dpSmallDatasetThreshold: 1000000, // Force DP for all test scales
			},
		);

		// Tool with standard policy (for K-Anonymity testing)
		server.tool(
			"analyze_k_anon",
			"Analyze bank ledger for K-Anonymity verification",
			{ payload: z.string() },
			async () => ({ content: [] }),
			{
				enforceAggregationFirst: true,
			},
		);
	});

	afterAll(async () => {
		await server.close();
	});

	describe("1. Differential Privacy Laplace Convergence", () => {
		it("should demonstrate Laplace noise relative error converges to < 1% as scale increases", async () => {
			const scales = [1, 10, 100, 1000];
			const errors: number[] = [];

			for (const scale of scales) {
				const accounts = generateBankDataset(scale);
				const trueSum = accounts.reduce((acc, x) => acc + x.balance, 0);

				server.setSandboxData(accounts);

				const result = await server.callTool({
					name: "analyze_scale_dp",
					arguments: {
						payload: `@LIOP{wasi_v1,DP_Scale_${scale}}
const r = env.records;
const sum = r.reduce((s, x) => s + x.balance, 0);
return { totalBalance: Math.round(sum) };
@END`,
					},
				});

				expect(result.isError).toBeFalsy();
				const parsed = JSON.parse(result.content[0].text!);
				const noisySum = parsed.computation_result.totalBalance;
				const relativeError = Math.abs(noisySum - trueSum) / trueSum;

				errors.push(relativeError);
			}

			// Verify that relative error decreases between smallest and largest scale
			expect(errors[errors.length - 1]).toBeLessThan(errors[0]);

			// Verify convergence of < 1% at scale 1000 (n = 3000 records)
			const finalError = errors[errors.length - 1];
			expect(finalError).toBeLessThan(0.01);
		});
	});

	describe("2. K-Anonymity Auto-Release Rules", () => {
		it("should BLOCK nesting and keys > 3 when dataset size < 10", async () => {
			const smallAccounts = generateBankDataset(1); // n = 3 records
			server.setSandboxData(smallAccounts);

			// Test 2a: Try to return a nested object (blocked for n < 10)
			const nestedResult = await server.callTool({
				name: "analyze_k_anon",
				arguments: {
					payload: `@LIOP{wasi_v1,K_Anon_Small_Nested}
return { info: { count: 3 } };
@END`,
				},
			});
			expect(nestedResult.isError).toBe(true);
			expect(nestedResult.content[0].text).toContain("Aggregation-First");

			// Test 2b: Try to return 4 flat keys (blocked for n < 10)
			const keysResult = await server.callTool({
				name: "analyze_k_anon",
				arguments: {
					payload: `@LIOP{wasi_v1,K_Anon_Small_Keys}
return { a: 1, b: 2, c: 3, d: 4 };
@END`,
				},
			});
			expect(keysResult.isError).toBe(true);
			expect(keysResult.content[0].text).toContain("Aggregation-First");
		});

		it("should ALLOW nesting and keys > 3 (up to 10) when dataset size >= 10", async () => {
			const largeAccounts = generateBankDataset(10); // n = 30 records
			server.setSandboxData(largeAccounts);

			// Test 2c: Nested object succeeds for n >= 10
			const nestedResult = await server.callTool({
				name: "analyze_k_anon",
				arguments: {
					payload: `@LIOP{wasi_v1,K_Anon_Large_Nested}
return { info: { count: 30, valid: true } };
@END`,
				},
			});
			expect(nestedResult.isError).toBeFalsy();

			// Test 2d: Returning 6 keys succeeds for n >= 10
			const keysResult = await server.callTool({
				name: "analyze_k_anon",
				arguments: {
					payload: `@LIOP{wasi_v1,K_Anon_Large_Keys}
return { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 };
@END`,
				},
			});
			expect(keysResult.isError).toBeFalsy();
		});
	});

	describe("3. WASI CPU Fuel Limits & Timeout Protection", () => {
		it("should report normalized fuel in the receipt for standard operations", async () => {
			server.setSandboxData(generateBankDataset(1));

			const result = await server.callTool({
				name: "analyze_k_anon",
				arguments: {
					payload: `@LIOP{wasi_v1,Fuel_Normal}
let sum = 0;
for (let i = 0; i < 10000; i++) { sum += i; }
return { sum };
@END`,
					},
			});

			expect(result.isError).toBeFalsy();
			const parsed = JSON.parse(result.content[0].text!);
			
			// Decode the ZK-Receipt to read fuel in the journal
			const receiptBuf = Buffer.from(parsed.zk_receipt, "base64");
			const journalLen = receiptBuf.readUInt16BE(1);
			const journalBuf = receiptBuf.subarray(3, 3 + journalLen);
			const journal = JSON.parse(journalBuf.toString("utf-8"));

			expect(journal.fuel).toBeDefined();
			// Fuel should be in multiples of 100
			expect(journal.fuel % 100).toBe(0);
		});

		it("should terminate and return error when CPU fuel limit or timeout is exceeded", async () => {
			server.setSandboxData(generateBankDataset(1));

			// Payload containing a CPU heavy loop that exceeds the fuel threshold (666.6ms)
			// uses complex math functions (sin/cos) to guarantee execution delay
			const result = await server.callTool({
				name: "analyze_k_anon",
				arguments: {
					payload: `@LIOP{wasi_v1,Fuel_Exhaustion}
let sum = 0;
for (let i = 0; i < 100000000; i++) {
	sum += Math.sin(i) * Math.cos(i);
}
return { total: 1 };
@END`,
				},
			});

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toMatch(/LIOP_RESOURCE_EXHAUSTED|Isolate Fault/);
		}, 15000); // 15-second timeout to allow the sandbox to hit the VM/fuel limit first
	});

	describe("4. Piscina Heap Worker OOM Containment", () => {
		let oomServer: LiopServer;

		beforeAll(() => {
			oomServer = new LiopServer(
				{ name: "OOM-Containment-Server", version: "1.0.0" },
				{
					workerPool: {
						maxHeapMb: 16, // Ultra-low heap memory limit to trigger crash instantly
						minThreads: 0,
						maxThreads: 1,
					},
				},
			);

			oomServer.tool(
				"oom_heavy_tool",
				"Tool that allocates heavy heap memory",
				{ payload: z.string() },
				async () => ({ content: [] }),
				{ enforceAggregationFirst: true },
			);
		});

		afterAll(async () => {
			await oomServer.close();
		});

		it("should fail gracefully when worker reaches OOM without crashing the server", async () => {
			oomServer.setSandboxData(generateBankDataset(1));

			// Payload designed to trigger OOM (allocates a huge array of big strings)
			const result = await oomServer.callTool({
				name: "oom_heavy_tool",
				arguments: {
					payload: `@LIOP{wasi_v1,Heap_Exhaustion}
const chunks = [];
for (let i = 0; i < 1000000; i++) {
	chunks.push(new Array(10000).fill("A").join(""));
}
return { length: chunks.length };
@END`,
				},
			});

			// Worker terminates because it exceeds 16MB. The server intercepts it.
			expect(result.isError).toBe(true);
			expect(result.content[0].text).toMatch(/Worker terminated|Isolate Fault|heap/i);

			// SEC-PROOF: Subsequent valid query MUST succeed on the same server,
			// verifying worker pool thread recovery.
			// Return a non-numeric property (success: true) to bypass Differential Privacy noise
			// on small datasets (< 10).
			const recoveryResult = await oomServer.callTool({
				name: "oom_heavy_tool",
				arguments: {
					payload: `@LIOP{wasi_v1,Heap_Recovery}
return { success: true };
@END`,
				},
			});

			expect(recoveryResult.isError).toBeFalsy();
			const parsed = JSON.parse(recoveryResult.content[0].text!);
			expect(parsed.computation_result.success).toBe(true);
		});
	});
});
