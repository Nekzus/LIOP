import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LiopServerOptions } from "../server/index.js";
import { LiopServer } from "../server/index.js";
import type { CallToolRequest, CallToolResult } from "../types.js";
import { log } from "../utils/logger.js";

export interface LiopBridgeOptions {
	publishToMesh?: boolean;
	meshIdentity?: string;
	serverInfo?: {
		name: string;
		version: string;
	};
	security?: LiopServerOptions["security"];
}

/**
 * LIOP MCP Bridge
 * A bi-directional bridge that allows legacy MCP servers to join the LIOP mesh,
 * or exposes a LIOP server as an MCP-compatible stdio process for tools like Claude Desktop.
 */
export class LiopMcpBridge {
	private liopServer: LiopServer | null = null;
	private legacyMcpServer: McpServer | null = null;
	constructor(
		source: LiopServer | McpServer,
		private options: LiopBridgeOptions = {},
	) {
		// Determine mode: Exposing LIOP to MCP (Claude) or Wrapping MCP to LIOP (Mesh)
		if (source instanceof LiopServer) {
			this.liopServer = source;
			log.info("[LIOP-Bridge] Mode: EXPOSE (LIOP -> MCP Stdio)");
		} else if (source instanceof McpServer) {
			this.legacyMcpServer = source;
			log.info("[LIOP-Bridge] Mode: WRAP (Legacy MCP -> LIOP Mesh)");
		}
	}

	/**
	 * Handles an incoming standard MCP JSON-RPC 2.0 payload.
	 * Pipes it to the underlying server (LIOP or Legacy MCP).
	 */
	public async handleJsonRpcRequest(
		payload: Record<string, unknown>,
	): Promise<unknown> {
		const id = payload.id as string | number;
		const method = payload.method as string;
		const params = payload.params as Record<string, unknown> | undefined;

		if (payload.jsonrpc !== "2.0") {
			return this.errorResponse(id, -32600, "Invalid Request");
		}

		// Mode: EXPOSE (Standard behavior used by Claude Desktop)
		if (this.liopServer) {
			return this.handleLiopToMcp(id, method, params);
		}

		// Mode: WRAP (Redirecting via internal LiopServer after connect())
		if (this.legacyMcpServer && this.liopServer) {
			return this.handleLiopToMcp(id, method, params);
		}

		return this.errorResponse(id, -32601, "Bridge source not configured");
	}

	private async handleLiopToMcp(
		id: string | number,
		method: string,
		params: Record<string, unknown> | undefined,
	): Promise<unknown> {
		if (!this.liopServer) return null;

		if (method === "initialize") {
			return this.successResponse(id, {
				protocolVersion: "2025-03-26",
				capabilities: {
					prompts: {},
					resources: {},
					tools: {},
				},
				serverInfo: this.liopServer.getServerInfo(),
			});
		}

		if (method === "notifications/initialized") return undefined;
		if (method === "ping") return this.successResponse(id, {});

		if (method === "tools/list") {
			const tools = this.liopServer.listTools();
			return this.successResponse(id, { tools });
		}

		if (method === "resources/list") {
			const resources = this.liopServer.listResources();
			return this.successResponse(id, { resources });
		}

		if (method === "prompts/list") {
			const prompts = this.liopServer.listPrompts();
			return this.successResponse(id, { prompts });
		}

		if (method === "prompts/get") {
			if (!params?.name) {
				return this.errorResponse(id, -32602, "Missing prompt name");
			}
			try {
				const result = await this.liopServer.getPrompt({
					name: params.name as string,
					arguments: params.arguments as Record<string, string> | undefined,
				});
				return this.successResponse(id, result);
			} catch (err: unknown) {
				return this.errorResponse(id, -32000, (err as Error).message);
			}
		}

		if (method === "resources/read") {
			if (!params?.uri) {
				return this.errorResponse(id, -32602, "Missing resource URI");
			}
			try {
				const result = await this.liopServer.readResource(params.uri as string);
				return this.successResponse(id, result);
			} catch (err: unknown) {
				return this.errorResponse(id, -32000, (err as Error).message);
			}
		}

		if (method === "tools/call") {
			if (!params?.name) {
				return this.errorResponse(id, -32602, "Missing tool name");
			}
			const request: CallToolRequest = {
				name: params.name as string,
				arguments: (params.arguments as Record<string, unknown>) || {},
			};

			try {
				const result: CallToolResult = await this.liopServer.callTool(request);
				const isVerified = await this.verifyZkReceipt(request, result);

				if (!isVerified) {
					return this.successResponse(id, {
						content: [
							{
								type: "text",
								text: "ALERT [LIOP ZERO-TRUST SHIELD] ZK Verification Failed. The mathematical ImageID does not match the original payload.",
							},
						],
						isError: true,
					});
				}

				return this.successResponse(id, result);
			} catch (err: unknown) {
				return this.errorResponse(id, -32000, (err as Error).message);
			}
		}

		return this.errorResponse(id, -32601, "Method not found");
	}

