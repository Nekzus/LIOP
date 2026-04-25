import { describe, expect, it } from "vitest";
import { findToolByBaseName, mcpCall } from "./_helpers.js";

describe("09-mcp-conformance: MCP compatibility for production clients", () => {
	it("should expose MCP initialize contract with listChanged capabilities", async () => {
		const response = await mcpCall(
			"initialize",
			{
				protocolVersion: "2025-11-25",
				capabilities: {},
				clientInfo: { name: "crossnet-auditor", version: "1.0.0" },
			},
			901,
		);
		expect(response.error).toBeUndefined();
		expect(response.result?.protocolVersion).toBe("2025-11-25");
		expect(response.result?.capabilities?.tools?.listChanged).toBe(true);
		expect(response.result?.capabilities?.resources?.listChanged).toBe(true);
		expect(response.result?.capabilities?.prompts?.listChanged).toBe(true);
		expect(response.result?.serverInfo?.name).toBeTruthy();
		expect(response.result?.serverInfo?.version).toBeTruthy();
	});

	it("should provide stable JSON-RPC behavior for ping and unknown methods", async () => {
		const ping = await mcpCall("ping", {}, 902);
		expect(ping.error).toBeUndefined();
		expect(ping.result).toEqual({});

		const unknown = await mcpCall("method/does-not-exist", {}, 903);
		expect(unknown.result).toBeUndefined();
		expect(unknown.error?.code).toBe(-32601);
		expect(unknown.error?.message).toContain("Method not found");
	});

	it("should expose discoverable tool inventory through tools/list", async () => {
		const response = await mcpCall("tools/list", {}, 904);
		expect(response.error).toBeUndefined();
		const tools = response.result?.tools as Array<{ name: string }>;
		expect(Array.isArray(tools)).toBe(true);
		expect(tools.length).toBeGreaterThan(0);
		expect(tools.some((t) => t.name === "LiopMeshStatus")).toBe(true);

		// Verifies MCP-visible dynamic tooling as expected by desktop clients.
		await expect(
			findToolByBaseName("Analyze_Synthetic_Medical_Records"),
		).resolves.toBeTruthy();
	});

	it("should execute MCP tools/call using diagnostic path", async () => {
		const response = await mcpCall(
			"tools/call",
			{
				name: "LiopMeshStatus",
				arguments: {},
			},
			905,
		);
		expect(response.error).toBeUndefined();
		const content = response.result?.content as Array<{ type: string; text: string }>;
		expect(Array.isArray(content)).toBe(true);
		expect(content[0]?.type).toBe("text");
		expect(content[0]?.text).toContain("LIOP Mesh Status");
	});
});

