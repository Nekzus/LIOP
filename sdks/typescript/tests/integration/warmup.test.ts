import { describe, expect, it } from "vitest";
import { LiopServer } from "../../src/server/index.js";
import { LiopVerifier } from "../../src/crypto/verifier.js";

describe("LIOP Piscina Pool Warm-up Tests", () => {
	it("should initialize LiopServer and trigger logic-execution warmup on its worker pool", async () => {
		const server = new LiopServer(
			{ name: "Warmup-Server", version: "1.0.0" },
			{
				workerPool: {
					minThreads: 2,
					maxThreads: 4,
				},
			},
		);

		// Assert that the pool is initialized
		const pool = (server as any).workerPool;
		expect(pool).toBeDefined();

		// Wait slightly to let the background warmup tasks run/complete
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check the thread pool characteristics
		expect(pool.minThreads).toBe(2);
		expect(pool.maxThreads).toBe(4);

		// Close server resources cleanly
		await server.close();
	});

	it("should initialize LiopVerifier and trigger zk-verifier warmup on its worker pool", async () => {
		const verifier = new LiopVerifier();

		// Forcing zkPool instantiation since it is lazily created on getZkPool()
		const pool = (verifier as any).getZkPool();
		expect(pool).toBeDefined();

		// Wait slightly to let the background warmup task run/complete
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check ZK pool limits
		expect(pool.minThreads).toBe(1);
		expect(pool.maxThreads).toBe(2);

		// Close verification pool resources cleanly
		await pool.destroy();
	});
});
