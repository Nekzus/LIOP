import { describe, expect, it } from "vitest";
import {
	callTool,
	extractText,
	findToolByBaseName,
	liopEnvelope,
	parseJsonSafe,
} from "./_helpers.js";

describe("11-adversarial-security: red-team style protocol checks", () => {
	it("should block disguised row-level exfiltration attempts", async () => {
		const toolName = await findToolByBaseName("Analyze_Synthetic_Medical_Records");
		const payload = liopEnvelope(
			`
const rows = env.records.map((r) => ({ patient: r.name, age: r.age, diagnosis: r.diagnosis }));
return { records: rows };
`,
			"DisguisedExfiltration",
		);

		const result = await callTool(toolName, payload);
		expect(result.isError).toBe(true);
		expect(extractText(result)).toMatch(/policy|violation|aggregation|blocked|schema/i);
	});

	it("should maintain deterministic result envelope for identical remote logic", async () => {
		const toolName = await findToolByBaseName("Analyze_Synthetic_Market_Data");
		const payload = liopEnvelope(
			`
const records = env.records;
const avgPrice = records.reduce((acc, r) => acc + r.price, 0) / records.length;
return { total: records.length, avgPrice: Number(avgPrice.toFixed(2)) };
`,
			"DeterministicEnvelope",
		);

		const first = await callTool(toolName, payload);
		const second = await callTool(toolName, payload);
		expect(first.isError).not.toBe(true);
		expect(second.isError).not.toBe(true);

		const a = parseJsonSafe<Record<string, unknown>>(extractText(first));
		const b = parseJsonSafe<Record<string, unknown>>(extractText(second));
		expect(a).not.toBeNull();
		expect(b).not.toBeNull();
		expect(String(a?.status || "")).toMatch(/success/i);
		expect(String(b?.status || "")).toMatch(/success/i);
		expect(a?.computation_result).toStrictEqual(b?.computation_result);
		expect(a?.image_id).toBe(b?.image_id);
	});
});

