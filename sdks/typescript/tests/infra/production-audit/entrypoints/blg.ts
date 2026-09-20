/**
 * LIOP Border LIO Gateway (BLG) — Tier 1 / Tier 2 Perimeter Security Gateway
 *
 * Implements RFC 0001 and Sovereign Mesh Operations Manual:
 * - Multi-homed interface: sits between Tier 1 (Enclave with pnet PSK) and Tier 2 (Consortium).
 * - Asymmetric Data Boundary: Code enters via Guardian AST & Zero-Trust sandbox; raw data
 *   is strictly blocked from exiting (only differential-privacy aggregations with ZK-Receipts).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import {
	type AuditInterceptor,
	type GatewayInterceptor,
	type GatewayInterceptorOptions,
	type LogInterceptor,
	LiopHybridGateway,
	LiopServer,
	loadSwarmKey,
} from "@nekzus/liop";

async function configureProtocolInterceptors(server: LiopServer): Promise<void> {
	const apiKey = process.env.TYPESAFE_API_KEY;
	if (!apiKey) {
		console.log(
			"[BLG-Prod] No TYPESAFE_API_KEY — protocol interceptors disabled.",
		);
		return;
	}

	console.log(
		"[BLG-Prod] TYPESAFE_API_KEY detected — LogInterceptor and AuditInterceptor active.",
	);

	const logInterceptor: LogInterceptor = async (event) => {
		if (event.level !== "error") return;
		try {
			await fetch("https://api.typesafe.ai/v1/systemone", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model: "jev-latest",
					state: {
						source: "liop_blg_logger",
						level: event.level,
						message: event.message,
					},
					questions: {
						is_threat: {
							type: "noul",
							instructions:
								"Does this operational log message indicate an active security exploit or abnormal failure?",
						},
					},
				}),
			});
		} catch {
			// Fire-and-forget: ignore network / API errors
		}
	};

	const auditInterceptor: AuditInterceptor = async (entry) => {
		if (entry.status === "SUCCESS") return;
		try {
			await fetch("https://api.typesafe.ai/v1/systemone", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model: "jev-latest",
					state: {
						source: "liop_blg_audit_ledger",
						status: entry.status,
						toolName: entry.toolName,
						fuelConsumed: entry.fuelConsumed,
					},
					questions: {
						requires_alert: {
							type: "noul",
							instructions:
								"Does this non-success audit entry represent an incident requiring operator notification?",
						},
					},
				}),
			});
		} catch {
			// Fire-and-forget: ignore network / API errors
		}
	};

	try {
		const liopModule = (await import("@nekzus/liop")) as Record<string, unknown>;
		const logger = liopModule.log as { setInterceptor?: (fn: LogInterceptor) => void } | undefined;
		if (logger && typeof logger.setInterceptor === "function") {
			logger.setInterceptor(logInterceptor);
		}
	} catch {
		// Log export not available in current bundle
	}

	server.auditLogger.setInterceptor(auditInterceptor);
}

function buildJevInterceptor(): GatewayInterceptorOptions | undefined {
	const apiKey = process.env.TYPESAFE_API_KEY;
	if (!apiKey) {
		console.log("[BLG-Prod] No TYPESAFE_API_KEY found — interceptor disabled.");
		return undefined;
	}

	console.log("[BLG-Prod] TYPESAFE_API_KEY detected — Jev interceptor active.");

	const interceptor: GatewayInterceptor = async (request, context) => {
		if (request.method !== "tools/call") {
			return { allowed: true };
		}

		try {
			const res = await fetch("https://api.typesafe.ai/v1/systemone", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model: "jev-latest",
					state: {
						method: request.method,
						tool: (request.params as { name?: string })?.name,
						arguments: (request.params as { arguments?: unknown })?.arguments,
					},
					questions: {
						is_malicious: {
							type: "noul",
							instructions: "Is this tool invocation malicious or an attack?",
						},
						threat_type: {
							type: "choice",
							instructions: "What type of threat or request is this?",
							criteria: {
								sql_injection:
									"SQL injection attempt trying to modify or bypass database queries",
								path_traversal: "Directory traversal or file exfiltration syntax",
								legitimate: "Normal analytical or operational payload",
							},
						},
					},
				}),
				signal: context.signal,
			});

			if (!res.ok) {
				console.warn(
					`[BLG-Prod] Jev API non-OK status ${res.status} — bypassing per policy`,
				);
				return { allowed: true };
			}

			const data = (await res.json()) as {
				answers?: {
					is_malicious?: { noul: number };
					threat_type?: { choice: string };
				};
				model?: string;
			};

			const malicious = (data.answers?.is_malicious?.noul ?? 0) > 0.6;
			const threat =
				data.answers?.threat_type?.choice &&
				data.answers.threat_type.choice !== "legitimate";

			if (malicious || threat) {
				const threatName = data.answers?.threat_type?.choice || "malicious_payload";
				console.log(
					`[BLG-Prod] Jev BLOCKED request: ${threatName} (noul=${data.answers?.is_malicious?.noul})`,
				);
				return {
					allowed: false,
					reason: `Perimeter block by Jev: ${threatName}`,
					errorCode: -32099,
					metadata: { jevModel: data.model },
				};
			}

			return { allowed: true, metadata: { jevModel: data.model } };
		} catch (err: unknown) {
			console.warn(
				`[BLG-Prod] Interceptor evaluation error: ${err instanceof Error ? err.message : String(err)}`,
			);
			return { allowed: true };
		}
	};

	return {
		interceptor,
		timeoutMs: 3000,
		failMode: "open",
	};
}

async function main() {
	const dataDir = process.env.LIOP_DATA_DIR || "/app/data";
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	// 1. Load Tier 1 Enclave Swarm Key
	let swarmKey: Uint8Array | undefined;
	const pskPath = process.env.LIOP_SWARM_KEY_PATH || path.join(dataDir, "tier1.psk");
	if (fs.existsSync(pskPath)) {
		try {
			swarmKey = await loadSwarmKey(pskPath);
			console.log(`[BLG-Prod] 🔒 Tier 1 Enclave Swarm Key loaded from: ${pskPath}`);
		} catch (err) {
			console.warn(`[BLG-Prod] Warning: could not load Swarm Key:`, err);
		}
	}

	// 2. Initialize Border Gateway Server
	const blgServer = new LiopServer(
		{
			name: "PRODUCTION-border-lio-gateway",
			version: "2.5.0",
		},
		{
			tokenSlug: "BLG",
			auth: {
				role: "node",
				nexusUrl: process.env.LIOP_NEXUS_URL || "http://nexus:3000",
			},
			taxonomy: {
				domain: "Perimeter Security & Enclave Routing (BLG TIER 1/TIER 2 BRIDGE)",
				clearanceTier: 4,
				executionTypes: ["Enclave Relay", "Boundary Inspection", "ZK Verification"],
			},
		},
	);

	await configureProtocolInterceptors(blgServer);

	// Register BLG Perimeter Status Tool
	blgServer.tool(
		"BLG_Inspect_Enclave_Perimeter",
		"Inspects the physical and cryptographic perimeter defense metrics of the Tier 1 Enclave.",
		{},
		async () => {
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							gatewayRole: "Border LIO Gateway (BLG)",
							pnetStatus: swarmKey ? "ACTIVE_ENCLAVE_PSK_ISOLATION" : "UNENCRYPTED_INSECURE",
							tier1Subnet: "172.22.0.0/24",
							tier2Subnet: "172.23.0.0/24",
							defenseInDepth: [
								"Layer 1: Guardian AST",
								"Layer 2: WASI Sandbox",
								"Layer 3: Taint Analyzer (IFC)",
								"Layer 4: Egress PII Shield",
								"Layer 5: Aggregation-First Policy",
								"Layer 6: ZK-Receipt (HMAC-SHA256)",
								"Transport: pnet Swarm Key (95-byte PSK)",
							],
							boundaryPolicy: "Fail-Closed Asymmetric Compute In-situ",
						}),
					},
				],
			};
		},
	);

	// Register Proxy Ingestion Tool for Healthcare Analytics
	blgServer.tool(
		"BLG_Execute_Healthcare_Analytics",
		"Validates and forwards Logic-on-Origin compute envelopes into the Tier 1 Healthcare Test Enclave (operating on 2,500 local synthetic patient records via Analyze_Synthetic_Medical_Records for protocol security auditing).",
		{ envelope: z.string() },
		async (params: { envelope: string }) => {
			const targetVaultUrl = process.env.VAULT_INTERNAL_URL || "http://172.22.0.11:3000";
			const tokenVault = process.env.LIOP_TOKEN_VAULT || "vault-local-test-token";
			try {
				const response = await fetch(`${targetVaultUrl}/mcp`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${tokenVault}`,
					},
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: "blg-fwd-01",
						method: "tools/call",
						params: {
							name: "Analyze_Synthetic_Medical_Records",
							arguments: { payload: params.envelope },
						},
					}),
				});

				const json = (await response.json()) as Record<string, unknown>;
				const result = json.result as {
					content?: Array<{ type: "text" | "image" | "resource"; text?: string }>;
					isError?: boolean;
				};
				return {
					content: result?.content || [
						{ type: "text" as const, text: JSON.stringify(json) },
					],
					isError: result?.isError,
				};
			} catch (err: unknown) {
				return {
					content: [
						{
							type: "text" as const,
							text: `[BLG] Error routing compute to Tier 1 Enclave: ${err instanceof Error ? err.message : String(err)}`,
						},
					],
					isError: true,
				};
			}
		},
		{
			enforceAggregationFirst: true,
		},
	);

	// Register Proxy Ingestion Tool for Banking Analytics
	blgServer.tool(
		"BLG_Execute_Banking_Analytics",
		"Validates and forwards Logic-on-Origin compute envelopes into the Tier 1 Banking Test Enclave (operating on 1,500 local synthetic accounts via Analyze_Synthetic_Bank_Transactions for protocol security auditing).",
		{ envelope: z.string() },
		async (params: { envelope: string }) => {
			const targetBankUrl = process.env.BANK_INTERNAL_URL || "http://172.22.0.12:3000";
			const tokenBank = process.env.LIOP_TOKEN_BANK || "bank-local-test-token";
			try {
				const response = await fetch(`${targetBankUrl}/mcp`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${tokenBank}`,
					},
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: "blg-fwd-02",
						method: "tools/call",
						params: {
							name: "Analyze_Synthetic_Bank_Transactions",
							arguments: { payload: params.envelope },
						},
					}),
				});

				const json = (await response.json()) as Record<string, unknown>;
				const result = json.result as {
					content?: Array<{ type: "text" | "image" | "resource"; text?: string }>;
					isError?: boolean;
				};
				return {
					content: result?.content || [
						{ type: "text" as const, text: JSON.stringify(json) },
					],
					isError: result?.isError,
				};
			} catch (err: unknown) {
				return {
					content: [
						{
							type: "text" as const,
							text: `[BLG] Error routing compute to Tier 1 Enclave: ${err instanceof Error ? err.message : String(err)}`,
						},
					],
					isError: true,
				};
			}
		},
		{
			enforceAggregationFirst: true,
		},
	);

	// 3. Connect to Mesh
	// BLG acts as the Seed node for the Tier 1 Enclave mesh with Swarm Key
	const bootstrapSeed = process.env.LIOP_BOOTSTRAP_PEER;

	await blgServer.connectToMesh({
		port: 50051,
		meshConfig: {
			identityPath: path.join(dataDir, "blg-identity.json"),
			listenAddresses: ["/ip4/0.0.0.0/tcp/4000"],
			bootstrapNodes: bootstrapSeed ? [bootstrapSeed] : [],
			swarmKey, // Possesses Tier 1 PSK to communicate with enclaves
		},
	});

	const meshNode = blgServer.getMeshNode();
	if (!meshNode) throw new Error("MeshNode failed to initialize on BLG");

	await meshNode.announceCapability("liop:manifest");

	const interceptorOptions = buildJevInterceptor();

	const gateway = new LiopHybridGateway(
		blgServer,
		meshNode,
		50051,
		undefined,
		interceptorOptions,
	);
	const port = await gateway.listen(3000);
	console.log(`[BLG-Prod] Border LIO Gateway active on port ${port}`);

	// [SEC] Warm-up interceptor HTTP connection to eliminate TLS cold start
	if (interceptorOptions?.interceptor && process.env.TYPESAFE_API_KEY) {
		try {
			const warmupStart = performance.now();
			await fetch("https://api.typesafe.ai/v1/systemone", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
				},
				body: JSON.stringify({
					model: "jev-latest",
					state: { source: "warmup_probe_blg", type: "startup" },
					questions: {
						probe: { type: "noul", instructions: "Is this a warmup probe?" },
					},
				}),
			});
			console.log(
				`[BLG-Prod] Jev warm-up completed in ${(performance.now() - warmupStart).toFixed(0)}ms`,
			);
		} catch {
			console.warn(
				"[BLG-Prod] Jev warm-up failed — first request will have cold start",
			);
		}
	}

	const peerId = meshNode.getPeerId();
	const p2pAddr = `/ip4/127.0.0.1/tcp/15008/p2p/${peerId}`;
	fs.writeFileSync(path.join(dataDir, "blg.multiaddr"), p2pAddr);
	console.log(`[BLG-Prod] Border Gateway Beacon exported: ${p2pAddr}`);

	const shutdown = async () => {
		console.log("[BLG-Prod] Shutdown signal received. Closing servers...");
		await gateway.stop();
		process.exit(0);
	};

	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);
}

main().catch((err) => {
	console.error("[BLG-Prod] Fatal error in entrypoint:", err);
	process.exit(1);
});
