import { afterEach, describe, expect, it } from "vitest";
import { TokenTelemetryEngine } from "./telemetry.js";

describe("TokenTelemetryEngine", () => {
	afterEach(() => {
		TokenTelemetryEngine.destroy();
	});

	it("should return a singleton instance", () => {
		const a = TokenTelemetryEngine.getInstance();
		const b = TokenTelemetryEngine.getInstance();
		expect(a).toBe(b);
	});

	it("should record operations and produce a report", () => {
		const engine = TokenTelemetryEngine.getInstance();
		engine.record({
			type: "tools_list",
			method: "tools/list",
			estimatedInputTokens: 500,
			estimatedOutputTokens: 0,
		});
		engine.record({
			type: "tool_call",
			method: "tools/call",
			estimatedInputTokens: 100,
			estimatedOutputTokens: 200,
		});

		const report = engine.getReport();
		expect(report.operations).toHaveLength(2);
		expect(report.totalInputTokens).toBe(600);
		expect(report.totalOutputTokens).toBe(200);
		expect(report.sessionId).toBeTruthy();
	});

	it("should estimate tokens using chars/4 heuristic", () => {
		const engine = TokenTelemetryEngine.getInstance();
		// 100 chars → ~25 tokens
		const text = "a".repeat(100);
		expect(engine.estimateTokens(text)).toBe(25);
	});

	it("should ceil the heuristic for non-divisible lengths", () => {
		const engine = TokenTelemetryEngine.getInstance();
		// 7 chars → ceil(7/4) = 2
		expect(engine.estimateTokens("abcdefg")).toBe(2);
	});

	it("should format a non-empty status block", () => {
		const engine = TokenTelemetryEngine.getInstance();
		engine.record({
			type: "tools_list",
			method: "tools/list",
			estimatedInputTokens: 1200,
			estimatedOutputTokens: 0,
		});

		const block = engine.formatStatusBlock();
		expect(block).toContain("Token Economy:");
		expect(block).toContain("Operations: 1");
		expect(block).toContain("Total:");
	});

	it("should return empty string for status block with no operations", () => {
		const engine = TokenTelemetryEngine.getInstance();
		expect(engine.formatStatusBlock()).toBe("");
	});

	it("should reset operations cleanly", () => {
		const engine = TokenTelemetryEngine.getInstance();
		engine.record({
			type: "tool_call",
			method: "tools/call",
			estimatedInputTokens: 50,
			estimatedOutputTokens: 100,
		});
		engine.reset();

		const report = engine.getReport();
		expect(report.operations).toHaveLength(0);
		expect(report.totalInputTokens).toBe(0);
	});

	it("should isolate instances after destroy", () => {
		const first = TokenTelemetryEngine.getInstance();
		first.record({
			type: "tools_list",
			method: "tools/list",
			estimatedInputTokens: 999,
			estimatedOutputTokens: 0,
		});

		TokenTelemetryEngine.destroy();
		const second = TokenTelemetryEngine.getInstance();

		expect(second).not.toBe(first);
		expect(second.getReport().operations).toHaveLength(0);
	});
});
