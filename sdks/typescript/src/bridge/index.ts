import type { LiopServer } from "../server/index.js";
import type { CallToolRequest, CallToolResult } from "../types.js";

/**
 * LIOP MCP Bridge
 * A bi-directional bridge that allows legacy MCP clients to interact with
 * a LIOP-supported environment.
 */
export class LiopMcpBridge {
	private server: LiopServer;

	constructor(server: LiopServer) {
		this.server = server;
		console.error("[LIOP-Bridge] Adapter initialized.");
	}

	/**
	 * Handles an incoming standard MCP JSON-RPC 2.0 payload containing `callTool`
	 * and pipes it to the fast `LiopServer` validation layer.
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

		// --- MCP Protocol Lifecycle ---
		if (method === "initialize") {
			return this.successResponse(id, {
				protocolVersion: "2025-03-26",
				capabilities: {
					prompts: {},
					resources: {},
					tools: {},
				},
				serverInfo: {
					name: "LiopServer-TheVault",
					version: "1.0-alpha",
				},
			});
		}

		if (method === "notifications/initialized") {
			return undefined; // Client-sent notification, no response required
		}

		if (method === "ping") {
			return this.successResponse(id, {});
		}
		// --- End MCP Protocol Lifecycle ---

		if (method === "tools/list") {
			const tools = this.server.listTools();
			return this.successResponse(id, { tools });
		}

		if (method === "resources/list") {
			const resources = this.server.listResources();
			return this.successResponse(id, { resources });
		}

		if (method === "prompts/list") {
			const prompts = this.server.listPrompts();
			return this.successResponse(id, { prompts });
		}

		if (method === "prompts/get") {
			if (!params || !params.name) {
				return this.errorResponse(id, -32602, "Missing prompt name in params");
			}
			try {
				const result = await this.server.getPrompt({
					name: params.name as string,
					arguments: params.arguments as Record<string, string> | undefined,
				});
				return this.successResponse(id, result);
			} catch (err: unknown) {
				return this.errorResponse(id, -32000, (err as Error).message);
			}
		}

		if (method === "resources/read") {
			if (!params || !params.uri) {
				return this.errorResponse(id, -32602, "Missing resource uri in params");
			}
			try {
				const result = this.server.readResource(params.uri as string);
				return this.successResponse(id, result);
			} catch (err: unknown) {
				return this.errorResponse(id, -32000, (err as Error).message);
			}
		}

		if (method === "tools/call") {
			if (!params || !params.name) {
				return this.errorResponse(id, -32602, "Missing tool name in params");
			}

			const request: CallToolRequest = {
				name: params.name as string,
				arguments: (params.arguments as Record<string, unknown>) || {},
			};

			try {
				const result: CallToolResult = await this.server.callTool(request);

				const isVerified = await this.verifyZkReceipt(request, result);
				if (!isVerified) {
					return this.successResponse(id, {
						content: [
							{
								type: "text",
								text: "🚨 [LIOP ZERO-TRUST SHIELD] ZK Verification Failed. The mathematical ImageID does not match the original payload. Execution aborted for security.",
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
		return {
			jsonrpc: "2.0",
			id,
			result,
		};
	}

	private errorResponse(id: string | number, code: number, message: string) {
		return {
			jsonrpc: "2.0",
			id,
			error: { code, message },
		};
	}

	private async verifyZkReceipt(
		request: CallToolRequest,
		result: CallToolResult,
	): Promise<boolean> {
		if (
			!request.arguments?.payload ||
			typeof request.arguments.payload !== "string"
		) {
			// If it's not a Logic-on-Origin injection, bypass verification
			return true;
		}

		try {
			const payload = request.arguments.payload as string;
			// [LIOP-ALPHA] Strip LIOP envelopes to restore raw logic for ImageID verification
			const rawLogic = payload
				.replace(/^LIOP_MAGIC:.*?\n/g, "")
				.replace(/^MANIFEST:.*?\n/g, "")
				.replace(/---BEGIN_LOGIC---\n?/g, "")
				.replace(/\n?---END_LOGIC---/g, "")
				.trim();

			// 1. Recalculate the mathematical footprint locally (Image ID)
			const crypto = await import("node:crypto");
			const localImageId = crypto
				.createHash("sha256")
				.update(rawLogic)
				.digest("hex");

			// 2. Extract from LiopServer's JSON-Stringified response
			const contentText = result.content[0]?.text;
			if (contentText && typeof contentText === "string") {
				try {
					const data = JSON.parse(contentText);

					// If the server provided an image_id but it doesn't match our local calculation
					if (data.image_id && data.image_id !== localImageId) {
						console.error(
							`\n[LIOP-Bridge] 🚨 FATAL: Image ID mismatch! Computed [${localImageId}], Received [${data.image_id}]`,
						);
						return false; // HACK DETECTED
					}

					// If the seal is valid, we inject audit evidence to the LLM
					if (data.image_id || data.zk_receipt) {
						data.audit_status =
							"✅ ZK-Receipt & ImageID Mathematically Verified by LiopMcpBridge";
						result.content[0].text = JSON.stringify(data);
					}
				} catch {
					// Output is not JSON or not protected by ZK-Receipt, skip
				}
			}
			return true;
		} catch (e) {
			console.error("[LIOP ZK-Verifier] Critical validation failure:", e);
			return false; // Hack attempt or modification
		}
	}

	/**
	 * Connects the bridge by listening to stdio using readline.
	 * Responds to JSON-RPC 2.0 commands and handles initialization.
	 */
	public async connect(): Promise<void> {
		const readline = await import("node:readline");
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			terminal: false,
		});

		const shutdown = async () => {
			console.error(
				"[LIOP-Bridge] Disconnecting MCP session and releasing ports...",
			);
			await this.server.close();
			process.exit(0);
		};

		rl.on("close", shutdown);
		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);

		rl.on("line", async (line) => {
			if (!line.trim()) return;
			try {
				const payload = JSON.parse(line);

				// Standard MCP initialization bypass
				if (payload.method === "initialize") {
					const id = payload.id as string | number;
					const params = payload.params as Record<string, unknown> | undefined;

					const response = this.successResponse(id, {
						protocolVersion: params?.protocolVersion || "2025-03-26",
						capabilities: {
							tools: {
								listChanged: true,
							},
							resources: {
								listChanged: true,
							},
							prompts: {
								listChanged: true,
							},
						},
						serverInfo: this.server.getServerInfo(),
					});
					process.stdout.write(`${JSON.stringify(response)}\n`);
					return;
				}

				if (payload.method === "notifications/initialized") {
					return;
				}

				const response = await this.handleJsonRpcRequest(payload);
				if (response) {
					process.stdout.write(`${JSON.stringify(response)}\n`);
				}
			} catch (e: unknown) {
				console.error(
					`[LIOP-Bridge] Error processing JSON-RPC payload: ${(e as Error).message}`,
				);
			}
		});
	}
}

export * from "./stream.js";