	private successResponse(
		id: string | number | null | undefined,
		result: unknown,
	) {
		return { jsonrpc: "2.0", id, result };
	}

	private errorResponse(id: string | number, code: number, message: string) {
		return { jsonrpc: "2.0", id, error: { code, message } };
	}

	private async verifyZkReceipt(
		request: CallToolRequest,
		result: CallToolResult,
	): Promise<boolean> {
		if (
			!request.arguments?.payload ||
			typeof request.arguments.payload !== "string"
		) {
			return true;
		}

		try {
			const payload = request.arguments.payload as string;
			const contentText = result.content[0]?.text;

			if (contentText && typeof contentText === "string") {
				try {
					const data = JSON.parse(contentText);

					if (data.image_id || data.zk_receipt) {
						// 1. Instantiate the Industrial Verifier ( backed by Piscina Worker Pool )
						const { LiopVerifier } = await import("../crypto/verifier.js");
						const verifier = new LiopVerifier();

						// 2. Delegate the heavy mathematical check (ZK Journal + Seal)
						const isAuthentic = await verifier.verifyZkReceipt(
							Buffer.from(payload, "utf-8"),
							data.image_id,
							Buffer.from(data.zk_receipt || "", "base64"),
						);

						if (!isAuthentic) {
							return false;
						}

						data.audit_status =
							"VERIFIED: ZK-Receipt & ImageID Mathematically Verified by LiopMcpBridge";
						result.content[0].text = JSON.stringify(data);
					}
				} catch {
					// Output not JSON
				}
			}
			return true;
		} catch (e) {
			log.info("[LIOP-Bridge] ZK-Verifier Failure:", e);
			return false;
		}
	}

	/**
	 * Connects the bridge via stdio or Mesh depending on mode.
	 */
	public async connect(): Promise<void> {
		// In WRAP mode, we actually need to create a LiopServer and join the mesh
		if (this.legacyMcpServer) {
			const { LiopServer } = await import("../server/index.js");
			this.liopServer = new LiopServer(
				this.options.serverInfo || {
					name: "liop-bridge",
					version: "1.0.0",
				},
				{ security: this.options.security },
			);

			if (this.options.publishToMesh) {
				await this.liopServer.connect();

				// Automatically Bridge Legacy Capabilities to LIOP Mesh
				// biome-ignore lint/suspicious/noExplicitAny: Internal legacy MCP properties are completely opaque and unexported
				const legacy = this.legacyMcpServer as any;

				// 1. Sync Tools
				if (legacy._registeredTools) {
					for (const [name, tool] of Object.entries(legacy._registeredTools)) {
						// biome-ignore lint/suspicious/noExplicitAny: Opaque legacy structure
						const t = tool as any;
						this.liopServer.tool(
							name,
							t.description || "",
							t.inputSchema || {},
							// biome-ignore lint/suspicious/noExplicitAny: Opaque legacy callback args
							async (args: any) => {
								return await t.handler(args);
							},
						);
					}
				}

				// 2. Sync Resources
				if (legacy._registeredResources) {
					for (const [uri, resource] of Object.entries(
						legacy._registeredResources,
					)) {
						// biome-ignore lint/suspicious/noExplicitAny: Opaque legacy structure
						const r = resource as any;
						this.liopServer.resource(
							r.name,
							uri,
							r.metadata?.description || "",
							r.metadata?.mimeType || "application/octet-stream",
							async () => {
								const res = await r.readCallback(new URL(uri));
								return res.contents[0].text;
							},
						);
					}
				}
			}
			return;
		}

		// In EXPOSE mode, listen to stdio (Claude Desktop)
		const readline = await import("node:readline");
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			terminal: false,
		});

		const shutdown = async () => {
			log.info("[LIOP-Bridge] Disconnecting session...");
			if (this.liopServer) await this.liopServer.close();
			process.exit(0);
		};

		rl.on("close", shutdown);
		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);

		rl.on("line", async (line) => {
			if (!line.trim()) return;
			try {
				const payload = JSON.parse(line);
				const response = await this.handleJsonRpcRequest(payload);
				if (response) {
					process.stdout.write(`${JSON.stringify(response)}\n`);
				}
			} catch (e: unknown) {
				log.error(`[LIOP-Bridge] Error: ${(e as Error).message}`);
			}
		});
	}
}

export * from "./stream.js";
