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
});
