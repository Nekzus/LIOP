import { describe, it, expect } from "vitest";
import {
	callTool,
	extractText,
	findToolByBaseName,
	liopEnvelope,
} from "./_helpers.js";

describe("03-execution: Distributed Tool Execution", () => {
	it("should execute remote market analysis through MCP->Mesh->gRPC path", async () => {
		const toolName = await findToolByBaseName("Analyze_Synthetic_Market_Data");
		const payload = liopEnvelope(
			`
const records = env.records;
const total = records.length;
const keys = Object.keys(records[0] || {});
return {
  total: records.length,
  schema_keys: keys,
  has_records: total > 0
};
`,
			"MarketAggregation",
		);

		const result = await callTool(toolName, payload);
		expect(result).toBeDefined();
		expect(result.isError).not.toBe(true);
		const text = extractText(result);
		expect(text.length).toBeGreaterThan(0);
		expect(text).toContain("computation_result");
		expect(text).toContain("schema_keys");
	});

	it("should route request to bank provider and return processed output", async () => {
		const toolName = await findToolByBaseName("Analyze_Synthetic_Bank_Transactions");
		const payload = liopEnvelope(
			`
const records = env.records;
return {
  totalAccounts: records.length,
  totalBalance: records.reduce((acc, r) => acc + r.balance, 0)
};
`,
			"BankAggregation",
		);

		const result = await callTool(toolName, payload);
		expect(result).toBeDefined();
		expect(result.isError).not.toBe(true);
		const text = extractText(result);
		expect(text).toContain("computation_result");
		expect(text).toContain("totalAccounts");
	});
});
