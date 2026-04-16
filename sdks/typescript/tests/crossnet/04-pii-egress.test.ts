import { describe, it, expect } from "vitest";
import {
	callTool,
	extractText,
	findToolByBaseName,
	liopEnvelope,
} from "./_helpers.js";

describe("04-pii-egress: Privacy Data Shield", () => {
	it("should block row-level export attempts and sanitize egress", async () => {
		const toolName = await findToolByBaseName("Analyze_Synthetic_Medical_Records");
		const controlPayload = liopEnvelope(
			`
const records = env.records;
return { totalPatients: records.length };
`,
			"PiiControl",
		);
		const controlResult = await callTool(toolName, controlPayload);
		expect(controlResult.isError).not.toBe(true);

		const payload = liopEnvelope(
			`
// Intentional violation: returning raw rows must be blocked by aggregation-first policy.
return env.records;
`,
			"PiiLeakAttempt",
		);

		const result = await callTool(toolName, payload);
		const text = extractText(result);
		expect(text.length).toBeGreaterThan(0);
		expect(result.isError).toBe(true);
		expect(text).toMatch(/policy|egress|aggregation|violation/i);
	});
});
