import { describe, it, expect } from "vitest";
import { LiopOTelBridge } from "../../../src/economy/otel.js";

describe("LiopOTelBridge", () => {
	it("should initialize without throwing (NoOp mode)", () => {
		// Without a real MeterProvider, the bridge uses OTel's NoOp pattern
		const bridge = new LiopOTelBridge();
		expect(bridge).toBeDefined();
		expect(bridge.isActive()).toBe(true);
	});

	it("should record token usage without error", () => {
		const bridge = new LiopOTelBridge();
		expect(() => {
			bridge.recordTokens(100, "input", "execute_tool", "test_tool");
			bridge.recordTokens(200, "output", "execute_tool", "test_tool");
		}).not.toThrow();
	});

	it("should record operation duration without error", () => {
		const bridge = new LiopOTelBridge();
		expect(() => {
			bridge.recordDuration(150, "execute_tool");
			bridge.recordDuration(500, "chat", "timeout");
		}).not.toThrow();
	});

	it("should handle zero token counts", () => {
		const bridge = new LiopOTelBridge();
		expect(() => {
			bridge.recordTokens(0, "input", "chat");
		}).not.toThrow();
	});

	it("should accept all valid token types", () => {
		const bridge = new LiopOTelBridge();
		expect(() => {
			bridge.recordTokens(10, "input", "execute_tool");
			bridge.recordTokens(20, "output", "chat");
		}).not.toThrow();
	});
});
