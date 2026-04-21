import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as grpc from "@grpc/grpc-js";
import { FixedQueue, Piscina } from "piscina";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { type LiopManifest, MeshNode } from "../mesh/node.js";
import { LiopRpcServer } from "../rpc/server.js";
import type { LogicRequest, LogicResponse } from "../rpc/types.js";
import type {
	CallToolRequest,
	CallToolResult,
	GetPromptRequest,
	GetPromptResult,
	Prompt,
	Resource,
	ServerInfo,
	Tool,
} from "../types.js";
import { log } from "../utils/logger.js";
import { mcpCompactToolDescriptions } from "../utils/mcpCompact.js";
import { PII_PATTERNS, PII_PRESETS, type PiiRule, PiiScanner } from "./pii.js";

export { PII_PATTERNS, PII_PRESETS, type PiiRule, PiiScanner };

/**
 * When enabled, `payload` tools that are not LIOP v1 envelopes are passed through to the
 * registered handler unchanged (no worker extraction). Default off for strict protocol tests.
 */
function respectPlainToolPayload(): boolean {
	const v = process.env.LIOP_RESPECT_PLAIN_TOOL_PAYLOAD?.toLowerCase().trim();
	return v === "1" || v === "true" || v === "yes";
}

export type ToolHandler<T extends z.ZodRawShape = z.ZodRawShape> = (
	args: z.infer<z.ZodObject<T>>,
	extra: { signal?: AbortSignal },
) => Promise<CallToolResult>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface LiopServerOptions {
	capabilities?: Record<string, unknown>;
	workerPool?: {
		enabled?: boolean;
		minThreads?: number;
		maxThreads?: number;
		idleTimeout?: number;
	};
	security?: {
		piiPatterns?: PiiRule[];
		forbiddenKeys?: string[];
	};
	taxonomy?: {
		domain?: string;
		clearanceTier?: number;
		executionTypes?: string[];
	};
}

export interface LogicExecutionPolicy {
	/**
	 * Validate the business payload returned by sandbox logic (post-execution).
	 * This runs before final egress checks and blocks non-conforming outputs.
	 */
	outputSchema?: z.ZodType<unknown>;
	/**
	 * Enforce aggregation-first heuristics (preflight + post-check).
	 */
	enforceAggregationFirst?: boolean;
	/**
	 * Optional additional deny patterns checked against extracted logic source.
	 */
	preflightDenyPatterns?: RegExp[];
}

export class LiopServer {
	private logicCache: Map<string, { hash: string; timestamp: number }> =
		new Map();
	private connectionStats: Map<
		string,
		{ failures: number; lastAttempt: number }
	> = new Map();
	private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
	private readonly THROTTLE_THRESHOLD = 5;
	private readonly THROTTLE_COOLDOWN_MS = 60 * 1000; // 60 seconds

	private tools: Map<
		string,
		{
			tool: Tool;
			// biome-ignore lint/suspicious/noExplicitAny: Erased at runtime
			handler: ToolHandler<any>;
			// biome-ignore lint/suspicious/noExplicitAny: Erased at runtime
			schema: z.ZodObject<any>;
			policy?: LogicExecutionPolicy;
		}
	> = new Map();
	private resources: Map<
		string,
		Resource & { content?: string | (() => Promise<string>) }
	> = new Map();
	private prompts: Map<
		string,
		{
			prompt: Prompt;
			handler: (
				request: GetPromptRequest,
			) => GetPromptResult | Promise<GetPromptResult>;
		}
	> = new Map();
	private activeSchema: Record<string, unknown> | null = null;
	private sandboxRecords: Record<string, unknown>[] = [];

	private piiScanner: PiiScanner;
	private workerPool: Piscina;
	private meshNode: MeshNode | null = null;
	private rpcServer: LiopRpcServer | null = null;
	private boundPort: number | null = null;
	private sessions: Map<
		string,
		{ capability_hash: string; kyber_sk: Uint8Array }
	> = new Map();

	private static readonly LIOP_LOGIC_REGEX =
		/\s*LIOP_MAGIC:0x00FF\s*\n?\s*MANIFEST:(?<manifest>\{[\s\S]*?\})\s*\n?\s*---BEGIN_LOGIC---\n?(?<logic>[\s\S]*?)\n?---END_LOGIC---/m;

	private extractLogic(payload: string): string | null {
		const match = payload.match(LiopServer.LIOP_LOGIC_REGEX);
		return match?.groups?.logic ? match.groups.logic.trim() : null;
	}

