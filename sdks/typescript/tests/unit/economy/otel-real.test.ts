import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { metrics } from "@opentelemetry/api";
import {
	AggregationTemporality,
	InMemoryMetricExporter,
	MeterProvider,
	PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { LiopOTelBridge } from "../../../src/economy/otel.js";

/**
 * OTel Real Metrics Verification
 *
 * Uses InMemoryMetricExporter to verify that LiopOTelBridge
 * actually emits gen_ai.* semantic convention metrics with correct
 * attributes, following the official OpenTelemetry JS testing pattern.
 */
describe("LiopOTelBridge (Real MeterProvider)", () => {
	let exporter: InMemoryMetricExporter;
	let reader: PeriodicExportingMetricReader;
	let provider: MeterProvider;

	beforeEach(() => {
		exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
		reader = new PeriodicExportingMetricReader({
			exporter,
			exportIntervalMillis: 50,
		});
		provider = new MeterProvider({ readers: [reader] });
		metrics.setGlobalMeterProvider(provider);
	});

	afterEach(async () => {
		await reader.forceFlush();
		await reader.shutdown();
		await provider.shutdown();
		metrics.disable();
	});

	it("should emit gen_ai.client.token.usage histogram with correct attributes", async () => {
		const bridge = new LiopOTelBridge();
		bridge.recordTokens(150, "input", "execute_tool", "Analyze_Market");

		await reader.forceFlush();
		const exported = exporter.getMetrics();
		expect(exported.length).toBeGreaterThan(0);

		const scopeMetrics = exported[0].scopeMetrics;
		expect(scopeMetrics.length).toBeGreaterThan(0);

		const tokenMetric = scopeMetrics[0].metrics.find(
			(m) => m.descriptor.name === "gen_ai.client.token.usage",
		);
		expect(tokenMetric).toBeDefined();
		expect(tokenMetric!.descriptor.unit).toBe("{token}");

		const dp = tokenMetric!.dataPoints[0];
		expect(dp.attributes["gen_ai.system"]).toBe("liop");
		expect(dp.attributes["gen_ai.token.type"]).toBe("input");
		expect(dp.attributes["gen_ai.operation.name"]).toBe("execute_tool");
		expect(dp.attributes["liop.tool.name"]).toBe("Analyze_Market");
	});

	it("should emit gen_ai.client.operation.duration histogram in seconds", async () => {
		const bridge = new LiopOTelBridge();
		bridge.recordDuration(250, "execute_tool");

		await reader.forceFlush();
		const exported = exporter.getMetrics();
		expect(exported.length).toBeGreaterThan(0);

		const scopeMetrics = exported[0].scopeMetrics;
		const durationMetric = scopeMetrics[0].metrics.find(
			(m) => m.descriptor.name === "gen_ai.client.operation.duration",
		);
		expect(durationMetric).toBeDefined();
		expect(durationMetric!.descriptor.unit).toBe("s");

		const dp = durationMetric!.dataPoints[0];
		expect(dp.attributes["gen_ai.system"]).toBe("liop");
		expect(dp.attributes["gen_ai.operation.name"]).toBe("execute_tool");
	});

	it("should differentiate input vs output token types", async () => {
		const bridge = new LiopOTelBridge();
		bridge.recordTokens(100, "input", "chat");
		bridge.recordTokens(200, "output", "chat");

		await reader.forceFlush();
		const exported = exporter.getMetrics();
		const scopeMetrics = exported[0].scopeMetrics;
		const tokenMetric = scopeMetrics[0].metrics.find(
			(m) => m.descriptor.name === "gen_ai.client.token.usage",
		);
		expect(tokenMetric).toBeDefined();

		// Should have 2 data points (one input, one output)
		const dataPoints = tokenMetric!.dataPoints;
		expect(dataPoints.length).toBe(2);

		const types = dataPoints.map(
			(dp) => dp.attributes["gen_ai.token.type"],
		);
		expect(types).toContain("input");
		expect(types).toContain("output");
	});

	it("should record error type attribute for failed operations", async () => {
		const bridge = new LiopOTelBridge();
		bridge.recordDuration(5000, "execute_tool", "timeout");

		await reader.forceFlush();
		const exported = exporter.getMetrics();
		const scopeMetrics = exported[0].scopeMetrics;
		const durationMetric = scopeMetrics[0].metrics.find(
			(m) => m.descriptor.name === "gen_ai.client.operation.duration",
		);
		const dp = durationMetric!.dataPoints[0];
		expect(dp.attributes["error.type"]).toBe("timeout");
	});

	it("should not include liop.tool.name when toolName is omitted", async () => {
		const bridge = new LiopOTelBridge();
		bridge.recordTokens(50, "input", "chat");

		await reader.forceFlush();
		const exported = exporter.getMetrics();
		const scopeMetrics = exported[0].scopeMetrics;
		const tokenMetric = scopeMetrics[0].metrics.find(
			(m) => m.descriptor.name === "gen_ai.client.token.usage",
		);
		const dp = tokenMetric!.dataPoints[0];
		expect(dp.attributes["liop.tool.name"]).toBeUndefined();
	});

	it("should use @nekzus/liop as meter scope name", async () => {
		const bridge = new LiopOTelBridge();
		bridge.recordTokens(10, "input", "chat");

		await reader.forceFlush();
		const exported = exporter.getMetrics();
		const scopeMetrics = exported[0].scopeMetrics;
		expect(scopeMetrics[0].scope.name).toBe("@nekzus/liop");
	});

	it("should accumulate multiple recordings", async () => {
		const bridge = new LiopOTelBridge();
		bridge.recordTokens(100, "input", "execute_tool", "tool_a");
		bridge.recordTokens(200, "input", "execute_tool", "tool_b");

		await reader.forceFlush();
		const exported = exporter.getMetrics();
		const scopeMetrics = exported[0].scopeMetrics;
		const tokenMetric = scopeMetrics[0].metrics.find(
			(m) => m.descriptor.name === "gen_ai.client.token.usage",
		);
		// Different attributes produce different data points
		expect(tokenMetric!.dataPoints.length).toBe(2);
	});
});
