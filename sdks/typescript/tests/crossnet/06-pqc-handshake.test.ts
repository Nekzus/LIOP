import { describe, it, expect } from "vitest";
import {
	callTool,
	extractText,
	findToolByBaseName,
	liopEnvelope,
} from "./_helpers.js";

describe("06-pqc-handshake: Post-Quantum Cryptography", () => {
	it("should complete secure remote invocation without transport integrity errors", async () => {
		const toolName = await findToolByBaseName("Analyze_Synthetic_Bank_Transactions");
		const payload = liopEnvelope(
			`
const records = env.records;
return {
  totalAccounts: records.length,
  byType: records.reduce((acc, r) => {
    acc[r.accountType] = (acc[r.accountType] || 0) + 1;
    return acc;
  }, {})
};
`,
			"PqcHandshakePath",
		);

		const result = await callTool(toolName, payload);
		expect(result.isError).not.toBe(true);
		const text = extractText(result);
		expect(text).toContain("computation_result");
		expect(text).not.toMatch(/PQC Handshake Failed|PROTOCOL INTEGRITY VIOLATION/i);
	});
});
