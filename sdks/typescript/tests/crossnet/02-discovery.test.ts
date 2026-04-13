import { expect, test, describe } from "vitest";

describe("Cross-Network: Discovery", () => {
	const agentUrl = process.env.AGENT_URL || "http://172.20.0.12:3000";

	test("Agent discovers tools from Vault via DHT", async () => {
		const res = await fetch(`${agentUrl}/mcp`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "tools/list"
			})
		});
		
		const data = await res.json();
		expect(data).toHaveProperty("result");
		
		const tools = data.result.tools.map((t: any) => t.name);
		expect(tools).toContain("Analyze_Synthetic_Medical_Records");
	});
});
