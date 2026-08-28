import { describe, expect, it } from "vitest";
import {
	LiopTracer,
	defaultTracer,
} from "../../../src/observability/tracing.js";

describe("OpenTelemetry Distributed Tracing (Phase Beta-3)", () => {
	it("should generate valid 32-char traceId and 16-char spanId", () => {
		const traceId = LiopTracer.generateTraceId();
		const spanId = LiopTracer.generateSpanId();

		expect(traceId.length).toBe(32);
		expect(/^[0-9a-f]{32}$/.test(traceId)).toBe(true);
		expect(spanId.length).toBe(16);
		expect(/^[0-9a-f]{16}$/.test(spanId)).toBe(true);
	});

	it("should format and parse W3C traceparent headers correctly", () => {
		const traceId = "4bf92f3577b34da6a3ce929d0e0e4736";
		const spanId = "00f067aa0ba902b7";

		const header = LiopTracer.formatTraceparent(traceId, spanId, true);
		expect(header).toBe("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");

		const parsed = LiopTracer.parseTraceparent(header);
		expect(parsed).not.toBeNull();
		expect(parsed?.traceId).toBe(traceId);
		expect(parsed?.spanId).toBe(spanId);
		expect(parsed?.sampled).toBe(true);
	});

	it("should reject invalid or all-zero traceparents according to W3C spec", () => {
		expect(LiopTracer.parseTraceparent("invalid")).toBeNull();
		expect(LiopTracer.parseTraceparent("")).toBeNull();
		expect(
			LiopTracer.parseTraceparent(
				"00-00000000000000000000000000000000-00f067aa0ba902b7-01",
			),
		).toBeNull();
		expect(
			LiopTracer.parseTraceparent(
				"00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01",
			),
		).toBeNull();
	});

	it("should inject and extract traceparent into metadata/headers carrier", () => {
		const carrier: Record<string, string> = {};
		const context = {
			traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
			spanId: "00f067aa0ba902b7",
			sampled: true,
		};

		LiopTracer.injectTraceparent(carrier, context);
		expect(carrier.traceparent).toBeDefined();

		const extracted = LiopTracer.extractTraceparent(carrier);
		expect(extracted).toEqual(context);
	});

	it("should start spans with parent traceId propagation", () => {
		const parentSpan = defaultTracer.startSpan("parent_operation", null, {
			"rpc.service": "nexus",
		});
		expect(parentSpan.context.traceId).toBeDefined();

		const childSpan = defaultTracer.startSpan(
			"child_in_situ_logic",
			parentSpan.context,
			{ "liop.tool": "Analyze_HFT_Market_Data" },
		);

		// Child must inherit parent's traceId but have a unique spanId
		expect(childSpan.context.traceId).toBe(parentSpan.context.traceId);
		expect(childSpan.context.spanId).not.toBe(parentSpan.context.spanId);

		childSpan.setAttribute("fuel.consumed", 1500);
		expect(childSpan.attributes["fuel.consumed"]).toBe(1500);

		childSpan.end();
		expect(childSpan.endTime).toBeGreaterThanOrEqual(childSpan.startTime);
	});

	it("should record exceptions on span", () => {
		const span = defaultTracer.startSpan("error_op");
		span.recordException(new Error("WASI Fuel exhausted"));
		expect(span.status).toBe("ERROR");
		expect(span.error).toBe("WASI Fuel exhausted");
	});
});