	private parseUnknownJson(input: unknown): unknown {
		if (typeof input !== "string") return input;
		const trimmed = input.trim();
		if (
			(trimmed.startsWith("{") && trimmed.endsWith("}")) ||
			(trimmed.startsWith("[") && trimmed.endsWith("]"))
		) {
			try {
				return JSON.parse(trimmed);
			} catch {
				return input;
			}
		}
		return input;
	}

	private runPreflightPolicy(
		_toolName: string,
		logic: string,
		policy?: LogicExecutionPolicy,
	): string | null {
		if (!policy) return null;
		const compact = logic.replace(/\s+/g, " ");

		if (policy.enforceAggregationFirst) {
			const rowExtractionPatterns = [
				/return\s+env\.records\b/i,
				/return\s*\{[\s\S]*\b(accounts|patients|rows|records)\s*:\s*env\.records/i,
			];
			if (rowExtractionPatterns.some((p) => p.test(compact))) {
				return "Preflight policy rejected: potential row-level export pattern detected.";
			}
		}

		if (policy.preflightDenyPatterns?.some((p) => p.test(compact))) {
			return "Preflight policy rejected: custom deny pattern matched.";
		}

		return null;
	}

	private validateOutputPolicy(
		toolName: string,
		output: unknown,
		policy?: LogicExecutionPolicy,
	): string | null {
		if (!policy) return null;
		const parsed = this.parseUnknownJson(output);

		if (policy.outputSchema) {
			const schemaResult = policy.outputSchema.safeParse(parsed);
			if (!schemaResult.success) {
				// Include a truncated preview of the rejected value so the LLM can self-correct
				const preview =
					typeof parsed === "string"
						? parsed.slice(0, 200)
						: JSON.stringify(parsed).slice(0, 200);
				return `[LIOP] Output schema violation for ${toolName}: ${schemaResult.error.issues
					.map((i) => `${i.path.join(".") || "<root>"} ${i.message}`)
					.join(
						"; ",
					)}. Rejected value: ${preview}. HINT: Use 'env.records' to access the dataset inside your logic.`;
			}
		}

		if (
			policy.enforceAggregationFirst &&
			this.violatesAggregationFirstPolicy(
				this.unwrapForAggregationPolicyScan(parsed),
			)
		) {
			return "Aggregation-First Policy (row-level export blocked)";
		}

		return null;
	}

	/**
	 * Proxied tools stringify a full MCP CallToolResult (`{ content: [...] }`).
	 * Aggregation-first heuristics must scan the inner business JSON, not the MCP envelope
	 * (otherwise `content` looks like a tabular array of objects and everything blocks).
	 */
	private unwrapForAggregationPolicyScan(input: unknown): unknown {
		if (typeof input === "string") {
			const trimmed = input.trim();
			if (
				(trimmed.startsWith("{") && trimmed.endsWith("}")) ||
				(trimmed.startsWith("[") && trimmed.endsWith("]"))
			) {
				try {
					return this.unwrapForAggregationPolicyScan(JSON.parse(trimmed));
				} catch {
					return input;
				}
			}
			return input;
		}

		if (!input || typeof input !== "object") {
			return input;
		}

		const rec = input as Record<string, unknown>;
		if (!Array.isArray(rec.content) || rec.content.length === 0) {
			return input;
		}

		const texts: string[] = [];
		for (const part of rec.content) {
			if (part && typeof part === "object" && "text" in part) {
				const t = (part as { text?: unknown }).text;
				if (typeof t === "string") {
					texts.push(t);
				}
			}
		}
		if (texts.length === 0) {
			return input;
		}

		const joined = texts.length === 1 ? texts[0] : texts.join("\n");
		return this.unwrapForAggregationPolicyScan(joined);
	}

	private violatesAggregationFirstPolicy(input: unknown): boolean {
		if (typeof input === "string") {
			const trimmed = input.trim();
			if (
				(trimmed.startsWith("{") && trimmed.endsWith("}")) ||
				(trimmed.startsWith("[") && trimmed.endsWith("]"))
			) {
				try {
					return this.violatesAggregationFirstPolicy(JSON.parse(trimmed));
				} catch {
					return false;
				}
			}
			return false;
		}

		if (Array.isArray(input)) {
			if (input.length > 0 && input.every((item) => typeof item === "object")) {
				// Treat tabular row export as non-aggregated leakage risk.
				return true;
			}
			return input.some((item) => this.violatesAggregationFirstPolicy(item));
		}

		if (input && typeof input === "object") {
			return Object.values(input as Record<string, unknown>).some((value) =>
				this.violatesAggregationFirstPolicy(value),
			);
		}

		return false;
	}

	constructor(
		private serverInfo: ServerInfo,
		private config?: LiopServerOptions,
	) {
		this.piiScanner = new PiiScanner(
			this.config?.security?.piiPatterns ?? PII_PRESETS.GLOBAL_STRICT,
			this.config?.security?.forbiddenKeys ?? [
				"id",
				"name",
				"fullName",
				"firstName",
				"lastName",
				"address",
				"street",
				"city",
				"postalCode",
				"zipCode",
				"phone",
				"email",
				"ssn",
				"accountHolder",
				"accountNumber",
				"account_number",
				"password",
				"token",
				"secret",
				"privateKey",
			],
		);

		// Initialize Zero-Blocking Worker Pool for Heavy Cryptography & Sandboxing
		const isTS = import.meta.url.endsWith(".ts");
		const workerExt = isTS ? ".ts" : ".js";

		let execArgv: string[] = [];
		if (isTS) {
			try {
				const req = createRequire(import.meta.url);
				const tsxPkg = req.resolve("tsx/package.json");
				const absoluteTsx = pathToFileURL(
					path.join(path.dirname(tsxPkg), "dist", "loader.mjs"),
				).href;
				execArgv = ["--import", absoluteTsx];
			} catch (_e) {
				execArgv = ["--import", "tsx"];
			}
		}

		const isTest = process.env.NODE_ENV === "test" || process.env.VITEST;

		// Sync capabilities to serverInfo for MCP Handshakes
		if (this.config?.capabilities && !this.serverInfo.capabilities) {
			this.serverInfo.capabilities = this.config.capabilities as Record<
				string,
				unknown
			>;
		}

		this.workerPool = new Piscina({
			filename: path.resolve(
				__dirname,
				`../workers/logic-execution${workerExt}`,
			),
			minThreads: this.config?.workerPool?.minThreads ?? (isTest ? 0 : 2),
			maxThreads: this.config?.workerPool?.maxThreads ?? (isTest ? 1 : 8),
			idleTimeout:
				this.config?.workerPool?.idleTimeout ?? (isTest ? 500 : 5000),
			maxQueue: "auto",
			taskQueue: new FixedQueue(),
			execArgv,
		});
	}

	/**
	 * Convenience alias for connectToMesh(), matching official documentation.
	 */
	public async connect(
		options: {
			port?: number;
			meshConfig?: {
				listenAddresses?: string[];
				bootstrapNodes?: string[];
				identityPath?: string;
			};
		} = {},
	): Promise<void> {
		return this.connectToMesh(options);
	}

	/**
	 * Register a new Tool
	 */
	public tool<T extends z.ZodRawShape>(
		name: string,
		description: string,
		shape: T,
		handler: ToolHandler<T>,
		policy?: LogicExecutionPolicy,
	): void {
		if (this.tools.has(name)) {
			throw new Error(`Tool already registered: ${name}`);
		}

		const schema = z.object(shape);
		const generatedSchema = zodToJsonSchema(schema);

		let finalDescription = description;
		let finalHandler = handler;

		// LIOP Zero-Shot Autonomy Middleware: Detect Logic-on-Origin tools
		if (shape.payload && shape.payload instanceof z.ZodString) {
			const blockedKeys = this.config?.security?.forbiddenKeys || [];

			if (mcpCompactToolDescriptions()) {
				finalDescription +=
					"\n\nPayload: LIOP v1 envelope string (sandboxed WASI execution on the data origin).\n" +
					"REQUIRED FORMAT:\n" +
					'LIOP_MAGIC:0x00FF\nMANIFEST:{"target":"wasi_v1","name":"AnalysisTask","integrity_checks":true}\n---BEGIN_LOGIC---\nreturn { total: env.records.length };\n---END_LOGIC---\n' +
					"Access dataset via env.records (Array of objects). Return an aggregated object. Do NOT export row-level arrays.";
				if (blockedKeys.length > 0) {
					finalDescription += `\nDo not reference fields: ${blockedKeys.join(", ")}.`;
				}
			} else {
				finalDescription += `\n\n[LIOP-PROTO-V1: LOGIC-ON-ORIGIN SPECIFICATION]\nCRITICAL: This tool requires a strictly formatted Logic-on-Origin payload. Failure to wrap JavaScript code within the LIOP envelope will result in a MalformedPayloadError.\n\nREQUIRED FORMAT:\nLIOP_MAGIC:0x00FF\nMANIFEST:{"target":"wasi_v1","name":"[ModuleName]","integrity_checks":true}\n---BEGIN_LOGIC---\n// Pure JavaScript logic. Access data via 'env.records'.\n// You MUST use 'return' to output results.\n---END_LOGIC---\n\nExecution Environment: Zero-Trust WASI Sandbox (Node.js Worker Pool).`;

				if (blockedKeys.length > 0) {
					finalDescription += `\n// SECURITY RESTRICTION: Do NOT include any of the following fields: ${blockedKeys.join(", ")}`;
				}
			}

			if (this.activeSchema) {
				finalDescription += `\n\nSTRICT SCHEMA ADHERENCE:\nThe 'env.records' array contains objects with the EXACT following structure. ONLY use these fields. Do NOT guess or use fallbacks (e.g. do not use 'gender' if not listed below):\n${JSON.stringify(this.activeSchema, null, 2)}`;
			}

			finalDescription += `\n\nOptional: You can include an "__liop_bypass_ast_cache" boolean parameter set to true to force AST re-evaluation.`;

			finalHandler = async (
				args: z.infer<z.ZodObject<T>>,
				_extra: { signal?: AbortSignal },
			) => {
				const clientId = "global_connection"; // Simplify for now, treating the instance as one connection
				const now = Date.now();
				const stats = this.connectionStats.get(clientId) || {
					failures: 0,
					lastAttempt: 0,
				};

				if (
					stats.failures >= this.THROTTLE_THRESHOLD &&
					now - stats.lastAttempt < this.THROTTLE_COOLDOWN_MS
				) {
					return {
						content: [
							{
								type: "text",
								text: "LIOP_THROTTLED: Too many violations. Cooling down for 60 seconds.",
							},
						],
						isError: true,
					};
				}

				const payloadValue = (args as Record<string, unknown>)
					.payload as string;
				const bypassCache =
					(args as Record<string, unknown>).__liop_bypass_ast_cache === true;

				const payloadHash = crypto
					.createHash("sha256")
					.update(payloadValue)
					.digest("hex");
				const logic = this.extractLogic(payloadValue);
				const cached = this.logicCache.get(payloadHash);

				if (
					!bypassCache &&
					cached &&
					now - cached.timestamp < this.CACHE_TTL_MS
				) {
					// Hash verified. Skips boundaries check (already validated!). Extract logic directly.
					if (logic) {
						(args as Record<string, unknown>).payload = logic;

						// DELEGATE TO WORKER POOL: Parallel PQC & Sandboxing
						const preflightReason = this.runPreflightPolicy(
							name,
							logic,
							policy,
						);
						if (preflightReason) {
							return {
								content: [{ type: "text", text: preflightReason }],
								isError: true,
							};
						}
						return await this.executeInWorkerPool(args, logic, name);
					}
				}

				if (!logic) {
					if (respectPlainToolPayload()) {
						return await handler(args as z.infer<z.ZodObject<T>>, _extra);
					}
					stats.failures++;
					stats.lastAttempt = now;
					this.connectionStats.set(clientId, stats);
					return {
						content: [
							{
								type: "text",
								text: 'Error: Malformed payload. Missing LIOP_MAGIC, MANIFEST, or boundaries.\nYou MUST wrap your logic exactly like this:\n\nLIOP_MAGIC:0x00FF\nMANIFEST:{"target":"wasi_v1","name":"DynamicAudit","integrity_checks":true}\n---BEGIN_LOGIC---\n// Your JS code here\n---END_LOGIC---',
							},
						],
						isError: true,
					};
				}

				try {
					// Logic check already performed above, extraction is guaranteed at this point.
					// biome-ignore lint/style/noNonNullAssertion: safe extraction after check
					const logic = this.extractLogic(
						(args as Record<string, unknown>).payload as string,
					)!;
					// Extract pure logic and deliver it to the developer's function
					(args as Record<string, unknown>).payload = logic;

					// DELEGATE TO WORKER POOL: Parallel PQC & Sandboxing (Includes PII Shield)
					const preflightReason = this.runPreflightPolicy(name, logic, policy);
					if (preflightReason) {
						stats.failures++;
						stats.lastAttempt = now;
						this.connectionStats.set(clientId, stats);
						return {
							content: [{ type: "text", text: preflightReason }],
							isError: true,
						};
					}

					const result = await this.executeInWorkerPool(args, logic, name);

					if (!result.isError) {
						this.connectionStats.set(clientId, {
							failures: 0,
							lastAttempt: now,
						});
						this.logicCache.set(payloadHash, {
							hash: payloadHash,
							timestamp: now,
						});
					} else {
						stats.failures++;
						stats.lastAttempt = now;
						this.connectionStats.set(clientId, stats);
					}

					return result;
				} catch (error: unknown) {
					const e = error as Error;
					stats.failures++;
					stats.lastAttempt = now;
					this.connectionStats.set(clientId, stats);
					return {
						content: [
							{ type: "text", text: `ExecutionRuntimeException: ${e.message}` },
						],
						isError: true,
					};
				}
			};
		}

		const inputSchema = {
			type: "object",
			properties: (generatedSchema as Record<string, unknown>).properties || {},
			required: (generatedSchema as Record<string, unknown>).required,
		};

		this.tools.set(name, {
			tool: { name, description: finalDescription, inputSchema },
			handler: finalHandler,
			schema,
			policy,
		});

		// [LIOP-ALPHA] Auto-announce capability to the Mesh P2P DHT if node is active
		if (this.meshNode) {
			this.meshNode.announceCapability(name).catch((err) => {
				log.info(
					`[LIOP-Mesh] Failed to auto-announce tool ${name}: ${err.message}`,
				);
			});
		}
	}

	/**
	 * Register a dynamic prompt
	 */
	public prompt(
		name: string,
		description: string | undefined,
		args: Prompt["arguments"],
		handler: (
			request: GetPromptRequest,
		) => GetPromptResult | Promise<GetPromptResult>,
	): void {
		if (this.prompts.has(name)) {
			throw new Error(`Prompt already registered: ${name}`);
		}
		this.prompts.set(name, {
			prompt: { name, description, arguments: args },
			handler,
		});
	}

	/**
	 * Enables LIOP Zero-Shot Autonomy by registering the Blind Analyst standard prompt.
	 */
	public enableZeroShotAutonomy(): void {
		this.prompt(
			"liop_blind_analyst",
			"The official Logic-Injection-on-Origin Protocol system prompt. Instructs the LLM on how to securely inject Logic-on-Origin without violating PII or safety constraints.",
			[],
			(_request) => {
				return {
					description: "LIOP Blind Analyst Instructions",
					messages: [
						{
							role: "user",
							content: {
								type: "text",
								text: `You are the "Blind Analyst" operating within the Logic-Injection-on-Origin Protocol (LIOP) ecosystem.
Your objective is to perform secure Logic-on-Origin injections. You must process remote data without ever requesting its extraction.

INDUSTRIAL CONSTRAINTS & PROTOCOL RULES:
1. DATA PRIVACY: NEVER attempt to export Personally Identifiable Information (PII). The LIOP Egress Shield will block any response containing raw IDs, names, or addresses.
2. AGGREGATION FIRST: Always prefer returning counts, averages, or anonymized summaries.
3. PAYLOAD ENCAPSULATION: Your JavaScript payloads MUST strictly adhere to the LIOPv1 Envelope. DO NOT include markdown backticks or leading text inside the 'payload' argument.
   Structure:
   LIOP_MAGIC:0x00FF
   MANIFEST:{"target":"wasi_v1","name":"AnalysisTask","integrity_checks":true}
   ---BEGIN_LOGIC---
   // Your JS Code Here
   ---END_LOGIC---
4. RUNTIME SCOPE: The execution environment provides a global 'env' object. Use 'env.records' to access the target dataset.
5. LOCALIZATION: Format all JSON response keys in the language used by the user in their query (e.g., use Spanish keys if the query is in Spanish).
6. SCHEMA RIGIDITY: Only use fields defined in the 'Data Dictionary'. Usage of non-existent fields will trigger a sandbox runtime exception.${
									this.activeSchema
										? `\n\nCURRENT DATA DICTIONARY (STRICT):\n${JSON.stringify(this.activeSchema, null, 2)}`
										: ""
								}

Protocol Adherence is mandatory for successful execution.`,
							},
						},
					],
				};
			},
		);
	}

	/**
	 * Register a dynamic resource
	 */
	public resource(
		name: string,
		uri: string,
		description?: string,
		mimeType?: string,
		content?: string | (() => Promise<string>),
	): void {
		if (this.resources.has(uri)) {
			throw new Error(`Resource URI already registered: ${uri}`);
		}
		this.resources.set(uri, { name, uri, description, mimeType, content });
	}

	/**
	 * Broadcasts the Data Dictionary to the LLM prior to code injection.
	 */
	public dataDictionary(
		schema: Record<string, unknown>,
		name: string = "Global Medical Data Dictionary",
		uri: string = "liop://schema/global",
		description: string = "Exposes the internal database schema for Zero-Shot Autonomy planning",
	): void {
		this.activeSchema = schema;

		// Retroactively update tool descriptions for already registered tools
		for (const [toolName, entry] of this.tools.entries()) {
			if (
				entry.schema.shape.payload &&
				entry.schema.shape.payload instanceof z.ZodString &&
				entry.tool.description &&
				!entry.tool.description.includes("STRICT SCHEMA ADHERENCE")
			) {
				entry.tool.description += `\n\nSTRICT SCHEMA ADHERENCE:\nThe 'env.records' array contains objects with the EXACT following structure. ONLY use these fields. Do NOT guess or use fallbacks (e.g. do not use 'gender' if not listed below):\n${JSON.stringify(schema, null, 2)}`;
				this.tools.set(toolName, entry);
			}
		}

		this.resource(
			name,
			uri,
			description,
			"application/json",
			JSON.stringify(schema, null, 2),
		);
	}

	/**
	 * Manually invalidates the AST Logic Cache (e.g. for Zero-Day patches).
	 */
	public clearAstCache(): void {
		this.logicCache.clear();
		log.info("[LIOP-SDK] AST Security Cache cleared by Admin.");
	}

	/**
	 * Emulates calling a tool (used locally or via LIOPMcpBridge)
	 */
	public async callTool(request: CallToolRequest): Promise<CallToolResult> {
		const entry = this.tools.get(request.name);
		if (!entry) {
			throw new Error(`Tool not found: ${request.name}`);
		}

		try {
			// Validate inputs natively with Zod before execution
			const parsedArgs = entry.schema.parse(request.arguments || {});

			// Re-inject the bypass flag if present since Zod might strip unrecognized keys
			if (
				(request.arguments as Record<string, unknown>)
					?.__liop_bypass_ast_cache === true
			) {
				(parsedArgs as Record<string, unknown>).__liop_bypass_ast_cache = true;
			}

			// [LOGIC-ON-ORIGIN] Intercept code injection directly
			if (
				parsedArgs &&
				typeof (parsedArgs as Record<string, unknown>).payload === "string"
			) {
				const payload = (parsedArgs as Record<string, unknown>)
					.payload as string;
				const logic = this.extractLogic(payload);
				if (logic) {
					const preflightReason = this.runPreflightPolicy(
						request.name,
						logic,
						entry.policy,
					);
					if (preflightReason) {
						return {
							content: [{ type: "text", text: preflightReason }],
							isError: true,
						};
					}
					(parsedArgs as Record<string, unknown>).payload = logic;
					return await this.executeInWorkerPool(
						parsedArgs,
						logic,
						request.name,
					);
				}
			}

			const result = await entry.handler(parsedArgs, {});
			return result;
		} catch (error: unknown) {
			const e = error as Error;
			if (e instanceof z.ZodError) {
				return {
					content: [{ type: "text", text: `Validation Error: ${e.message}` }],
					isError: true,
				};
			}
			return {
				content: [
					{ type: "text", text: `Internal Execution Error: ${e.message}` },
				],
				isError: true,
			};
		}
	}

	/**
	 * Retrieves registered tools
	 */
	public listTools(): Tool[] {
		return Array.from(this.tools.values()).map((t) => t.tool);
	}

	/**
	 * Retrieves registered prompts
	 */
	public listPrompts(): Prompt[] {
		return Array.from(this.prompts.values()).map((p) => p.prompt);
	}

	/**
	 * Gets a specific prompt by name
	 */
	public async getPrompt(request: GetPromptRequest): Promise<GetPromptResult> {
		const entry = this.prompts.get(request.name);
		if (!entry) {
			throw new Error(`Prompt not found: ${request.name}`);
		}
		return await entry.handler(request);
	}

	/**
	 * Retrieves registered resources
	 */
	public listResources(): Resource[] {
		return Array.from(this.resources.values());
	}

	/**
	 * Reads a specific resource by URI
	 */
	public async readResource(uri: string): Promise<{
		contents: Array<{ uri: string; mimeType?: string; text: string }>;
	}> {
		const resource = this.resources.get(uri);
		if (!resource) {
			throw new Error(`Resource not found: ${uri}`);
		}

		let text = "No description provided";
		if (typeof resource.content === "function") {
			text = await resource.content();
		} else if (typeof resource.content === "string") {
			text = resource.content;
		} else if (resource.description) {
			text = resource.description;
		}

		return {
			contents: [
				{
					uri: resource.uri,
					mimeType: resource.mimeType || "text/plain",
					text,
				},
			],
		};
	}

	public getServerInfo(): ServerInfo {
		return this.serverInfo;
	}

	public getMeshNode(): MeshNode | null {
		return this.meshNode;
	}

	/**
	 * Injects data into the secure sandbox context for Logic-on-Origin tools.
	 */
	public setSandboxData(records: Record<string, unknown>[]) {
		this.sandboxRecords = records;
	}

	public getBoundPort(): number | null {
		return this.boundPort;
	}

	/**
	 * Connects to the libp2p Kademlia DHT and announces capabilities.
	 * Boots the gRPC server for secure Logic-on-Origin.
	 */
	public async connectToMesh(
		options: {
			port?: number;
			meshConfig?: {
				listenAddresses?: string[];
				bootstrapNodes?: string[];
				identityPath?: string;
			};
		} = {},
	): Promise<void> {
		const envPort = process.env.LIOP_GRPC_PORT
			? Number.parseInt(process.env.LIOP_GRPC_PORT, 10)
			: undefined;
		const port = options.port ?? envPort ?? 50051;

		// 1. Initialize Mesh Node (Discovery)
		this.meshNode = new MeshNode(options.meshConfig);
		await this.meshNode.start();

		// 2. Register LIOP Manifest Protocol Handler
		// This allows remote peers to query our tool/resource metadata dynamically.
		const meshNodeRef = this.meshNode;
		this.meshNode.registerManifestHandler((): LiopManifest => {
			const tools = this.listTools().map((t) => ({
				name: t.name,
				description: t.description,
				inputSchema: t.inputSchema as Record<string, unknown>,
			}));

			const resources = Array.from(this.resources.values()).map((r) => ({
				name: r.name,
				uri: r.uri,
				description: r.description,
				mimeType: r.mimeType,
				text: typeof r.content === "string" ? r.content : r.description,
			}));

			return {
				peerId: meshNodeRef.getPeerId(),
				grpcPort: port,
				tools,
				resources,
				serverInfo: this.serverInfo,
			};
		});

		// 3. Announce local tools to the DHT
		for (const tool of this.listTools()) {
			await this.meshNode.announceCapability(tool.name).catch(log.info);
		}

		// 4. Announce manifest availability
		await this.meshNode.announceManifest().catch(log.info);

		// 5. Initialize gRPC Server (Execution)
		this.rpcServer = new LiopRpcServer();

		this.rpcServer.addService({
			negotiateIntent: (call, callback) => {
				const request = call.request;
				log.info(
					`[LIOP-RPC] Negotiating intent for capability: ${request.capability_hash}`,
				);

				// Standard dynamic import to avoid potential circularity
				import("../rpc/crypto/kyber.js").then(async ({ Kyber768Wrapper }) => {
					const { publicKey, secretKey } =
						await Kyber768Wrapper.generateKeyPair();

					const sessionToken = crypto.randomUUID();
					this.sessions.set(sessionToken, {
						capability_hash: request.capability_hash,
						kyber_sk: secretKey,
					});

					callback(null, {
						accepted: true,
						session_token: sessionToken,
						error_message: "",
						kyber_public_key: publicKey,
					});
				});
			},
			executeLogic: async (
				call: grpc.ServerWritableStream<LogicRequest, LogicResponse>,
			) => {
				const request = call.request;
				log.info(
					`[LIOP-RPC] Executing Logic-on-Origin for session: ${request.session_token}`,
				);

				const session = this.sessions.get(request.session_token);
				if (!session) {
					call.emit("error", {
						code: grpc.status.UNAUTHENTICATED,
						details: "Invalid session token",
					});
					return;
				}

				try {
					// Pass to Worker Pool for PQC Decryption and WASI/V8 execution
					const workerResponse = await this.workerPool.run({
						ciphertext: request.pqc_ciphertext,
						secretKeyObj: Array.from(session.kyber_sk),
						wasmBinary: request.wasm_binary,
						inputs: request.inputs,
						aesNonce: request.aes_nonce,
						records: this.sandboxRecords,
						sessionToken: request.session_token,
						isEncrypted: true,
					});

					let finalOutput: string;
					try {
						finalOutput =
							typeof workerResponse.output === "string"
								? workerResponse.output
								: JSON.stringify(workerResponse.output);

						// [PROTOCOL TRANSFORMER] Support for Proxied Tool Calls
						const decoded = JSON.parse(finalOutput);
						if (decoded.__liop_proxy_tool) {
							log.info(
								`[LIOP-RPC] Executing Proxied Tool: ${decoded.__liop_proxy_tool}`,
							);
							const toolResult = await this.callTool({
								name: decoded.__liop_proxy_tool,
								arguments: decoded.__liop_proxy_args || {},
							});
							finalOutput = JSON.stringify(toolResult);
						}
					} catch {
						finalOutput = String(workerResponse.output);
					}

					const response: LogicResponse = {
						semantic_evidence: finalOutput,
						cryptographic_proof: Buffer.from(
							workerResponse.image_id || "",
							"hex",
						),
						zk_receipt: workerResponse.zk_receipt
							? Buffer.from(workerResponse.zk_receipt, "base64")
							: Buffer.from(""),
						is_error: false,
					};

					// Final PII check for gRPC egress
					const violation = this.piiScanner.scan([
						{ type: "text", text: finalOutput },
					]);
					const aggregationViolation = this.violatesAggregationFirstPolicy(
						this.unwrapForAggregationPolicyScan(finalOutput),
					);
					if (violation || aggregationViolation) {
						const reason =
							violation ||
							"Aggregation-First Policy (row-level export blocked)";
						log.info(
							`[LIOP-RPC] Secure egress blocked in gRPC stream: ${reason}`,
						);
						response.semantic_evidence = `[LIOP] Egress Security Violation. Output blocked due to policy enforcement (${reason}).`;
						response.is_error = true;
					}

					call.write(response, () => {
						call.end();
					});
				} catch (error: unknown) {
					const e = error as Error;
					log.error(`[LIOP-RPC] Execution Error: ${e.message}`);

					// Send error response before closing, avoiding "stream closed without results"
					const errorResponse: LogicResponse = {
						semantic_evidence: `Execution Error: ${e.message}`,
						cryptographic_proof: Buffer.from(""),
						zk_receipt: Buffer.from(""),
						is_error: true,
					};

					try {
						call.write(errorResponse, () => {
							call.end();
						});
					} catch (_writeErr) {
						call.end();
					}
				}
			},
		});

		this.boundPort = await this.rpcServer.listen(port);
		log.info(
			`[LIOP-SDK] Node successfully announced to Mesh. PeerID: ${this.meshNode.getPeerId()}`,
		);
	}

	/**
	 * Internal worker execution with Egress Filtering logic.
	 */
	private async executeInWorkerPool(
		_args: Record<string, unknown>,
		rawPayload: string,
		toolName?: string,
	): Promise<CallToolResult> {
		try {
			// Transparent local execution without dynamic PQC
			const workerResponse = await this.workerPool.run({
				ciphertext: new Uint8Array(0),
				secretKeyObj: Array.from(new Uint8Array(0)),
				kyberPublicKey: new Uint8Array(0),
				wasmBinary: Buffer.from(rawPayload),
				inputs: {},
				records: this.sandboxRecords,
				sessionToken: "local-dev-token",
				isEncrypted: false, // Use plaintext for local Logic-on-Origin injection
			});

			// Standard MCP Content Array
			const textOutput = JSON.stringify({
				computation_result: workerResponse.output,
				image_id: workerResponse.image_id,
				zk_receipt: workerResponse.zk_receipt,
				status: "Worker Pool Execution Success",
			});

			const content = [
				{
					type: "text" as const,
					text: textOutput,
				},
			];

			const toolPolicy = toolName
				? this.tools.get(toolName)?.policy
				: undefined;
			const policyViolation = this.validateOutputPolicy(
				toolName || "unknown_tool",
				workerResponse.output,
				toolPolicy,
			);
			if (policyViolation) {
				log.info(
					`[LIOP-SDK] Output policy blocked for ${toolName || "unknown_tool"}: ${policyViolation}`,
				);
				return {
					content: [{ type: "text", text: `[LIOP] ${policyViolation}` }],
					isError: true,
				};
			}

			// Professional PII Protection Guard
			const violation = this.piiScanner.scan(content);
			const aggregationViolation = this.violatesAggregationFirstPolicy(
				workerResponse.output,
			);
			if (violation || aggregationViolation) {
				const reason =
					violation || "Aggregation-First Policy (row-level export blocked)";
				log.info(
					`[LIOP-SDK] Secure egress blocked in local execution: ${reason}`,
				);
				return {
					content: [
						{
							type: "text",
							text: `[LIOP] Egress Security Violation. Output blocked due to policy enforcement (${reason}).`,
						},
					],
					isError: true,
				};
			}

			return { content };
		} catch (error: unknown) {
			const e = error as Error;
			return {
				content: [
					{
						type: "text",
						text: `WorkerPoolError: ${e.message || String(error)}`,
					},
				],
				isError: true,
			};
		}
	}

	/**
	 * Safely destroys the worker pool, gRPC server, and Mesh node.
	 * Recommended to be called during graceful shutdowns or test teardowns.
	 */
	public async close(): Promise<void> {
		if (this.workerPool) {
			await this.workerPool.close({ force: true });
		}
		if (this.rpcServer) {
			await this.rpcServer.stop();
		}
		if (this.meshNode) {
			await this.meshNode.stop();
		}
	}
}
