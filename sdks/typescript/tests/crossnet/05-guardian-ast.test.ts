import { describe, it, expect } from "vitest";
import {
	callTool,
	extractText,
	findToolByBaseName,
	liopEnvelope,
} from "./_helpers.js";

describe("05-guardian-ast: V8/WASM Isolation layer", () => {
	it("should block unauthorized runtime capabilities from injected logic", async () => {
		const toolName = await findToolByBaseName("Analyze_Synthetic_Market_Data");
		const payload = liopEnvelope(
			`
// Intentional forbidden behavior for sandbox validation.
const fs = require("node:fs");
return { leaked: fs.readFileSync("/etc/passwd", "utf8").slice(0, 32) };
`,
			"SandboxEscapeAttempt",
		);

		const result = await callTool(toolName, payload);
		const text = extractText(result);
		expect(result.isError).toBe(true);
		expect(text).toMatch(
			/error|blocked|forbidden|not defined|sandbox|execution|schema|violation/i,
		);
	});
});
