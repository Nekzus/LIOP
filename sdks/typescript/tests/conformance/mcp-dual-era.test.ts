import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiopMcpBridge } from "../../src/bridge/index.js";
import { LiopClient } from "../../src/client/index.js";
import { LiopHybridGateway } from "../../src/gateway/hybrid.js";
import {
	MCP_LEGACY_SUPPORT_ENABLED,
	MCP_PROTOCOL_VERSION_LEGACY,
	adaptResponseForLegacyClient,
	buildLegacyInitializeResponse,
	isLegacyRequest,
} from "../../src/gateway/mcp-compat.js";
import { LiopMcpRouter } from "../../src/gateway/router.js";
import type { MeshNode } from "../../src/mesh/index.js";
import { LiopServer } from "../../src/server/index.js";
import {
	MCP_PROTOCOL_VERSION,
	type McpRequest,
	type McpResponse,
} from "../../src/types.js";

describe("MCP Dual-Era Conformance & Sunset Isolation", () => {
	const createMockMeshNode = () => undefined;

	const createTestServer = () => {
		const server = new LiopServer({
			name: "DualEraTestNode",
			version: "2.1.0",
		});
		server.tool(
			"zebra_calc",
			"A tool sorted last alphabetically",
			{},
			async () => ({ content: [{ type: "text", text: "zebra result" }] }),
		);
		server.tool(
			"alpha_calc",
			"A tool sorted first alphabetically",
			{},
			async () => ({ content: [{ type: "text", text: "alpha result" }] }),
		);
		server.resource(
			"test_doc",
			"liop://docs/test",
			"Test documentation resource",
			"text/plain",
			async () => "Hello modern MCP world",
		);
		server.prompt(
			"greet",
			"A test greeting prompt",
			[{ name: "user", description: "Username", required: true }],
			async (req) => ({
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: `Hello ${req.arguments?.user || "Anonymous"}`,
						},
					},
				],
			}),
		);
		return server;
	};

	describe("1. Modern Era (MCP 2026-07-28)", () => {
		it("should respond to server/discover with supported versions and complete resultType", async () => {
			const server = createTestServer();
			const router = new LiopMcpRouter(server, createMockMeshNode());

			const response = await router.dispatch({
				jsonrpc: "2.0",
				id: "discover-1",
				method: "server/discover",
				params: {},
			});

			expect(response).not.toBeNull();
			expect(response?.error).toBeUndefined();
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const result = response?.result as any;
			expect(result.resultType).toBe("complete");
			expect(result.supportedVersions).toContain(MCP_PROTOCOL_VERSION);
			expect(result.supportedVersions).toContain(MCP_PROTOCOL_VERSION_LEGACY);
			expect(result.capabilities.tools.listChanged).toBe(true);
			expect(result.serverInfo.name).toBe("DualEraTestNode");
		});

		it("should format tools/list with deterministic sorting and caching headers in modern era", async () => {
			const server = createTestServer();
			const router = new LiopMcpRouter(server, createMockMeshNode());

			const response = await router.dispatch({
				jsonrpc: "2.0",
				id: "tools-1",
				method: "tools/list",
				params: {
					_meta: {
						"io.modelcontextprotocol/protocolVersion": MCP_PROTOCOL_VERSION,
					},
				},
			});

			expect(response).not.toBeNull();
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const result = response?.result as any;
			expect(result.resultType).toBe("complete");
			expect(result.ttlMs).toBe(300_000);
			expect(result.cacheScope).toBe("public");
			expect(Array.isArray(result.tools)).toBe(true);

			// Verify deterministic alphabetical order (LiopMeshStatus < alpha_calc < zebra_calc)
			const names = result.tools.map((t: { name: string }) => t.name);
			const sorted = [...names].sort((a, b) => a.localeCompare(b));
			expect(names).toEqual(sorted);
		});

		it("should format resources/list and resources/read with modern caching hints", async () => {
			const server = createTestServer();
			const router = new LiopMcpRouter(server, createMockMeshNode());

			// Test resources/list
			const listRes = await router.dispatch({
				jsonrpc: "2.0",
				id: "res-list-1",
				method: "resources/list",
				params: {
					_meta: {
						"io.modelcontextprotocol/protocolVersion": MCP_PROTOCOL_VERSION,
					},
				},
			});
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const listResult = listRes?.result as any;
			expect(listResult.resultType).toBe("complete");
			expect(listResult.ttlMs).toBe(300_000);
			expect(listResult.cacheScope).toBe("public");

			// Test resources/read
			const readRes = await router.dispatch({
				jsonrpc: "2.0",
				id: "res-read-1",
				method: "resources/read",
				params: {
					uri: "liop://docs/test",
					_meta: {
						"io.modelcontextprotocol/protocolVersion": MCP_PROTOCOL_VERSION,
					},
				},
			});
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const readResult = readRes?.result as any;
			expect(readResult.resultType).toBe("complete");
			expect(readResult.ttlMs).toBe(60_000);
			expect(readResult.cacheScope).toBe("private");
		});

		it("should format prompts/list and prompts/get with modern resultType", async () => {
			const server = createTestServer();
			const router = new LiopMcpRouter(server, createMockMeshNode());

			const getRes = await router.dispatch({
				jsonrpc: "2.0",
				id: "prompt-get-1",
				method: "prompts/get",
				params: {
					name: "greet",
					arguments: { user: "Antigravity" },
					_meta: {
						"io.modelcontextprotocol/protocolVersion": MCP_PROTOCOL_VERSION,
					},
				},
			});
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const getResult = getRes?.result as any;
			expect(getResult.resultType).toBe("complete");
			expect(getResult.messages[0].content.text).toBe("Hello Antigravity");
		});

		it("should format resources/templates/list with empty array and caching hints in modern era", async () => {
			const server = createTestServer();
			const router = new LiopMcpRouter(server, createMockMeshNode());

			const res = await router.dispatch({
				jsonrpc: "2.0",
				id: "res-tmpl-1",
				method: "resources/templates/list",
				params: {
					_meta: {
						"io.modelcontextprotocol/protocolVersion": MCP_PROTOCOL_VERSION,
					},
				},
			});
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const result = res?.result as any;
			expect(result.resultType).toBe("complete");
			expect(result.resourceTemplates).toEqual([]);
			expect(result.ttlMs).toBe(300_000);
			expect(result.cacheScope).toBe("public");
		});

		it("should handle subscriptions/listen gracefully in modern era", async () => {
			const server = createTestServer();
			const router = new LiopMcpRouter(server, createMockMeshNode());

			const res = await router.dispatch({
				jsonrpc: "2.0",
				id: "listen:0",
				method: "subscriptions/listen",
				params: {
					_meta: {
						"io.modelcontextprotocol/protocolVersion": MCP_PROTOCOL_VERSION,
					},
					notifications: {
						toolsListChanged: true,
						resourcesListChanged: true,
						promptsListChanged: true,
					},
				},
			});
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const result = res?.result as any;
			expect(result.resultType).toBe("complete");
		});

		it("should wrap tools/call with resultType complete in modern era", async () => {
			const server = createTestServer();
			const router = new LiopMcpRouter(server, createMockMeshNode());

			const callRes = await router.dispatch({
				jsonrpc: "2.0",
				id: "call-1",
				method: "tools/call",
				params: {
					name: "alpha_calc",
					arguments: {},
					_meta: {
						"io.modelcontextprotocol/protocolVersion": MCP_PROTOCOL_VERSION,
					},
				},
			});

			expect(callRes).not.toBeNull();
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const callResult = callRes?.result as any;
			expect(callResult.resultType).toBe("complete");
			expect(callResult.content[0].text).toBe("alpha result");
		});
	});

	describe("2. Legacy Era (MCP 2025-11-25)", () => {
		it("should handle initialize handshake returning 2025-11-25 protocolVersion", async () => {
			const server = createTestServer();
			const router = new LiopMcpRouter(server, createMockMeshNode());

			const initRes = await router.dispatch({
				jsonrpc: "2.0",
				id: "init-1",
				method: "initialize",
				params: {
					protocolVersion: "2025-11-25",
					capabilities: {},
					clientInfo: { name: "ClaudeDesktop", version: "0.8.0" },
				},
			});

			expect(initRes).not.toBeNull();
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const result = initRes?.result as any;
			expect(result.protocolVersion).toBe(MCP_PROTOCOL_VERSION_LEGACY);
			expect(result.serverInfo.name).toBe("DualEraTestNode");
			expect(result.resultType).toBeUndefined(); // Legacy MUST NOT have resultType
		});

		it("should handle notifications/initialized gracefully as null", async () => {
			const server = createTestServer();
			const router = new LiopMcpRouter(server, createMockMeshNode());

			const notifRes = await router.dispatch({
				jsonrpc: "2.0",
				method: "notifications/initialized",
			});

			expect(notifRes).toBeNull();
		});

		it("should strip resultType and caching fields for legacy clients in tools/list", async () => {
			const server = createTestServer();
			const router = new LiopMcpRouter(server, createMockMeshNode());

			// Legacy request without _meta
			const response = await router.dispatch({
				jsonrpc: "2.0",
				id: "legacy-tools-1",
				method: "tools/list",
				params: {},
			});

			expect(response).not.toBeNull();
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const result = response?.result as any;
			expect(result.resultType).toBeUndefined();
			expect(result.ttlMs).toBeUndefined();
			expect(result.cacheScope).toBeUndefined();
			expect(Array.isArray(result.tools)).toBe(true);
		});

		it("should strip resultType for legacy clients in tools/call", async () => {
			const server = createTestServer();
			const router = new LiopMcpRouter(server, createMockMeshNode());

			const callRes = await router.dispatch({
				jsonrpc: "2.0",
				id: "legacy-call-1",
				method: "tools/call",
				params: {
					name: "alpha_calc",
					arguments: {},
				},
			});

			// biome-ignore lint/suspicious/noExplicitAny: verification
			const result = callRes?.result as any;
			expect(result.resultType).toBeUndefined();
			expect(result.content[0].text).toBe("alpha result");
		});
	});

	describe("3. LiopMcpBridge Dual-Era Integration", () => {
		it("should respond to server/discover on LiopMcpBridge", async () => {
			const server = createTestServer();
			const bridge = new LiopMcpBridge(server);

			// biome-ignore lint/suspicious/noExplicitAny: verification
			const response = (await bridge.handleJsonRpcRequest({
				jsonrpc: "2.0",
				id: "bridge-discover",
				method: "server/discover",
				params: {},
			})) as any;

			expect(response.result.resultType).toBe("complete");
			expect(response.result.supportedVersions).toContain("2026-07-28");
		});

		it("should respond to initialize on LiopMcpBridge with 2025-11-25", async () => {
			const server = createTestServer();
			const bridge = new LiopMcpBridge(server);

			// biome-ignore lint/suspicious/noExplicitAny: verification
			const response = (await bridge.handleJsonRpcRequest({
				jsonrpc: "2.0",
				id: "bridge-init",
				method: "initialize",
				params: {},
			})) as any;

			expect(response.result.protocolVersion).toBe("2025-11-25");
			expect(response.result.resultType).toBeUndefined();
		});
	});

	describe("4. LiopClient Version Negotiation & Probe", () => {
		it("should identify modern era when server returns supported versions", async () => {
			const client = new LiopClient();

			// Mock global fetch to return a server/discover response
			const originalFetch = globalThis.fetch;
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					jsonrpc: "2.0",
					id: 1,
					result: {
						supportedVersions: [MCP_PROTOCOL_VERSION, "2025-11-25"],
					},
				}),
			}) as unknown as typeof fetch;

			try {
				const probe = await client.probeServerDiscover("http://localhost:3000/mcp");
				expect(probe.era).toBe("modern");
				expect(probe.protocolVersion).toBe("2026-07-28");
				expect(client.era).toBe("modern");
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		it("should fallback to legacy era if server/discover probe fails", async () => {
			const client = new LiopClient();

			const originalFetch = globalThis.fetch;
			globalThis.fetch = vi.fn().mockRejectedValue(new Error("404 Not Found"));

			try {
				const probe = await client.probeServerDiscover("http://localhost:3000/mcp");
				expect(probe.era).toBe("legacy");
				expect(probe.protocolVersion).toBe("2025-11-25");
				expect(client.era).toBe("legacy");
			} finally {
				globalThis.fetch = originalFetch;
			}
		});
	});

	describe("5. Sunset Compatibility & Seam Helpers", () => {
		it("isLegacyRequest should accurately classify requests", () => {
			expect(
				isLegacyRequest({
					jsonrpc: "2.0",
					method: "initialize",
				}),
			).toBe(true);

			expect(
				isLegacyRequest({
					jsonrpc: "2.0",
					method: "tools/list",
					params: {},
				}),
			).toBe(true);

			expect(
				isLegacyRequest({
					jsonrpc: "2.0",
					method: "tools/list",
					params: {
						_meta: {
							"io.modelcontextprotocol/protocolVersion": "2026-07-28",
						},
					},
				}),
			).toBe(false);
		});

		it("adaptResponseForLegacyClient should strip modern tags cleanly", () => {
			const modernResponse: McpResponse = {
				jsonrpc: "2.0",
				id: 123,
				result: {
					resultType: "complete",
					ttlMs: 300_000,
					cacheScope: "public",
					tools: [{ name: "test" }],
				},
			};

			const adapted = adaptResponseForLegacyClient(modernResponse);
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const res = adapted.result as any;

			expect(res.resultType).toBeUndefined();
			expect(res.ttlMs).toBeUndefined();
			expect(res.cacheScope).toBeUndefined();
			expect(res.tools).toEqual([{ name: "test" }]);
		});

		it("buildLegacyInitializeResponse should generate standard 2025 payload", () => {
			const init = buildLegacyInitializeResponse(
				{ name: "TestNode", version: "1.0.0" },
				"id-99",
			);
			expect(init.id).toBe("id-99");
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const res = init.result as any;
			expect(res.protocolVersion).toBe("2025-11-25");
			expect(res.capabilities.tools.listChanged).toBe(true);
		});

		it("MCP_LEGACY_SUPPORT_ENABLED constant should be true", () => {
			expect(MCP_LEGACY_SUPPORT_ENABLED).toBe(true);
		});
	});

	describe("6. Gateway Header Routing (SEP-2243)", () => {
		let gatewayServer: LiopServer;
		let gateway: LiopHybridGateway;
		let gatewayPort: number;

		beforeEach(async () => {
			gatewayServer = createTestServer();
			gateway = new LiopHybridGateway(gatewayServer);
			gatewayPort = await gateway.listen(0);
		});

		afterEach(async () => {
			await gateway.stop();
		});

		it("should succeed when Mcp-Method header matches JSON-RPC method", async () => {
			const res = await fetch(`http://127.0.0.1:${gatewayPort}/mcp`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Mcp-Method": "tools/list",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: "h1-1",
					method: "tools/list",
					params: {},
				}),
			});

			expect(res.status).toBe(200);
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const json = (await res.json()) as any;
			expect(json.result.tools).toBeDefined();
		});

		it("should reject with -32020 HeaderMismatch when Mcp-Method does not match body", async () => {
			const res = await fetch(`http://127.0.0.1:${gatewayPort}/mcp`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Mcp-Method": "resources/list",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: "h1-2",
					method: "tools/list",
					params: {},
				}),
			});

			expect(res.status).toBe(400);
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const json = (await res.json()) as any;
			expect(json.error.code).toBe(-32020);
			expect(json.error.message).toContain("HeaderMismatch");
		});

		it("should reject with -32020 HeaderMismatch when Mcp-Name does not match target name", async () => {
			const res = await fetch(`http://127.0.0.1:${gatewayPort}/mcp`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Mcp-Method": "tools/call",
					"Mcp-Name": "wrong_tool",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: "h1-3",
					method: "tools/call",
					params: { name: "alpha_calc" },
				}),
			});

			expect(res.status).toBe(400);
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const json = (await res.json()) as any;
			expect(json.error.code).toBe(-32020);
			expect(json.error.message).toContain("HeaderMismatch");
		});

		it("should allow legacy requests without Mcp-Method/Mcp-Name headers", async () => {
			const res = await fetch(`http://127.0.0.1:${gatewayPort}/mcp`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: "h1-legacy",
					method: "tools/list",
					params: {},
				}),
			});

			expect(res.status).toBe(200);
			// biome-ignore lint/suspicious/noExplicitAny: verification
			const json = (await res.json()) as any;
			expect(json.result.tools).toBeDefined();
		});
	});
});
