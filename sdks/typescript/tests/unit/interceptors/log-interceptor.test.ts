// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LogEvent, LogInterceptor } from "../../../src/interceptors/log-interceptor.js";
import { LiopLogger, log } from "../../../src/utils/logger.js";

describe("LogInterceptor - LiopLogger integration", () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		log.setLevel("debug");
		log.setInterceptor(undefined);
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
		log.setInterceptor(undefined);
		log.setLevel("info");
	});

	it("1. should operate with zero overhead and emit to stderr when no interceptor is registered", () => {
		log.info("Hello world");
		expect(consoleErrorSpy).toHaveBeenCalledOnce();
		expect(consoleErrorSpy.mock.calls[0][0]).toContain("[INFO] Hello world");
	});

	it("2. should invoke synchronous interceptor with structured LogEvent", () => {
		const events: LogEvent[] = [];
		const interceptor: LogInterceptor = (event) => {
			events.push(event);
		};

		log.setInterceptor(interceptor);
		log.warn("Warning test", { detail: 123 });

		expect(events).toHaveLength(1);
		expect(events[0].level).toBe("warn");
		expect(events[0].message).toContain("[WARN] Warning test");
		expect(events[0].args).toEqual([{ detail: 123 }]);
		expect(events[0].timestamp).toBeDefined();
	});

	it("3. should not block log emission when interceptor is asynchronous", async () => {
		let resolved = false;
		const interceptor: LogInterceptor = async () => {
			await new Promise((r) => setTimeout(r, 50));
			resolved = true;
		};

		log.setInterceptor(interceptor);
		log.error("Async error test");

		// Synchronous log call returned immediately without waiting 50ms
		expect(resolved).toBe(false);
		expect(consoleErrorSpy).toHaveBeenCalledOnce();

		// Wait for async task to settle
		await new Promise((r) => setTimeout(r, 60));
		expect(resolved).toBe(true);
	});

	it("4. should catch synchronous interceptor exceptions without throwing to caller", () => {
		const faultyInterceptor: LogInterceptor = () => {
			throw new Error("Interceptor failure");
		};

		log.setInterceptor(faultyInterceptor);

		expect(() => {
			log.error("Safe error emission");
		}).not.toThrow();

		expect(consoleErrorSpy).toHaveBeenCalledOnce();
	});

	it("5. should catch asynchronous interceptor rejections without unhandled rejection", async () => {
		const rejectingInterceptor: LogInterceptor = async () => {
			throw new Error("Async failure");
		};

		log.setInterceptor(rejectingInterceptor);

		expect(() => {
			log.info("Safe async emission");
		}).not.toThrow();

		// Allow any microtasks to process
		await new Promise((r) => setTimeout(r, 10));
		expect(consoleErrorSpy).toHaveBeenCalledOnce();
	});

	it("6. should prevent infinite recursion when interceptor triggers logging", () => {
		let callCount = 0;
		const recursiveInterceptor: LogInterceptor = () => {
			callCount++;
			// This call inside interceptor must NOT trigger interceptor again
			log.info("Inner recursive log call");
		};

		log.setInterceptor(recursiveInterceptor);
		log.info("Outer log call");

		// Interceptor should only be invoked once for the outer call
		expect(callCount).toBe(1);
		// But console.error should have recorded both calls
		expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
	});

	it("7. should deliver an immutable LogEvent (Object.freeze)", () => {
		let interceptedEvent: LogEvent | null = null;
		const interceptor: LogInterceptor = (event) => {
			interceptedEvent = event;
			expect(Object.isFrozen(event)).toBe(true);
			try {
				// biome-ignore lint/suspicious/noExplicitAny: testing immutability
				(event as any).message = "mutated";
			} catch {
				// Expected in strict mode
			}
		};

		log.setInterceptor(interceptor);
		log.info("Immutable check");

		expect(interceptedEvent).not.toBeNull();
		expect(interceptedEvent?.message).toContain("[INFO] Immutable check");
	});

	it("8. should not invoke interceptor when log level is filtered out", () => {
		const events: LogEvent[] = [];
		log.setLevel("error");
		log.setInterceptor((e) => events.push(e));

		log.debug("Should be filtered");
		log.info("Should be filtered");
		log.warn("Should be filtered");

		expect(events).toHaveLength(0);
		expect(consoleErrorSpy).not.toHaveBeenCalled();

		log.error("Should pass");
		expect(events).toHaveLength(1);
		expect(consoleErrorSpy).toHaveBeenCalledOnce();
	});

	it("9. should cleanly disable interception when set to undefined", () => {
		const events: LogEvent[] = [];
		log.setInterceptor((e) => events.push(e));

		log.info("Event 1");
		expect(events).toHaveLength(1);

		log.setInterceptor(undefined);
		log.info("Event 2");
		expect(events).toHaveLength(1);
	});

	it("10. should deliver args as a frozen readonly array", () => {
		let receivedArgs: readonly unknown[] = [];
		log.setInterceptor((e) => {
			receivedArgs = e.args;
			expect(Object.isFrozen(e.args)).toBe(true);
		});

		log.debug("Debug event with payload", { key: "value" }, [1, 2, 3]);
		expect(receivedArgs).toHaveLength(2);
	});
});
