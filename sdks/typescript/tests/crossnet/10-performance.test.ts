import { describe, expect, it } from "vitest";
import {
	callTool,
	extractText,
	findToolByBaseName,
	liopEnvelope,
	mcpCall,
} from "./_helpers.js";

async function measure<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
	const start = Date.now();
	const value = await fn();
	return { value, ms: Date.now() - start };
}

describe("10-performance: protocol-level latency and throughput signals", () => {
	it("should keep tools/list p95 under a practical integration threshold", async () => {
		const samples: number[] = [];
		for (let i = 0; i < 10; i++) {
			const { value, ms } = await measure(() => mcpCall("tools/list", {}, 3000 + i));
			expect(value.error).toBeUndefined();
			samples.push(ms);
		}

		samples.sort((a, b) => a - b);
		const p95 = samples[Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1)];
		// Threshold intentionally conservative for containerized integration environments.
		expect(p95).toBeLessThan(5_000);
	});

	it("should sustain concurrent remote calls without systemic timeout failures", async () => {
		const tool = await findToolByBaseName("Analyze_Synthetic_Market_Data");
		const payload = liopEnvelope(
			`
const records = env.records;
return { total: records.length, maxPrice: Math.max(...records.map((r) => r.price)) };
`,
			"PerfConcurrent",
		);

		const batch = await Promise.all(
			Array.from({ length: 6 }, () => callTool(tool, payload)),
		);
		const failures = batch.filter((r) => r?.isError === true);
		expect(failures.length).toBe(0);
		for (const result of batch) {
			expect(extractText(result)).toContain("computation_result");
		}
	});
});

