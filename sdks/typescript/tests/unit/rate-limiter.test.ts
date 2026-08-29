import { describe, expect, it } from "vitest";
import { InMemoryRateLimiter } from "../../src/gateway/rate-limiter.js";

describe("InMemoryRateLimiter", () => {
	it("should allow requests within rate limit quota", () => {
		const limiter = new InMemoryRateLimiter({ windowMs: 10_000, maxRequests: 3 });

		const res1 = limiter.check("ip:127.0.0.1");
		expect(res1.allowed).toBe(true);
		expect(res1.remaining).toBe(2);

		const res2 = limiter.check("ip:127.0.0.1");
		expect(res2.allowed).toBe(true);
		expect(res2.remaining).toBe(1);

		const res3 = limiter.check("ip:127.0.0.1");
		expect(res3.allowed).toBe(true);
		expect(res3.remaining).toBe(0);

		// Exceed limit
		const res4 = limiter.check("ip:127.0.0.1");
		expect(res4.allowed).toBe(false);
		expect(res4.remaining).toBe(0);
		expect(res4.resetMs).toBeGreaterThan(0);

		limiter.close();
	});

	it("should track keys independently", () => {
		const limiter = new InMemoryRateLimiter({ windowMs: 10_000, maxRequests: 2 });

		expect(limiter.check("ip:1.1.1.1").allowed).toBe(true);
		expect(limiter.check("ip:1.1.1.1").allowed).toBe(true);
		expect(limiter.check("ip:1.1.1.1").allowed).toBe(false);

		// Different key should still have full quota
		const res2 = limiter.check("ip:2.2.2.2");
		expect(res2.allowed).toBe(true);
		expect(res2.remaining).toBe(1);

		limiter.close();
	});

	it("should reset bucket on explicit reset call", () => {
		const limiter = new InMemoryRateLimiter({ windowMs: 10_000, maxRequests: 1 });

		expect(limiter.check("client:alice").allowed).toBe(true);
		expect(limiter.check("client:alice").allowed).toBe(false);

		limiter.reset("client:alice");
		expect(limiter.check("client:alice").allowed).toBe(true);

		limiter.close();
	});
});
