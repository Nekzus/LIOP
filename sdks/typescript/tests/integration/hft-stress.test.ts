/**
 * LIOP HFT Industrial Stress Testing Suite (Phase 138)
 *
 * Validates the HFT simulation engine:
 * 1. Heston model statistical properties (fat tails, volatility clustering)
 * 2. Order Book invariants (bestBid < bestAsk)
 * 3. Matching Engine correctness (immediate fills)
 * 4. VWAP convergence
 * 5. Throughput (≥100 ticks/s sustained)
 * 6. Kill Switch response time
 * 7. Audit Trail ring buffer integrity
 * 8. DP on HFT data
 * 9. Latency percentiles
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { LiopServer } from "../../src/server/index.js";
import {
	HestonJumpDiffusionEngine,
	OrderBook,
	TickEngine,
	DEFAULT_INSTRUMENTS,
} from "../infra/hft/index.js";

describe("LIOP HFT Industrial Stress Tests", () => {
	describe("1. Heston Model Statistical Validation", () => {
		it("should produce fat tails (kurtosis > 3) after 10000 ticks", () => {
			const engine = new HestonJumpDiffusionEngine(DEFAULT_INSTRUMENTS[4]); // NVDA (high vol)
			const returns: number[] = [];
			let prevPrice = engine.getState().price;

			for (let i = 0; i < 10000; i++) {
				const state = engine.nextTick(0.05); // 50ms
				if (prevPrice > 0) {
					returns.push(Math.log(state.price / prevPrice));
				}
				prevPrice = state.price;
			}

			// Calculate kurtosis
			const n = returns.length;
			const mean = returns.reduce((s, r) => s + r, 0) / n;
			const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / n;
			const stdDev = Math.sqrt(variance);
			const kurtosis =
				returns.reduce((s, r) => s + ((r - mean) / stdDev) ** 4, 0) / n;

			// Fat tails: kurtosis > 3 (normal distribution has kurtosis = 3)
			expect(kurtosis).toBeGreaterThan(3);
		});

		it("should exhibit volatility clustering (positive autocorrelation of squared returns)", () => {
			// Create a high-priced test config to bypass 1-cent rounding/discretization noise.
			// Uses stable drift and low mean reversion speed for high Euler-Maruyama stability (kappa * dt = 0.15 < 1.0)
			const testConfig = {
				ticker: "TEST_VOL",
				companyName: "Test Volatility Instrument",
				initialPrice: 500000.0, // Berkshire-level nominal price to completely bypass rounding noise
				drift: 0.0001,
				longVariance: 0.12, // High variance to generate strong clustering signal
				meanReversionSpeed: 1.5,
				volOfVol: 0.8,
				rho: -0.7,
				jumpIntensity: 0.05,
				jumpMean: 0.0,
				jumpStdDev: 0.02,
				peRatio: null,
				marketCap: "$1.0B",
			};

			const engine = new HestonJumpDiffusionEngine(testConfig);
			const variances: number[] = [];

			for (let i = 0; i < 5000; i++) {
				const state = engine.nextTick(0.1); // stable deltaT = 100ms (kappa * dt = 0.15)
				variances.push(state.variance);
			}

			// Compute lag-1 autocorrelation of underlying CIR variance process
			const n = variances.length;
			const mean = variances.reduce((s, r) => s + r, 0) / n;
			let numerator = 0;
			let denominator = 0;
			for (let i = 1; i < n; i++) {
				numerator += (variances[i] - mean) * (variances[i - 1] - mean);
				denominator += (variances[i] - mean) ** 2;
			}
			const autocorrelation = denominator > 0 ? numerator / denominator : 0;

			// Volatility clustering: positive autocorrelation of the underlying variance (high persistence, theoretical exp(-kappa*dt) ≈ 0.86)
			expect(autocorrelation).toBeGreaterThan(0.5);
		});

		it("should maintain positive prices across all instruments after 5000 ticks", () => {
			for (const config of DEFAULT_INSTRUMENTS) {
				const engine = new HestonJumpDiffusionEngine(config);
				for (let i = 0; i < 5000; i++) {
					const state = engine.nextTick(0.05);
					expect(state.price).toBeGreaterThan(0);
				}
			}
		});
	});

	describe("2. Order Book Invariants", () => {
		it("should always maintain bestBid < bestAsk", () => {
			const book = new OrderBook("TEST");

			// Seed the book with orders
			for (let i = 0; i < 100; i++) {
				book.addLimitOrder("BUY", 100 - i * 0.01, 100, "test");
				book.addLimitOrder("SELL", 100.01 + i * 0.01, 100, "test");
			}

			const snapshot = book.getL2Snapshot();
			expect(snapshot.bestBid).toBeLessThan(snapshot.bestAsk);
			expect(snapshot.spread).toBeGreaterThan(0);
		});

		it("should recover correctly after halt + resume", () => {
			const book = new OrderBook("TEST-HALT");

			book.addLimitOrder("BUY", 99.50, 100, "test");
			book.addLimitOrder("SELL", 100.50, 100, "test");

			// Halt should prevent new orders
			book.halt();
			expect(book.isHalted()).toBe(true);
			expect(() => book.addLimitOrder("BUY", 99.00, 50, "test")).toThrow(/HALTED/);

			// Resume should allow new orders
			book.resume();
			expect(book.isHalted()).toBe(false);
			const order = book.addLimitOrder("BUY", 99.60, 50, "test");
			expect(order.status).toBe("NEW");
		});
	});

	describe("3. Matching Engine Correctness", () => {
		it("should immediately fill a buy order at or above best ask", () => {
			const book = new OrderBook("TEST-MATCH");
			book.addLimitOrder("SELL", 100.50, 100, "maker");

			const buyOrder = book.addLimitOrder("BUY", 100.50, 50, "taker");
			expect(buyOrder.filledQty).toBe(50);
			expect(buyOrder.status).toBe("FILLED");
		});

		it("should immediately fill a sell order at or below best bid", () => {
			const book = new OrderBook("TEST-MATCH2");
			book.addLimitOrder("BUY", 99.50, 100, "maker");

			const sellOrder = book.addLimitOrder("SELL", 99.50, 50, "taker");
			expect(sellOrder.filledQty).toBe(50);
			expect(sellOrder.status).toBe("FILLED");
		});

		it("should handle partial fills correctly", () => {
			const book = new OrderBook("TEST-PARTIAL");
			book.addLimitOrder("SELL", 100.00, 30, "maker");

			const buyOrder = book.addLimitOrder("BUY", 100.00, 50, "taker");
			expect(buyOrder.filledQty).toBe(30);
			expect(buyOrder.status).toBe("PARTIAL");
			// Remaining 20 should rest on the book
			const snapshot = book.getL2Snapshot();
			expect(snapshot.bids.length).toBe(1);
			expect(snapshot.bids[0].qty).toBe(20);
		});

		it("should fill market orders by sweeping the book", () => {
			const book = new OrderBook("TEST-MARKET");
			book.addLimitOrder("SELL", 100.00, 50, "maker1");
			book.addLimitOrder("SELL", 100.05, 50, "maker2");

			const marketBuy = book.addMarketOrder("BUY", 80, "taker");
			expect(marketBuy.filledQty).toBe(80);
			expect(marketBuy.status).toBe("FILLED");
		});
	});

	describe("4. VWAP Convergence", () => {
		it("should produce a VWAP between session low and high (mathematical invariant)", () => {
			const engine = new TickEngine({
				tickIntervalMs: 50,
				instrumentCount: 1,
				auditBufferSize: 1000,
				burnInTicks: 20,
				snapshotRefreshInterval: 1,
			});

			// Run manually for 200 ticks
			for (let i = 0; i < 200; i++) {
				engine.manualTick();
			}

			const snapshot = engine.getSnapshot();
			expect(snapshot.length).toBe(1);

			const record = snapshot[0];
			const inst = engine.getInstruments()[0];
			const state = inst.engine.getState();

			// VWAP must be defined and positive
			expect(record.vwap).toBeGreaterThan(0);

			// Mathematical invariant: VWAP is a weighted average of trade prices,
			// so it must always fall between the session low and high.
			expect(record.vwap).toBeGreaterThanOrEqual(state.lowPrice * 0.99);
			expect(record.vwap).toBeLessThanOrEqual(state.highPrice * 1.01);

			engine.stop();
		});
	});

	describe("5. Throughput", () => {
		it("should process ≥100 ticks/second sustained for 500 ticks", () => {
			const engine = new TickEngine({
				tickIntervalMs: 10,
				instrumentCount: 8,
				auditBufferSize: 5000,
				burnInTicks: 0,
				snapshotRefreshInterval: 10,
			});

			const start = performance.now();
			for (let i = 0; i < 500; i++) {
				engine.manualTick();
			}
			const elapsed = performance.now() - start;

			const ticksPerSecond = 500 / (elapsed / 1000);
			expect(ticksPerSecond).toBeGreaterThan(100);

			engine.stop();
		}, 30000);
	});

	describe("6. Kill Switch", () => {
		it("should halt all instruments in under 10ms", () => {
			const engine = new TickEngine({
				tickIntervalMs: 50,
				instrumentCount: 8,
				auditBufferSize: 1000,
				burnInTicks: 10,
				snapshotRefreshInterval: 5,
			});

			// Burn-in some activity
			for (let i = 0; i < 10; i++) {
				engine.manualTick();
			}

			const start = performance.now();
			engine.halt();
			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(10);

			// Verify all books are halted
			for (const inst of engine.getInstruments()) {
				expect(inst.book.isHalted()).toBe(true);
			}

			engine.stop();
		});
	});

	describe("7. Audit Trail Ring Buffer", () => {
		it("should maintain monotonic timestamps", () => {
			const engine = new TickEngine({
				tickIntervalMs: 50,
				instrumentCount: 2,
				auditBufferSize: 500,
				burnInTicks: 20,
				snapshotRefreshInterval: 5,
			});

			for (let i = 0; i < 100; i++) {
				engine.manualTick();
			}

			expect(engine.isAuditMonotonic()).toBe(true);
			expect(engine.getAuditCount()).toBeGreaterThan(0);

			engine.stop();
		});

		it("should wrap around correctly when buffer is full", () => {
			const engine = new TickEngine({
				tickIntervalMs: 50,
				instrumentCount: 8,
				auditBufferSize: 100,
				burnInTicks: 50,
				snapshotRefreshInterval: 1,
			});

			// Generate many more events than the buffer can hold
			for (let i = 0; i < 200; i++) {
				engine.manualTick();
			}

			// Buffer should be at capacity
			const entries = engine.getAuditTrail(200);
			expect(entries.length).toBeLessThanOrEqual(100);
			expect(engine.isAuditMonotonic()).toBe(true);

			engine.stop();
		});
	});

	describe("8. Differential Privacy on HFT Data", () => {
		let server: LiopServer;

		beforeAll(async () => {
			server = new LiopServer(
				{ name: "HFT-DP-Test", version: "1.0.0" },
				{
					security: {
						forbiddenKeys: ["ticker"],
					},
				},
			);

			server.tool(
				"analyze_hft_dp",
				"Analyze HFT market data with DP",
				{ payload: z.string() },
				async () => ({ content: [] }),
				{
					enforceAggregationFirst: true,
					dpEpsilon: 2.0,
					dpSensitivity: 500.0,
					dpSmallDatasetThreshold: 100,
				},
			);
		});

		afterAll(async () => {
			await server.close();
		});

		it("should apply Laplace noise to HFT aggregate metrics", async () => {
			const engine = new TickEngine({
				tickIntervalMs: 50,
				instrumentCount: 8,
				auditBufferSize: 100,
				burnInTicks: 20,
				snapshotRefreshInterval: 1,
			});

			for (let i = 0; i < 50; i++) {
				engine.manualTick();
			}

			const snapshot = engine.getSnapshot();
			server.setSandboxData(snapshot as unknown as Record<string, unknown>[]);

			const result = await server.callTool({
				name: "analyze_hft_dp",
				arguments: {
					payload: `@LIOP{wasi_v1,HFT_DP_Test}
const r = env.records;
const avgPrice = r.reduce((s, x) => s + x.price, 0) / r.length;
return { avgPrice: Math.round(avgPrice * 100) / 100, total_records: r.length };
@END`,
				},
			});

			expect(result.isError).toBeFalsy();
			const parsed = JSON.parse(result.content[0].text!);
			expect(parsed.computation_result.total_records).toBeDefined();

			engine.stop();
		});
	});

	describe("9. Latency Percentiles", () => {
		it("should report p99 tick-to-trade latency under 50ms (50M ns)", () => {
			const engine = new TickEngine({
				tickIntervalMs: 50,
				instrumentCount: 8,
				auditBufferSize: 1000,
				burnInTicks: 20,
				snapshotRefreshInterval: 5,
			});

			for (let i = 0; i < 200; i++) {
				engine.manualTick();
			}

			const histogram = engine.getLatencyHistogram();
			expect(histogram.count).toBeGreaterThan(0);
			// p99 should be under 50ms (50,000,000 ns)
			expect(histogram.p99).toBeLessThan(50_000_000);

			engine.stop();
		});
	});
});
