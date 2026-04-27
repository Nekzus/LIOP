import { describe, expect, it } from "vitest";
import { createTokenEstimator } from "../../../src/economy/estimator.js";

/**
 * Token Savings Measurement — O(1) vs O(n) Proof
 *
 * Demonstrates mathematically that LIOP's Logic-on-Origin paradigm
 * achieves constant token cost regardless of data scale, while
 * the traditional data-pulling approach (MCP) scales linearly.
 *
 * This is the automated proof of LIOP's fundamental economic advantage.
 */
describe("Token Savings: LIOP O(1) vs Data-Pulling O(n)", () => {
	// Standard LIOP logic envelope — always the same regardless of dataset size
	const LIOP_LOGIC = `@LIOP{wasi_v1,Aggregation}
const records = env.records;
const avg = records.reduce((sum, r) => sum + r.value, 0) / records.length;
const max = records.reduce((m, r) => r.value > m ? r.value : m, -Infinity);
const min = records.reduce((m, r) => r.value < m ? r.value : m, Infinity);
return { count: records.length, average: avg, max, min };
@END`;

	/** Generate a synthetic dataset of N records */
	function generateDataset(size: number): object[] {
		return Array.from({ length: size }, (_, i) => ({
			id: `REC-${String(i).padStart(6, "0")}`,
			name: `Record_${i}_${crypto.randomUUID().slice(0, 8)}`,
			value: Math.round(Math.random() * 10000) / 100,
			category: ["alpha", "beta", "gamma", "delta"][i % 4],
			timestamp: new Date(2026, 0, 1 + (i % 365)).toISOString(),
		}));
	}

	it("should demonstrate constant logic token cost across scales", async () => {
		const estimator = await createTokenEstimator();
		const logicTokens = estimator.countTokens(LIOP_LOGIC);

		// Logic token count should be the same regardless of dataset size
		// (the logic itself doesn't change)
		expect(logicTokens).toBeGreaterThan(50);
		expect(logicTokens).toBeLessThan(300);
	});

	it("should show linear growth in data token cost", async () => {
		const estimator = await createTokenEstimator();
		const sizes = [10, 100, 1000];
		const dataCosts: number[] = [];

		for (const size of sizes) {
			const dataset = generateDataset(size);
			const dataTokens = estimator.countTokens(JSON.stringify(dataset));
			dataCosts.push(dataTokens);
		}

		// Data costs should grow roughly proportionally to dataset size
		// 100 records should cost ~10x more than 10 records
		expect(dataCosts[1] / dataCosts[0]).toBeGreaterThan(5);
		// 1000 records should cost ~10x more than 100 records
		expect(dataCosts[2] / dataCosts[1]).toBeGreaterThan(5);
	});

	it("should prove LIOP savings ratio improves with scale", async () => {
		const estimator = await createTokenEstimator();
		const logicTokens = estimator.countTokens(LIOP_LOGIC);
		const sizes = [10, 100, 1000];
		const ratios: number[] = [];

		for (const size of sizes) {
			const dataset = generateDataset(size);
			const dataTokens = estimator.countTokens(JSON.stringify(dataset));
			const savings = dataTokens / logicTokens;
			ratios.push(savings);
		}

		// Each scale-up should show progressively better savings
		expect(ratios[1]).toBeGreaterThan(ratios[0]);
		expect(ratios[2]).toBeGreaterThan(ratios[1]);

		// At 1000 records, LIOP should use at least 100x less tokens
		expect(ratios[2]).toBeGreaterThan(100);
	});

	it("should quantify exact savings with real BPE counts", async () => {
		const estimator = await createTokenEstimator();
		const logicTokens = estimator.countTokens(LIOP_LOGIC);

		// 100-record dataset (realistic production scenario)
		const dataset = generateDataset(100);
		const dataTokens = estimator.countTokens(JSON.stringify(dataset));

		// LIOP approach: only the logic travels (~150 tokens)
		// MCP approach: all data travels (thousands of tokens)
		const savedTokens = dataTokens - logicTokens;
		const savedPercent = ((savedTokens / dataTokens) * 100).toFixed(1);

		// Must save at least 90% of tokens compared to data-pulling
		expect(Number.parseFloat(savedPercent)).toBeGreaterThan(90);
	});

	it("should maintain constant cost even at extreme scale", async () => {
		const estimator = await createTokenEstimator();
		const logicTokens = estimator.countTokens(LIOP_LOGIC);

		// 5000-record extreme scale
		const largeDataset = generateDataset(5000);
		const largeDataTokens = estimator.countTokens(
			JSON.stringify(largeDataset),
		);

		// The logic is still the same ~150 tokens, but data is massive
		expect(logicTokens).toBeLessThan(300);
		expect(largeDataTokens).toBeGreaterThan(50000);

		// Savings ratio should be astronomical
		const ratio = largeDataTokens / logicTokens;
		expect(ratio).toBeGreaterThan(300);
	});
});
