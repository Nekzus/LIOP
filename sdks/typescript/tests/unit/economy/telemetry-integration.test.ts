import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TokenTelemetryEngine } from "../../../src/economy/telemetry.js";

/**
 * Telemetry Integration Tests
 *
 * Verifies that all 8 MCP dispatch operation types are correctly recorded
 * by the TokenTelemetryEngine, producing accurate per-type and per-tool
 * breakdowns with realistic token counts.
 */
describe("TokenTelemetryEngine — Dispatch Integration", () => {
	let engine: TokenTelemetryEngine;

	beforeEach(() => {
		TokenTelemetryEngine.destroy();
		engine = TokenTelemetryEngine.getInstance();
	});

	afterEach(() => {
		TokenTelemetryEngine.destroy();
	});

	it("should track tools/list operation with input and output tokens", () => {
		engine.record({
			type: "tools_list",
			method: "tools/list",
			estimatedInputTokens: 0,
			estimatedOutputTokens: 810,
		});

		const report = engine.getReport();
		expect(report.operations).toHaveLength(1);
		expect(report.operations[0].type).toBe("tools_list");
		expect(report.totalOutputTokens).toBe(810);
	});

	it("should track resources/list operation", () => {
		engine.record({
			type: "resource_list",
			method: "resources/list",
			estimatedInputTokens: 0,
			estimatedOutputTokens: 51,
		});

		const report = engine.getReport();
		expect(report.operations[0].type).toBe("resource_list");
		expect(report.totalOutputTokens).toBe(51);
	});

	it("should track resources/read with URI as toolName", () => {
		engine.record({
			type: "resource_read",
			method: "resources/read",
			estimatedInputTokens: 12,
			estimatedOutputTokens: 250,
			toolName: "liop://protocol/envelope-spec",
			durationMs: 5,
		});

		const report = engine.getReport();
		expect(report.operations[0].toolName).toBe(
			"liop://protocol/envelope-spec",
		);
		expect(report.operations[0].durationMs).toBe(5);
	});

	it("should track prompts/list operation", () => {
		engine.record({
			type: "prompt_list",
			method: "prompts/list",
			estimatedInputTokens: 0,
			estimatedOutputTokens: 58,
		});

		const report = engine.getReport();
		expect(report.operations[0].type).toBe("prompt_list");
	});

	it("should track prompts/get with name as toolName and duration", () => {
		engine.record({
			type: "prompt_get",
			method: "prompts/get",
			estimatedInputTokens: 20,
			estimatedOutputTokens: 500,
			toolName: "liop_blind_analyst",
			durationMs: 3,
		});

		const report = engine.getReport();
		expect(report.operations[0].toolName).toBe("liop_blind_analyst");
		expect(report.operations[0].durationMs).toBe(3);
	});

	it("should track local tool_call with toolName and duration", () => {
		engine.record({
			type: "tool_call",
			method: "tools/call",
			estimatedInputTokens: 300,
			estimatedOutputTokens: 450,
			toolName: "Analyze_Synthetic_Market_Data",
			durationMs: 138,
		});

		const report = engine.getReport();
		expect(report.operations[0].toolName).toBe(
			"Analyze_Synthetic_Market_Data",
		);
		expect(report.operations[0].durationMs).toBe(138);
	});

	it("should track remote tool_call with peerId", () => {
		engine.record({
			type: "tool_call",
			method: "tools/call",
			estimatedInputTokens: 298,
			estimatedOutputTokens: 392,
			toolName: "Analyze_Synthetic_Bank_Transactions",
			peerId: "12D3KooWQ1byTRQrf6Xx6PYjkeQ8hBGADarVf8rk4YRsjUcxKaSE",
			durationMs: 94,
		});

		const report = engine.getReport();
		expect(report.operations[0].peerId).toContain("12D3KooW");
	});

	it("should track diagnostic operation (LiopMeshStatus)", () => {
		engine.record({
			type: "diagnostic",
			method: "tools/call",
			estimatedInputTokens: 0,
			estimatedOutputTokens: 1200,
		});

		const report = engine.getReport();
		expect(report.operations[0].type).toBe("diagnostic");
		expect(report.totalOutputTokens).toBe(1200);
	});

	it("should aggregate all 8 operation types in a single session", () => {
		// Simulate a full Claude Desktop session
		engine.record({ type: "prompt_list", method: "prompts/list", estimatedInputTokens: 0, estimatedOutputTokens: 58 });
		engine.record({ type: "resource_list", method: "resources/list", estimatedInputTokens: 0, estimatedOutputTokens: 51 });
		engine.record({ type: "tools_list", method: "tools/list", estimatedInputTokens: 810, estimatedOutputTokens: 812 });
		engine.record({ type: "resource_read", method: "resources/read", estimatedInputTokens: 12, estimatedOutputTokens: 250, toolName: "liop://protocol/envelope-spec", durationMs: 5 });
		engine.record({ type: "prompt_get", method: "prompts/get", estimatedInputTokens: 20, estimatedOutputTokens: 500, toolName: "liop_blind_analyst", durationMs: 3 });
		engine.record({ type: "tool_call", method: "tools/call", estimatedInputTokens: 569, estimatedOutputTokens: 438, toolName: "Analyze_Synthetic_Market_Data", durationMs: 138 });
		engine.record({ type: "tool_call", method: "tools/call", estimatedInputTokens: 298, estimatedOutputTokens: 392, toolName: "Analyze_Synthetic_Bank_Transactions", durationMs: 94 });
		engine.record({ type: "diagnostic", method: "tools/call", estimatedInputTokens: 0, estimatedOutputTokens: 1200 });

		const report = engine.getReport();
		expect(report.operations).toHaveLength(8);

		// Verify aggregates
		const totalIn = 0 + 0 + 810 + 12 + 20 + 569 + 298 + 0;
		const totalOut = 58 + 51 + 812 + 250 + 500 + 438 + 392 + 1200;
		expect(report.totalInputTokens).toBe(totalIn);
		expect(report.totalOutputTokens).toBe(totalOut);
	});

	it("should produce correct per-tool breakdown from multi-op session", () => {
		engine.record({ type: "tool_call", method: "tools/call", estimatedInputTokens: 569, estimatedOutputTokens: 438, toolName: "Market", durationMs: 138 });
		engine.record({ type: "tool_call", method: "tools/call", estimatedInputTokens: 298, estimatedOutputTokens: 392, toolName: "Bank", durationMs: 94 });
		engine.record({ type: "tool_call", method: "tools/call", estimatedInputTokens: 308, estimatedOutputTokens: 424, toolName: "Medical", durationMs: 111 });
		engine.record({ type: "tool_call", method: "tools/call", estimatedInputTokens: 400, estimatedOutputTokens: 350, toolName: "Market", durationMs: 120 });

		const breakdown = engine.getPerToolReport();
		expect(breakdown.get("Market")?.calls).toBe(2);
		expect(breakdown.get("Market")?.input).toBe(969);
		expect(breakdown.get("Market")?.output).toBe(788);

		expect(breakdown.get("Bank")?.calls).toBe(1);
		expect(breakdown.get("Medical")?.calls).toBe(1);
	});

	it("should format status block with all sections when fully populated", () => {
		engine.record({ type: "tools_list", method: "tools/list", estimatedInputTokens: 810, estimatedOutputTokens: 812 });
		engine.record({ type: "tool_call", method: "tools/call", estimatedInputTokens: 569, estimatedOutputTokens: 438, toolName: "Market", durationMs: 138 });

		const block = engine.formatStatusBlock();
		expect(block).toContain("Token Economy:");
		expect(block).toContain("Session:");
		expect(block).toContain("Estimator:");
		expect(block).toContain("Operations: 2");
		expect(block).toContain("tools_list");
		expect(block).toContain("tool_call");
		expect(block).toContain("By Tool:");
		expect(block).toContain("Market:");
		expect(block).toContain("OTel:");
	});

	it("should return empty string when no operations recorded", () => {
		expect(engine.formatStatusBlock()).toBe("");
	});
});
