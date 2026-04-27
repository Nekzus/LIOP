import { describe, it, expect } from "vitest";
import {
	RealTokenEstimator,
	HeuristicTokenEstimator,
	createTokenEstimator,
	createSyncTokenEstimator,
} from "../../../src/economy/estimator.js";

describe("TokenEstimator", () => {
	describe("RealTokenEstimator (o200k_base)", () => {
		it("should count tokens accurately for simple English text", async () => {
			const estimator = await createTokenEstimator();
			expect(estimator.name).toBe("o200k_base");

			const count = estimator.countTokens("Hello, world!");
			// o200k_base tokenizes "Hello, world!" into ~4 tokens
			expect(count).toBeGreaterThan(0);
			expect(count).toBeLessThan(10);
		});

		it("should return 0 for empty string", async () => {
			const estimator = await createTokenEstimator();
			expect(estimator.countTokens("")).toBe(0);
		});

		it("should return consistent results for same input", async () => {
			const estimator = await createTokenEstimator();
			const text =
				"The quick brown fox jumps over the lazy dog";
			const count1 = estimator.countTokens(text);
			const count2 = estimator.countTokens(text);
			expect(count1).toBe(count2);
		});

		it("should handle unicode/multilingual text", async () => {
			const estimator = await createTokenEstimator();
			const unicode = "こんにちは世界 🌍 مرحبا";
			const count = estimator.countTokens(unicode);
			expect(count).toBeGreaterThan(0);
		});

		it("should handle large JSON payloads", async () => {
			const estimator = await createTokenEstimator();
			const payload = JSON.stringify({
				tools: Array.from({ length: 50 }, (_, i) => ({
					name: `tool_${i}`,
					description: `Description for tool number ${i}`,
					inputSchema: {
						type: "object",
						properties: { query: { type: "string" } },
					},
				})),
			});
			const count = estimator.countTokens(payload);
			expect(count).toBeGreaterThan(100);
		});
	});

	describe("HeuristicTokenEstimator", () => {
		it("should estimate using chars/4 formula", () => {
			const estimator = new HeuristicTokenEstimator();
			expect(estimator.name).toBe("heuristic (chars/4)");
			// 12 chars -> ceil(12/4) = 3
			expect(estimator.countTokens("Hello World!")).toBe(3);
		});

		it("should return 0 for empty string", () => {
			const estimator = new HeuristicTokenEstimator();
			expect(estimator.countTokens("")).toBe(0);
		});

		it("should ceil the result", () => {
			const estimator = new HeuristicTokenEstimator();
			// 5 chars -> ceil(5/4) = 2
			expect(estimator.countTokens("Hello")).toBe(2);
		});
	});

	describe("createSyncTokenEstimator", () => {
		it("should return HeuristicTokenEstimator immediately", () => {
			const estimator = createSyncTokenEstimator();
			expect(estimator.name).toBe("heuristic (chars/4)");
		});
	});

	describe("createTokenEstimator (async factory)", () => {
		it("should return RealTokenEstimator when gpt-tokenizer is available", async () => {
			const estimator = await createTokenEstimator();
			expect(estimator).toBeInstanceOf(RealTokenEstimator);
			expect(estimator.name).toBe("o200k_base");
		});
	});

	describe("Advanced Edge Cases", () => {
		it("should produce different results between heuristic and real estimator", async () => {
			const heuristic = new HeuristicTokenEstimator();
			const real = await createTokenEstimator();

			// JSON with repetitive structure — BPE and chars/4 should differ
			const json = JSON.stringify({
				records: Array.from({ length: 20 }, (_, i) => ({
					id: i,
					name: `Record ${i}`,
				})),
			});

			const heuristicCount = heuristic.countTokens(json);
			const realCount = real.countTokens(json);

			// Both should be positive but not equal
			expect(heuristicCount).toBeGreaterThan(0);
			expect(realCount).toBeGreaterThan(0);
			expect(realCount).not.toBe(heuristicCount);
		});

		it("should keep cross-estimator results in same order of magnitude for English text", async () => {
			const heuristic = new HeuristicTokenEstimator();
			const real = await createTokenEstimator();

			const text =
				"The quick brown fox jumps over the lazy dog. This is a test sentence for token estimation.";

			const heuristicCount = heuristic.countTokens(text);
			const realCount = real.countTokens(text);

			// Both should be within 3x of each other for standard English text
			const ratio = Math.max(heuristicCount, realCount) / Math.min(heuristicCount, realCount);
			expect(ratio).toBeLessThan(3);
		});

		it("should count tokens for large payload within 50ms", async () => {
			const real = await createTokenEstimator();
			const largePayload = JSON.stringify(
				Array.from({ length: 500 }, (_, i) => ({
					id: `REC-${i}`,
					description: `This is record number ${i} with some descriptive text for testing performance`,
					value: Math.random() * 1000,
				})),
			);

			const start = performance.now();
			const count = real.countTokens(largePayload);
			const elapsed = performance.now() - start;

			expect(count).toBeGreaterThan(1000);
			expect(elapsed).toBeLessThan(50);
		});

		it("should handle code and SQL content correctly", async () => {
			const real = await createTokenEstimator();

			const code = `function analyze(records) {
  const result = records.reduce((acc, r) => {
    acc.count++;
    acc.sum += r.value;
    return acc;
  }, { count: 0, sum: 0 });
  return { average: result.sum / result.count };
}`;
			const codeTokens = real.countTokens(code);
			expect(codeTokens).toBeGreaterThan(20);

			const sql = "SELECT COUNT(*), AVG(value) FROM records WHERE category = 'alpha' GROUP BY region";
			const sqlTokens = real.countTokens(sql);
			expect(sqlTokens).toBeGreaterThan(5);
		});

		it("should handle JSON with escape sequences", async () => {
			const real = await createTokenEstimator();
			const escaped = '{"path": "C:\\\\Users\\\\test", "quote": "\\"hello\\"", "newline": "line1\\nline2"}';
			const count = real.countTokens(escaped);
			expect(count).toBeGreaterThan(0);
		});
	});
});
