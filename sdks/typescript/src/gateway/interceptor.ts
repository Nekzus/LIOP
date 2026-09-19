// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import type { AuthInfo } from "../security/jwt-validator.js";
import type { McpRequest } from "../types.js";
import { log } from "../utils/logger.js";

/**
 * Verdict returned by a GatewayInterceptor function.
 * Determines whether the request is admitted into the routing pipeline.
 */
export interface GatewayAdmissionResult {
	/** true = request passes to router.dispatch(). false = rejected at perimeter. */
	allowed: boolean;
	/** Human-readable denial reason (included in JSON-RPC error response). */
	reason?: string;
	/** Custom JSON-RPC error code. Defaults to -32099 when omitted. */
	errorCode?: number;
	/** Opaque metadata bag for telemetry or audit logging downstream. */
	metadata?: Record<string, unknown>;
}

/**
 * Contextual information passed to the interceptor alongside the request.
 * Contains only non-sensitive, non-cryptographic perimeter metadata.
 */
export interface GatewayInterceptorContext {
	/** Originating client IP address (post-JWT, post-rate-limit). */
	clientIp: string;
	/** Authenticated identity from JWT validation, or null for unauthenticated gateways. */
	authInfo: AuthInfo | null;
	/** Transport protocol that received this request. */
	protocol: "http1" | "http2";
	/** Abort signal that fires when the interceptor timeout expires. */
	signal: AbortSignal;
}

/**
 * Technology-agnostic admission function.
 * The developer implements this in their application code, connecting
 * any decision engine (TypeSafe Jev, ONNX, regex rules, custom logic).
 *
 * Receives a frozen deep-clone of the request to prevent prototype pollution.
 * May return synchronously or asynchronously.
 */
export type GatewayInterceptor = (
	request: Readonly<McpRequest>,
	context: GatewayInterceptorContext,
) => Promise<GatewayAdmissionResult> | GatewayAdmissionResult;

/**
 * Configuration for the perimeter admission hook.
 */
export interface GatewayInterceptorOptions {
	/** The interceptor function. When undefined, the gateway skips interception entirely. */
	interceptor?: GatewayInterceptor;
	/** Maximum milliseconds to wait for the interceptor. Default: 2500. */
	timeoutMs?: number;
	/** Behavior when the interceptor throws or times out. Default: "closed". */
	failMode?: "closed" | "open";
}

const DEFAULT_TIMEOUT_MS = 2500;

/**
 * Executes the interceptor with timeout enforcement via AbortSignal.timeout(),
 * prototype pollution isolation via structuredClone + Object.freeze,
 * and fail-mode policy enforcement.
 *
 * AbortSignal.timeout() is stable since Node.js 17.3 (available in Node.js 20+ LTS).
 * Promise.race guarantees the gateway never blocks beyond timeoutMs even if the
 * interceptor ignores the signal.
 */
export async function executeGatewayInterceptor(
	request: McpRequest,
	context: Omit<GatewayInterceptorContext, "signal">,
	options: Required<Pick<GatewayInterceptorOptions, "interceptor">> &
		GatewayInterceptorOptions,
): Promise<GatewayAdmissionResult> {
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const failMode = options.failMode ?? "closed";
	const signal = AbortSignal.timeout(timeoutMs);

	// structuredClone severs all prototype chain references (deep copy).
	// Object.freeze blocks top-level mutation on the clone.
	// Even if the interceptor mutates nested properties, the original
	// jsonRequest in the gateway scope remains untouched.
	const frozenRequest = Object.freeze(structuredClone(request));

	let onAbortListener: (() => void) | undefined;
	const abortPromise = new Promise<never>((_, reject) => {
		onAbortListener = () => reject(signal.reason);
		signal.addEventListener("abort", onAbortListener, { once: true });
	});

	try {
		const result = await Promise.race([
			Promise.resolve(
				options.interceptor(frozenRequest, { ...context, signal }),
			),
			abortPromise,
		]);
		return result;
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		if (failMode === "open") {
			log.warn(
				`[LIOP-Gateway] Interceptor error (fail-open, allowing request): ${errorMessage}`,
			);
			return {
				allowed: true,
				metadata: { interceptorError: errorMessage, failMode: "open" },
			};
		}

		// fail-closed: reject with error response
		log.error(
			`[LIOP-Gateway] Interceptor error (fail-closed, rejecting request): ${errorMessage}`,
		);
		return {
			allowed: false,
			reason: `Interceptor unavailable: ${errorMessage}`,
			errorCode: -32098,
			metadata: { interceptorError: errorMessage, failMode: "closed" },
		};
	} finally {
		if (onAbortListener) {
			signal.removeEventListener("abort", onAbortListener);
		}
	}
}
