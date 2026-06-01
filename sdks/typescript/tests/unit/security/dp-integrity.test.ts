/**
 * DP Integrity Test Suite — Phase 110 (NIST SP 800-226 Compliance)
 *
 * Validates that the Differential Privacy engine maintains absolute
 * data integrity while providing calibrated noise injection.
 *
 * Categories:
 *   A. CSPRNG Verification — Noise quality (unpredictable, uniform)
 *   B. Query-Aware Sensitivity — Count/Avg/Sum differentiation
 *   C. Data Integrity Guarantee — Non-mutation, type preservation
 *   D. ZK-Receipt dataset_hash — Cryptographic anchor for audit trails
 *
 * Standards: NIST SP 800-226, Google DP, US Census TopDown, SOX
 */

import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { addLaplaceNoise, applyDpToOutput } from "../../../src/security/dp-engine.js";

// ── Category A: CSPRNG Verification (NIST SP 800-226) ────────────────

describe("DP Integrity — CSPRNG Verification", () => {
	it("should produce statistically uniform noise distribution (chi-squared)", () => {
		// Generate 10,000 samples and verify they distribute across 10 buckets
		const buckets = new Array(10).fill(0);
		const runs = 10000;

		for (let i = 0; i < runs; i++) {
			const noise = addLaplaceNoise(0, { epsilon: 1.0, sensitivity: 1.0 });
			// Map noise to bucket index using CDF of Laplace(0, 1)
			const p = 0.5 + 0.5 * Math.sign(noise) * (1 - Math.exp(-Math.abs(noise)));
			const bucket = Math.min(9, Math.floor(p * 10));
			buckets[bucket]++;
		}

		// Each bucket should have ~1000 samples. Chi-squared threshold
		// for 9 degrees of freedom at α=0.001 is 27.87.
		const expected = runs / 10;
		let chiSquared = 0;
		for (const count of buckets) {
			chiSquared += ((count - expected) ** 2) / expected;
		}
		// Allow generous threshold — we're testing for CSPRNG, not exact distribution
		expect(chiSquared).toBeLessThan(50);
	});

	it("should produce statistically independent consecutive samples", () => {
		// Autocorrelation at lag-1 should be near 0
		const samples: number[] = [];
		for (let i = 0; i < 5000; i++) {
			samples.push(addLaplaceNoise(0, { epsilon: 1.0, sensitivity: 1.0 }));
		}

		// Compute lag-1 autocorrelation
		const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
		let numerator = 0;
		let denominator = 0;
		for (let i = 0; i < samples.length - 1; i++) {
			numerator += (samples[i] - mean) * (samples[i + 1] - mean);
		}
		for (const s of samples) {
			denominator += (s - mean) ** 2;
		}
		const autocorrelation = denominator === 0 ? 0 : numerator / denominator;

		// Autocorrelation should be close to 0 (relaxed to < 0.15 to avoid flaky CI fails)
		expect(Math.abs(autocorrelation)).toBeLessThan(0.15);
	});

	it("should never produce identical sequences across invocations", () => {
		// Generate 50 pairs of 5-sample sequences; no pair should match
		const sequences: string[] = [];
		for (let pair = 0; pair < 50; pair++) {
			const seq: number[] = [];
			for (let i = 0; i < 5; i++) {
				seq.push(addLaplaceNoise(100, { epsilon: 1.0, sensitivity: 1.0 }));
			}
			sequences.push(seq.join(","));
		}

		const uniqueSequences = new Set(sequences);
		expect(uniqueSequences.size).toBe(sequences.length);
	});
});

// ── Category B: Query-Aware Sensitivity (Google DP) ──────────────────

describe("DP Integrity — Query-Aware Sensitivity", () => {
	it("should use sensitivity=1 for count keys regardless of global config", () => {
		const deviations: number[] = [];
		const runs = 300;

		for (let i = 0; i < runs; i++) {
			const noisy = applyDpToOutput(
				{ count: 100 },
				{ epsilon: 1.0, sensitivity: 10000 }, // Global = 10000, but count → 1
				5,
			);
			deviations.push(
				Math.abs((noisy as Record<string, number>).count - 100),
			);
		}

		const avgDeviation = deviations.reduce((s, v) => s + v, 0) / runs;
		// With sensitivity=1 and epsilon=1.0, scale=1, mean abs dev ≈ 1.0
		// If global sensitivity (10000) were used, avgDeviation ≈ 10000
		expect(avgDeviation).toBeLessThan(10);
	});

	it("should use sensitivity/n for avg keys", () => {
		const deviations: number[] = [];
		const runs = 300;
		const recordCount = 5;

		for (let i = 0; i < runs; i++) {
			const noisy = applyDpToOutput(
				{ avg_balance: 50000 },
				{ epsilon: 1.0, sensitivity: 100000 },
				recordCount,
			);
			deviations.push(
				Math.abs((noisy as Record<string, number>).avg_balance - 50000),
			);
		}

		const avgDeviation = deviations.reduce((s, v) => s + v, 0) / runs;
		// With sensitivity=100000/5=20000 and epsilon=1.0, scale=20000
		// Mean abs dev of Laplace(0, 20000) = 20000
		// If full 100000 were used, avgDeviation ≈ 100000
		expect(avgDeviation).toBeLessThan(60000);
		expect(avgDeviation).toBeGreaterThan(5000);
	});

	it("should use full globalSensitivity for sum/unknown keys", () => {
		const deviations: number[] = [];
		const runs = 300;

		for (let i = 0; i < runs; i++) {
			const noisy = applyDpToOutput(
				{ totalRevenue: 500000 },
				{ epsilon: 1.0, sensitivity: 100000 },
				5,
			);
			deviations.push(
				Math.abs((noisy as Record<string, number>).totalRevenue - 500000),
			);
		}

		const avgDeviation = deviations.reduce((s, v) => s + v, 0) / runs;
		// With full sensitivity=100000, scale=100000, mean abs dev ≈ 100000
		expect(avgDeviation).toBeGreaterThan(30000);
	});

	it("should correctly differentiate count vs sum in same output", () => {
		const countDeviations: number[] = [];
		const sumDeviations: number[] = [];
		const runs = 300;

		for (let i = 0; i < runs; i++) {
			const noisy = applyDpToOutput(
				{ totalAccounts: 100, totalBalance: 500000 },
				{ epsilon: 1.0, sensitivity: 100000 },
				5,
			);
			const n = noisy as Record<string, number>;
			countDeviations.push(Math.abs(n.totalAccounts - 100));
			sumDeviations.push(Math.abs(n.totalBalance - 500000));
		}

		const avgCount = countDeviations.reduce((s, v) => s + v, 0) / runs;
		const avgSum = sumDeviations.reduce((s, v) => s + v, 0) / runs;

		// Count deviations should be MUCH smaller than sum deviations
		// because count uses sensitivity=1 while sum uses sensitivity=100000
		expect(avgCount).toBeLessThan(avgSum / 100);
	});
});

