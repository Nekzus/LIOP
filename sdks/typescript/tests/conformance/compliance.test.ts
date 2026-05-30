import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { LiopServer } from "../../src/server/index.js";

/**
 * MCP Protocol Conformance Tests
 *
 * Validates that LiopServer strictly adheres to Model Context Protocol
 * specification for tools, resources, prompts, and server info.
 */
describe("MCP Protocol Conformance", () => {
	let server: LiopServer;

	beforeAll(() => {
		server = new LiopServer(
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
				server.tool("echo", "Duplicate", { text: z.string() }, async () => ({
					content: [{ type: "text", text: "" }],
				})),
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
			await expect(server.callTool({ name: "nonexistent" })).rejects.toThrow(
				"Tool not found: nonexistent",
			);
		});
	});

	describe("Resources", () => {
		it("should register and list resources with MCP-compliant fields", () => {
			server.resource(
				"TestDataset",
				"liop://test/dataset",
				"A test dataset",
				"application/json",
				'{"records": []}',
			);

			const resources = server.listResources();
			const dataset = resources.find((r) => r.uri === "liop://test/dataset");
			expect(dataset).toBeDefined();
			expect(dataset?.name).toBe("TestDataset");
			expect(dataset?.description).toBe("A test dataset");
			expect(dataset?.mimeType).toBe("application/json");
		});

		it("should reject duplicate URI registration", () => {
			expect(() =>
				server.resource("DuplicateDataset", "liop://test/dataset"),
			).toThrow("Resource URI already registered: liop://test/dataset");
		});

		it("should read resource content by URI", async () => {
			const result = await server.readResource("liop://test/dataset");
			expect(result.contents).toBeInstanceOf(Array);
			expect(result.contents[0].uri).toBe("liop://test/dataset");
			expect(result.contents[0].text).toBe('{"records": []}');
		});

		it("should throw for unknown URI", async () => {
			await expect(server.readResource("liop://unknown")).rejects.toThrow(
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
			expect(greeting?.description).toBe("Generates a greeting message");
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
				arguments: { name: "LIOP" },
			});
			expect(result.messages).toBeInstanceOf(Array);
			expect(result.messages[0].role).toBe("assistant");
			expect(result.messages[0].content).toHaveProperty("text", "Hello, LIOP!");
		});

		it("should throw for unknown prompt", async () => {
			await expect(server.getPrompt({ name: "nonexistent" })).rejects.toThrow(
				"Prompt not found",
			);
		});
	});

	describe("Zero-Shot Autonomy", () => {
		it("should register the liop_blind_analyst prompt", async () => {
			server.enableZeroShotAutonomy();
			const prompts = server.listPrompts();
			const blind = prompts.find((p) => p.name === "liop_blind_analyst");
			expect(blind).toBeDefined();
			expect(blind?.description).toContain("Logic-Injection-on-Origin Protocol");

			// Get the prompt content and verify it contains Laplace DP instructions
			const result = await server.getPrompt({ name: "liop_blind_analyst" });
			const userMsg = result.messages[0];
			expect(userMsg).toBeDefined();
			
			const content = userMsg.content;
			if (content.type !== "text") {
				throw new Error("Expected prompt content to be of type 'text'");
			}
			
			expect(content.text).toContain("LAPLACE DIFFERENTIAL PRIVACY (DP) COMPLIANCE");
			expect(content.text).toContain("Legitimate COUNT queries");
			expect(content.text).toContain("Legitimate AVERAGE queries");
			expect(content.text).toContain("Legitimate SUM queries");
		});
	});

	describe("LIOP Native Directives Configuration", () => {
		it("should inject $comment and register guidelines resource when dataDictionary is called", async () => {
			const schema: Record<string, unknown> = {
				type: "object",
				properties: {
					id: { type: "string" },
					amount: { type: "number" },
					date: { type: "string" },
				},
			};
			
			server.dataDictionary(schema, "Test Schema", "liop://schema/test-dict");
			
			// Verify $comment exists in the schema
			expect(schema).toHaveProperty("$comment");
			expect((schema as any).$comment).toContain("Date is undefined");
			
			// Verify guidelines resource was registered
			const resources = server.listResources();
			const guidelines = resources.find((r) => r.uri === "liop://schema/guidelines");
			expect(guidelines).toBeDefined();
			expect(guidelines?.name).toBe("LIOP Execution Guidelines");
			
			// Read the guidelines resource content
			const guidelinesContent = await server.readResource("liop://schema/guidelines");
			expect(guidelinesContent.contents[0].text).toContain("DATE POISONING & FILTERING WORKAROUND");
			expect(guidelinesContent.contents[0].text).toContain("K-ANONYMITY CONSTRAINTS");
			expect(guidelinesContent.contents[0].text).toContain("DIFFERENTIAL PRIVACY SUFFIXES");
		});

		it("should serve updated liop_blind_analyst with Date poisoning and refined K-Anonymity rules", async () => {
			const result = await server.getPrompt({ name: "liop_blind_analyst" });
			const userMsg = result.messages[0];
			
			const content = userMsg.content;
			if (content.type !== "text") {
				throw new Error("Expected prompt content to be of type 'text'");
			}
			
			expect(content.text).toContain("SANDBOX RUNTIME");
			expect(content.text).toContain("The 'Date' class/constructor is poisoned");
			expect(content.text).toContain("K-ANONYMITY THRESHOLDS");
			expect(content.text).toContain("Dataset < 10 records: Maximum of 3 scalar output fields");
		});

		it("should serve updated liop://protocol/envelope-spec with runtime restrictions and k-anonymity", async () => {
			const spec = await server.readResource("liop://protocol/envelope-spec");
			const content = spec.contents[0].text;
			expect(content).toBeDefined();
			expect(content).toContain("SANDBOX RUNTIME RESTRICTIONS & WORKAROUNDS");
			expect(content).toContain("Date is poisoned: The 'Date' class/constructor is undefined");
			expect(content).toContain("K-ANONYMITY THRESHOLDS");
			expect(content).toContain("Small Datasets (< 10 records): Maximum of 3 scalar output fields");
		});
	});
});
