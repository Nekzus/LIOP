import { describe, it, expect } from "vitest";
import { callTool, findToolByBaseName, liopEnvelope, mcpCall } from "./_helpers.js";

describe("08-chaos: Resilience under Duress", () => {
	it("should remain responsive under concurrent tool calls and invalid requests", async () => {
		const marketTool = await findToolByBaseName("Analyze_Synthetic_Market_Data");
		const validPayload = liopEnvelope(
			`
return { total: env.records.length };
`,
			"ChaosConcurrent",
		);

		const calls = await Promise.all([
			callTool(marketTool, validPayload),
			callTool(marketTool, validPayload),
			mcpCall("tools/call", { name: "NonExistingTool_Chaos", arguments: {} }, 991),
		]);

		expect(calls[0].isError).not.toBe(true);
		expect(calls[1].isError).not.toBe(true);
		expect(calls[2].error || calls[2].result?.isError).toBeTruthy();

		// Verify system still responds after invalid pressure.
		const healthAfter = await mcpCall("tools/list", {}, 992);
		expect(healthAfter.error).toBeUndefined();
		expect(Array.isArray(healthAfter.result?.tools)).toBe(true);
	});
});
