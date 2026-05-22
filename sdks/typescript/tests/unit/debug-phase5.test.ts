import { describe, it, expect } from "vitest";
import { LiopServer } from "../../src/server/index.js";
import { z } from "zod";

describe("Debug Phase 5 - Legitimate Analytics", () => {
	it("should analyze why Phase 5 is blocked", async () => {
		const server = new LiopServer(
			{
				name: "SIMULATION-the-oracle-debug",
				version: "1.0.0",
				capabilities: { tools: {} },
			},
			{
				taxonomy: {
					domain: "📈 Market Data (INDUSTRIAL DEMO)",
					clearanceTier: 1,
					executionTypes: ["Open Endpoints"],
				},
			},
		);

		const marketTicks = [
			{ ticker: "NXS", companyName: "Nekzus Digital", price: 442.10, change: "+1.2%", volume: "1.2M", peRatio: 28.5, marketCap: "$42B" },
			{ ticker: "LIOP", companyName: "Protocol Foundries", price: 89.45, change: "+5.7%", volume: "850K", peRatio: null, marketCap: "$8.9B" },
			{ ticker: "WASM", companyName: "Sandbox Systems", price: 156.20, priceChange: "-0.4%", change: "-0.4%", volume: "2.1M", peRatio: 12.3, marketCap: "$15B" }
		];

		server.setSandboxData(marketTicks as unknown as Record<string, unknown>[]);

		const marketAggregatedOutputSchema = z
			.object({
				total: z.number().optional(),
				total_records: z.number().optional(),
				avgPrice: z.union([z.number(), z.string()]).optional(),
				avgPE: z.union([z.number(), z.string()]).optional(),
				positives: z.number().optional(),
				negatives: z.number().optional(),
				maxPrice: z.number().optional(),
				minPrice: z.number().optional(),
				columns: z.array(z.string()).optional(),
				clientPayload: z.string().optional(),
			})
			.catchall(z.number());

		server.tool(
			"Analyze_Synthetic_Market_Data",
			"Securely analyzes real-time market ticks.",
			{ payload: z.string() },
			async (_params) => {
				return { content: [] };
			},
			{
				enforceAggregationFirst: true,
				outputSchema: marketAggregatedOutputSchema,
				dpEpsilon: 4.0,
				dpSensitivity: 500.0,
				queryBudgetPerField: 10,
			},
		);

		const payload = `@LIOP{wasi_v1,Legitimate_Analytics}
const total = env.records.length; const sum = env.records.reduce((acc, r) => acc + r.price, 0); const gainers = env.records.filter(r => parseFloat(r.change) > 0).length; return { total_tickers: total, avg_price: sum / total, gainers: gainers };
@END`;

		// We execute the tool directly inside the server by calling executeInWorkerPool or callTool if we mock client
		const result = await (server as any).executeInWorkerPool({}, payload, "Analyze_Synthetic_Market_Data");
		console.log("DEBUG PHASE 5 RESULT:", JSON.stringify(result, null, 2));

		expect(result.isError).not.toBe(true);
	});
});
