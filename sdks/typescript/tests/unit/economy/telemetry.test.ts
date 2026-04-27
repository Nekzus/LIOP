import { describe, it, expect, beforeEach } from "vitest";
import { TokenTelemetryEngine } from "../../../src/economy/telemetry.js";

describe("TokenTelemetryEngine", () => {
	beforeEach(() => {
		TokenTelemetryEngine.destroy();
	});

	it("should be a singleton", () => {
		const a = TokenTelemetryEngine.getInstance();
		const b = TokenTelemetryEngine.getInstance();
		expect(a).toBe(b);
	});

	it("should generate a unique session ID", () => {
		const engine = TokenTelemetryEngine.getInstance();
		const report = engine.getReport();
		expect(report.sessionId).toBeDefined();
		expect(report.sessionId.length).toBeGreaterThan(0);
	});

	it("should record operations with all fields", () => {
		const engine = TokenTelemetryEngine.getInstance();
		engine.record({
			type: "tool_call",
			method: "tools/call",
			toolName: "Analyze_Market",
			peerId: "12D3abc",
			estimatedInputTokens: 100,
			estimatedOutputTokens: 250,
			durationMs: 145,
		});

		const report = engine.getReport();
		expect(report.operations).toHaveLength(1);
		expect(report.operations[0].type).toBe("tool_call");
		expect(report.operations[0].toolName).toBe("Analyze_Market");
		expect(report.operations[0].peerId).toBe("12D3abc");
		expect(report.operations[0].estimatedInputTokens).toBe(100);
		expect(report.operations[0].estimatedOutputTokens).toBe(250);
		expect(report.operations[0].durationMs).toBe(145);
		expect(report.operations[0].timestamp).toBeGreaterThan(0);
	});

	it("should accumulate total tokens across multiple operations", () => {
		const engine = TokenTelemetryEngine.getInstance();

		engine.record({
			type: "tools_list",
			method: "tools/list",
			estimatedInputTokens: 500,
			estimatedOutputTokens: 600,
		});
		engine.record({
			type: "tool_call",
			method: "tools/call",
			toolName: "Bank",
			estimatedInputTokens: 100,
			estimatedOutputTokens: 200,
		});
		engine.record({
			type: "tool_call",
			method: "tools/call",
			toolName: "Market",
			estimatedInputTokens: 150,
			estimatedOutputTokens: 300,
		});

		const report = engine.getReport();
		expect(report.totalInputTokens).toBe(750);
		expect(report.totalOutputTokens).toBe(1100);
		expect(report.operations).toHaveLength(3);
	});

	it("should produce per-tool breakdown", () => {
		const engine = TokenTelemetryEngine.getInstance();

		engine.record({
			type: "tool_call",
			method: "tools/call",
			toolName: "Bank",
			estimatedInputTokens: 100,
			estimatedOutputTokens: 200,
			durationMs: 100,
		});
		engine.record({
			type: "tool_call",
			method: "tools/call",
			toolName: "Bank",
			estimatedInputTokens: 150,
			estimatedOutputTokens: 250,
			durationMs: 200,
		});
		engine.record({
			type: "tool_call",
			method: "tools/call",
			toolName: "Market",
			estimatedInputTokens: 300,
			estimatedOutputTokens: 500,
			durationMs: 50,
		});

		const breakdown = engine.getPerToolReport();
		expect(breakdown.size).toBe(2);

		const bank = breakdown.get("Bank");
		expect(bank).toBeDefined();
		expect(bank?.input).toBe(250);
		expect(bank?.output).toBe(450);
		expect(bank?.calls).toBe(2);
		expect(bank?.avgDurationMs).toBe(150);

		const market = breakdown.get("Market");
		expect(market).toBeDefined();
		expect(market?.input).toBe(300);
		expect(market?.output).toBe(500);
		expect(market?.calls).toBe(1);
		expect(market?.avgDurationMs).toBe(50);
	});

	it("should count tokens using the active estimator", () => {
		const engine = TokenTelemetryEngine.getInstance();
		// At construction, uses heuristic until async init completes
		const count = engine.countTokens("Hello, world!");
		expect(count).toBeGreaterThan(0);
	});

	it("should provide backward compatible estimateTokens()", () => {
		const engine = TokenTelemetryEngine.getInstance();
		const count = engine.estimateTokens("Test string");
		expect(count).toBeGreaterThan(0);
		expect(count).toBe(engine.countTokens("Test string"));
	});

	it("should format status block with operations breakdown", () => {
		const engine = TokenTelemetryEngine.getInstance();
		engine.record({
			type: "tools_list",
			method: "tools/list",
			estimatedInputTokens: 800,
			estimatedOutputTokens: 900,
		});
		engine.record({
			type: "tool_call",
			method: "tools/call",
			toolName: "Bank",
			estimatedInputTokens: 100,
			estimatedOutputTokens: 200,
			durationMs: 120,
		});

		const block = engine.formatStatusBlock();
		expect(block).toContain("Token Economy:");
		expect(block).toContain("Session:");
		expect(block).toContain("Estimator:");
		expect(block).toContain("Operations: 2");
		expect(block).toContain("tools_list");
		expect(block).toContain("tool_call");
		expect(block).toContain("Bank:");
		expect(block).toContain("OTel:");
	});

	it("should return empty string when no operations recorded", () => {
		const engine = TokenTelemetryEngine.getInstance();
		expect(engine.formatStatusBlock()).toBe("");
	});

	it("should track session uptime", () => {
		const engine = TokenTelemetryEngine.getInstance();
		const report = engine.getReport();
		expect(report.sessionUptimeMs).toBeGreaterThanOrEqual(0);
	});

	it("should show estimator name in report", () => {
		const engine = TokenTelemetryEngine.getInstance();
		const report = engine.getReport();
		// Initially uses heuristic until async init completes
		expect(
			report.estimatorName === "heuristic (chars/4)" ||
				report.estimatorName === "o200k_base",
		).toBe(true);
	});

	it("should reset operations on reset()", () => {
		const engine = TokenTelemetryEngine.getInstance();
		engine.record({
			type: "tool_call",
			method: "tools/call",
			estimatedInputTokens: 100,
			estimatedOutputTokens: 200,
		});
		expect(engine.getReport().operations).toHaveLength(1);

		engine.reset();
		expect(engine.getReport().operations).toHaveLength(0);
	});
});
