import { afterEach, describe, expect, it } from "vitest";
import {
	mcpCompactToolDescriptions,
	stripVerboseLiopToolDescription,
} from "../../../src/utils/mcpCompact.js";

describe("mcpCompact utilities", () => {
	const originalEnv = process.env.LIOP_MCP_COMPACT_TOOL_DESCRIPTIONS;

	afterEach(() => {
		if (originalEnv === undefined) {
			delete process.env.LIOP_MCP_COMPACT_TOOL_DESCRIPTIONS;
		} else {
			process.env.LIOP_MCP_COMPACT_TOOL_DESCRIPTIONS = originalEnv;
		}
	});

	describe("mcpCompactToolDescriptions()", () => {
		it("should return true for '1'", () => {
			process.env.LIOP_MCP_COMPACT_TOOL_DESCRIPTIONS = "1";
			expect(mcpCompactToolDescriptions()).toBe(true);
		});

		it("should return true for 'true'", () => {
			process.env.LIOP_MCP_COMPACT_TOOL_DESCRIPTIONS = "true";
			expect(mcpCompactToolDescriptions()).toBe(true);
		});

		it("should return true for 'yes'", () => {
			process.env.LIOP_MCP_COMPACT_TOOL_DESCRIPTIONS = "yes";
			expect(mcpCompactToolDescriptions()).toBe(true);
		});

		it("should return true for case-insensitive 'TRUE' with whitespace", () => {
			process.env.LIOP_MCP_COMPACT_TOOL_DESCRIPTIONS = "  TRUE  ";
			expect(mcpCompactToolDescriptions()).toBe(true);
		});

		it("should return false for 'false'", () => {
			process.env.LIOP_MCP_COMPACT_TOOL_DESCRIPTIONS = "false";
			expect(mcpCompactToolDescriptions()).toBe(false);
		});

		it("should return false when env var is undefined", () => {
			delete process.env.LIOP_MCP_COMPACT_TOOL_DESCRIPTIONS;
			expect(mcpCompactToolDescriptions()).toBe(false);
		});
	});

	describe("stripVerboseLiopToolDescription()", () => {
		it("should strip description at [LIOP-PROTO-V1: marker with double newline", () => {
			const desc =
				"Analyzes data securely.\n\n[LIOP-PROTO-V1: full spec here...]";
			expect(stripVerboseLiopToolDescription(desc)).toBe(
				"Analyzes data securely.",
			);
		});

		it("should strip description at [LIOP-PROTO-V1: marker with CRLF", () => {
			const desc =
				"Tool description\r\n\r\n[LIOP-PROTO-V1: verbose content]";
			expect(stripVerboseLiopToolDescription(desc)).toBe(
				"Tool description",
			);
		});

		it("should strip description at [LIOP-PROTO-V1: marker with single newline", () => {
			const desc =
				"Short desc\n[LIOP-PROTO-V1: rare edge case]";
			expect(stripVerboseLiopToolDescription(desc)).toBe("Short desc");
		});

		it("should return original description when no marker is present", () => {
			const desc = "A regular tool description without any markers";
			expect(stripVerboseLiopToolDescription(desc)).toBe(desc);
		});

		it("should trim trailing whitespace after strip", () => {
			const desc =
				"Tool with trailing space   \n\n[LIOP-PROTO-V1: content]";
			expect(stripVerboseLiopToolDescription(desc)).toBe(
				"Tool with trailing space",
			);
		});
	});
});