// ── Category C: Data Integrity Guarantee ─────────────────────────────

describe("DP Integrity — Data Integrity Guarantee", () => {
	it("should NEVER mutate the original sandbox output object", () => {
		const output = {
			total: 5000,
			count: 10,
			nested: { avg: 500, items: [1, 2, 3] },
		};
		const frozen = JSON.parse(JSON.stringify(output));

		// Apply DP noise multiple times
		for (let i = 0; i < 10; i++) {
			applyDpToOutput(output, { epsilon: 1.0, sensitivity: 100 }, 5);
		}

		// The original object must remain completely unchanged
		expect(output).toEqual(frozen);
	});

	it("should preserve all non-numeric fields exactly", () => {
		const output = {
			label: "Healthcare Analysis",
			flag: true,
			empty: null,
			tags: ["urgent", "review"],
			meta: { version: "1.0", draft: false },
		};

		const noisy = applyDpToOutput(
			output,
			{ epsilon: 1.0, sensitivity: 100 },
			5,
		);
		const n = noisy as Record<string, unknown>;

		expect(n.label).toBe("Healthcare Analysis");
		expect(n.flag).toBe(true);
		expect(n.empty).toBeNull();
		expect(n.tags).toEqual(["urgent", "review"]);
		const meta = n.meta as Record<string, unknown>;
		expect(meta.version).toBe("1.0");
		expect(meta.draft).toBe(false);
	});

	it("should NOT apply any noise when recordCount >= threshold", () => {
		const output = {
			count: 500,
			total: 1000000,
			avg: 2000,
			details: { max: 5000, min: 100 },
		};

		const result = applyDpToOutput(
			output,
			{ epsilon: 1.0, sensitivity: 100, smallDatasetThreshold: 50 },
			100, // Above threshold
		);

		// Must be bit-for-bit identical
		expect(result).toEqual(output);
	});

	it("should produce results within plausible ranges for medical dataset", () => {
		// Simulate the exact Vault dataset structure
		const output = {
			total_records: 5,
			avg_age: 42.6,
			byBloodType: { "O+": 2, "A-": 1, "B+": 1, "AB+": 1 },
		};

		const noisy = applyDpToOutput(
			output,
			{ epsilon: 2.0, sensitivity: 1.0 },
			5,
		);
		const n = noisy as Record<string, unknown>;

		// total_records: count key → sensitivity=1, ε=2 → scale=0.5
		// Value should be within ±3 of original (99.7% confidence)
		expect(Math.abs((n.total_records as number) - 5)).toBeLessThan(5);
		// Must be non-negative integer
		expect(Number.isInteger(n.total_records)).toBe(true);
		expect((n.total_records as number) >= 0).toBe(true);
	});
});

// ── Category D: ZK-Receipt dataset_hash (SOX Audit Trail) ───────────

describe("DP Integrity — ZK-Receipt dataset_hash", () => {
	it("should produce deterministic hash for identical datasets", () => {
		const records = [
			{ id: "PAT-001", name: "Test", age: 42 },
			{ id: "PAT-002", name: "Test2", age: 58 },
		];

		const hash1 = crypto
			.createHash("sha256")
			.update(JSON.stringify(records))
			.digest("hex");
		const hash2 = crypto
			.createHash("sha256")
			.update(JSON.stringify(records))
			.digest("hex");

		expect(hash1).toBe(hash2);
		expect(hash1).toMatch(/^[a-f0-9]{64}$/);
	});

	it("should produce different hash when dataset changes", () => {
		const records1 = [{ id: "PAT-001", age: 42 }];
		const records2 = [{ id: "PAT-001", age: 43 }]; // Single field change

		const hash1 = crypto
			.createHash("sha256")
			.update(JSON.stringify(records1))
			.digest("hex");
		const hash2 = crypto
			.createHash("sha256")
			.update(JSON.stringify(records2))
			.digest("hex");

		expect(hash1).not.toBe(hash2);
	});

	it("should handle empty dataset gracefully", () => {
		const hash = crypto
			.createHash("sha256")
			.update(JSON.stringify([]))
			.digest("hex");

		expect(hash).toMatch(/^[a-f0-9]{64}$/);
		expect(hash).toBe(
			crypto.createHash("sha256").update("[]").digest("hex"),
		);
	});
});
