// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import {
	executeGatewayInterceptor,
	type GatewayAdmissionResult,
	type GatewayInterceptorContext,
	type GatewayInterceptorOptions,
} from "../../../src/gateway/interceptor.js";
import type { McpRequest } from "../../../src/types.js";

const MOCK_REQUEST: McpRequest = {
	jsonrpc: "2.0",
	method: "tools/call",
	id: "test-1",
	params: { name: "Analyze_HFT_Data", arguments: { threshold: 0.8 } },
};

const MOCK_CONTEXT: Omit<GatewayInterceptorContext, "signal"> = {
	clientIp: "192.168.1.50",
	authInfo: {
		token: "mock-jwt",
		clientId: "test-client",
		scopes: ["tools:call"],
	},
	protocol: "http1",
};

describe("GatewayInterceptor - executeGatewayInterceptor()", () => {
	it("should allow request when interceptor returns { allowed: true }", async () => {
		const interceptor = vi.fn().mockResolvedValue({ allowed: true });
		const result = await executeGatewayInterceptor(MOCK_REQUEST, MOCK_CONTEXT, {
			interceptor,
		});
		expect(result.allowed).toBe(true);
		expect(interceptor).toHaveBeenCalledOnce();
	});

	it("should reject request when interceptor returns { allowed: false }", async () => {
		const interceptor = vi.fn().mockResolvedValue({
			allowed: false,
			reason: "Anomalous payload detected",
			errorCode: -32050,
		});
		const result = await executeGatewayInterceptor(MOCK_REQUEST, MOCK_CONTEXT, {
			interceptor,
		});
		expect(result.allowed).toBe(false);
		expect(result.reason).toBe("Anomalous payload detected");
		expect(result.errorCode).toBe(-32050);
	});

	it("should support synchronous interceptor (non-Promise return)", async () => {
		const interceptor = vi.fn().mockReturnValue({ allowed: true });
		const result = await executeGatewayInterceptor(MOCK_REQUEST, MOCK_CONTEXT, {
			interceptor,
		});
		expect(result.allowed).toBe(true);
	});

	it("should reject with fail-closed when interceptor throws", async () => {
		const interceptor = vi.fn().mockRejectedValue(new Error("Network down"));
		const result = await executeGatewayInterceptor(MOCK_REQUEST, MOCK_CONTEXT, {
			interceptor,
			failMode: "closed",
		});
		expect(result.allowed).toBe(false);
		expect(result.reason).toContain("Network down");
		expect(result.errorCode).toBe(-32098);
	});

	it("should allow with fail-open when interceptor throws", async () => {
		const interceptor = vi.fn().mockRejectedValue(new Error("API timeout"));
		const result = await executeGatewayInterceptor(MOCK_REQUEST, MOCK_CONTEXT, {
			interceptor,
			failMode: "open",
		});
		expect(result.allowed).toBe(true);
		expect(result.metadata?.interceptorError).toBe("API timeout");
	});

	it("should timeout and reject (fail-closed) when interceptor exceeds timeoutMs", async () => {
		const interceptor = vi.fn().mockImplementation(
			() =>
				new Promise((resolve) =>
					setTimeout(() => resolve({ allowed: true }), 5000),
				),
		);
		const result = await executeGatewayInterceptor(MOCK_REQUEST, MOCK_CONTEXT, {
			interceptor,
			timeoutMs: 100,
			failMode: "closed",
		});
		expect(result.allowed).toBe(false);
		expect(result.reason).toContain("Interceptor unavailable");
	});

	it("should prevent prototype pollution: mutations on frozen clone do not affect original", async () => {
		const originalParams = MOCK_REQUEST.params;
		const interceptor = vi.fn().mockImplementation((req: McpRequest) => {
			// Attempt top-level mutation (blocked by Object.freeze in strict mode)
			try {
				(req as unknown as Record<string, unknown>).method = "hacked";
			} catch {
				// Expected: TypeError in strict mode
			}
			return { allowed: true };
		});
		await executeGatewayInterceptor(MOCK_REQUEST, MOCK_CONTEXT, {
			interceptor,
		});
		// Original request untouched (structuredClone isolation)
		expect(MOCK_REQUEST.method).toBe("tools/call");
		expect(MOCK_REQUEST.params).toBe(originalParams);
	});

	it("should pass AbortSignal in context for cooperative cancellation", async () => {
		let receivedSignal: AbortSignal | null = null;
		const interceptor = vi.fn().mockImplementation(
			(_req: McpRequest, ctx: GatewayInterceptorContext) => {
				receivedSignal = ctx.signal;
				return { allowed: true };
			},
		);
		await executeGatewayInterceptor(MOCK_REQUEST, MOCK_CONTEXT, {
			interceptor,
			timeoutMs: 5000,
		});
		expect(receivedSignal).not.toBeNull();
		expect(receivedSignal).toHaveProperty("aborted");
	});
});
