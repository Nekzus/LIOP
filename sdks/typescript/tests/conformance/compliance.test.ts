import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { NmpServer } from "../../src/server/index.js";
import { z } from "zod";

/**
 * MCP Protocol Conformance Tests
 *
 * Validates that NmpServer strictly adheres to Model Context Protocol
 * specification for tools, resources, prompts, and server info.
 */
describe("MCP Protocol Conformance", () => {
	let server: NmpServer;

	beforeAll(() => {
		server = new NmpServer(
			{
				name: "ConformanceTestServer",
				version: "1.0.0",
				capabilities: {
					tools: { listChanged: true },
					resources: { subscribe: false, listChanged: true },
					prompts: { listChanged: true },
				},
			},
			{
				capabilities: {
					tools: { listChanged: true },
					resources: { subscribe: false, listChanged: true },
					prompts: { listChanged: true },
				},
			},
		);
	});

	afterAll(async () => {
		await server.close();
	});

	describe("ServerInfo", () => {
		it("should expose name and version per MCP spec", () => {
			const info = server.getServerInfo();
			expect(info.name).toBe("ConformanceTestServer");
			expect(info.version).toBe("1.0.0");
		});

		it("should expose capabilities object per MCP spec", () => {
			const info = server.getServerInfo();
			expect(info.capabilities).toBeDefined();
			expect(info.capabilities?.tools).toBeDefined();
			expect(info.capabilities?.resources).toBeDefined();
			expect(info.capabilities?.prompts).toBeDefined();
		});
	});

	describe("Tools", () => {
		it("should register a tool with name, description, and JSON input schema", () => {
			server.tool(
				"echo",
				"Returns the input text",
				{ text: z.string() },
				async (args) => ({
					content: [{ type: "text", text: args.text }],
				}),
			);

			const tools = server.listTools();
			const echo = tools.find((t) => t.name === "echo");
			expect(echo).toBeDefined();
			expect(echo?.description).toBe("Returns the input text");
			expect(echo?.inputSchema).toHaveProperty("type", "object");
			expect(echo?.inputSchema).toHaveProperty("properties");
		});

		it("should reject duplicate tool registration", () => {
			expect(() =>
				server.tool(
					"echo",
					"Duplicate",
					{ text: z.string() },
					async () => ({ content: [{ type: "text", text: "" }] }),
				),
			).toThrow("Tool already registered: echo");
		});

		it("should return CallToolResult with content array on success", async () => {
			const result = await server.callTool({
				name: "echo",
				arguments: { text: "hello" },
			});
			expect(result.content).toBeInstanceOf(Array);
			expect(result.content.length).toBeGreaterThan(0);
			expect(result.content[0].type).toBe("text");
			expect(result.content[0].text).toBe("hello");
			expect(result.isError).toBeUndefined();
		});

		it("should return isError with validation error for invalid args", async () => {
			const result = await server.callTool({
				name: "echo",
				arguments: { text: 12345 },
			});
			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain("Validation Error");
		});

		it("should return isError for unknown tool", async () => {
			await expect(
				server.callTool({ name: "nonexistent" }),
			).rejects.toThrow("Tool not found: nonexistent");
		});
	});

	describe("Resources", () => {
		it("should register and list resources with MCP-compliant fields", () => {
			server.resource(
				"TestDataset",
				"nmp://test/dataset",
				"A test dataset",
				"application/json",
				'{"records": []}',
			);

			const resources = server.listResources();
			const dataset = resources.find(
				(r) => r.uri === "nmp://test/dataset",
			);
			expect(dataset).toBeDefined();
			expect(dataset?.name).toBe("TestDataset");
			expect(dataset?.description).toBe("A test dataset");
			expect(dataset?.mimeType).toBe("application/json");
		});

		it("should reject duplicate URI registration", () => {
			expect(() =>
				server.resource("DuplicateDataset", "nmp://test/dataset"),
			).toThrow("Resource URI already registered: nmp://test/dataset");
		});

		it("should read resource content by URI", () => {
			const result = server.readResource("nmp://test/dataset");
			expect(result.contents).toBeInstanceOf(Array);
			expect(result.contents[0].uri).toBe("nmp://test/dataset");
			expect(result.contents[0].text).toBe('{"records": []}');
		});

		it("should throw for unknown URI", () => {
			expect(() => server.readResource("nmp://unknown")).toThrow(
				"Resource not found",
			);
		});
	});

	describe("Prompts", () => {
		it("should register and list prompts with MCP-compliant fields", () => {
			server.prompt(
				"greeting",
				"Generates a greeting message",
				[
					{
						name: "name",
						description: "The name to greet",
						required: true,
					},
				],
				(request) => ({
					description: "A friendly greeting",
					messages: [
						{
							role: "assistant",
							content: {
								type: "text",
								text: `Hello, ${request.arguments?.name || "world"}!`,
							},
						},
					],
				}),
			);

			const prompts = server.listPrompts();
			const greeting = prompts.find((p) => p.name === "greeting");
			expect(greeting).toBeDefined();
			expect(greeting?.description).toBe(
				"Generates a greeting message",
			);
			expect(greeting?.arguments).toHaveLength(1);
			expect(greeting?.arguments?.[0].name).toBe("name");
		});

		it("should reject duplicate prompt registration", () => {
			expect(() =>
				server.prompt("greeting", "Duplicate", [], () => ({
					messages: [],
				})),
			).toThrow("Prompt already registered: greeting");
		});

		it("should execute prompt handler and return messages", async () => {
			const result = await server.getPrompt({
				name: "greeting",
				arguments: { name: "NMP" },
			});
			expect(result.messages).toBeInstanceOf(Array);
			expect(result.messages[0].role).toBe("assistant");
			expect(result.messages[0].content).toHaveProperty(
				"text",
				"Hello, NMP!",
			);
		});

		it("should throw for unknown prompt", async () => {
			await expect(
				server.getPrompt({ name: "nonexistent" }),
			).rejects.toThrow("Prompt not found");
		});
	});

	describe("Zero-Shot Autonomy", () => {
		it("should register the nmp_blind_analyst prompt", () => {
			server.enableZeroShotAutonomy();
			const prompts = server.listPrompts();
			const blind = prompts.find(
				(p) => p.name === "nmp_blind_analyst",
			);
			expect(blind).toBeDefined();
			expect(blind?.description).toContain(
				"Neural Mesh Protocol",
			);
		});
	});
});
