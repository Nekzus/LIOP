/**
 * LIOP Nexus Node — Bootstrap Seed (Production Package Audit)
 *
 * Runs the published @nekzus/liop package in a realistic WAN environment.
 * Sole purpose: Peer discovery and DHT seed.
 * Optional: GatewayInterceptor with TypeSafe Jev when TYPESAFE_API_KEY is present.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
	type AuditInterceptor,
	type GatewayInterceptor,
	type GatewayInterceptorOptions,
	type LogInterceptor,
	LiopHybridGateway,
	LiopServer,
	log,
} from "@nekzus/liop";

function configureProtocolInterceptors(server: LiopServer): void {
	const apiKey = process.env.TYPESAFE_API_KEY;
	if (!apiKey) {
		console.log(
			"[Nexus-Prod] No TYPESAFE_API_KEY — protocol interceptors disabled.",
		);
		return;
	}

	console.log(
		"[Nexus-Prod] TYPESAFE_API_KEY detected — LogInterceptor and AuditInterceptor active.",
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
						source: "liop_nexus_logger",
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
						source: "liop_nexus_audit_ledger",
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

	log.setInterceptor(logInterceptor);
	server.auditLogger.setInterceptor(auditInterceptor);
}

function buildJevInterceptor(): GatewayInterceptorOptions | undefined {
	const apiKey = process.env.TYPESAFE_API_KEY;
	if (!apiKey) {
		console.log("[Nexus-Prod] No TYPESAFE_API_KEY found — interceptor disabled.");
		return undefined;
	}

	console.log("[Nexus-Prod] TYPESAFE_API_KEY detected — Jev interceptor active.");

	const interceptor: GatewayInterceptor = async (request, context) => {
		if (request.method !== "tools/call") {
			return { allowed: true };
		}

		const payload = JSON.stringify(request.params);
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
					`[Nexus-Prod] Jev API non-OK status ${res.status} — bypassing per policy`,
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
					`[Nexus-Prod] Jev BLOCKED request: ${threatName} (noul=${data.answers?.is_malicious?.noul})`,
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
				`[Nexus-Prod] Interceptor evaluation error: ${err instanceof Error ? err.message : String(err)}`,
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
	const dataDir = "/app/data";
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	const liopServer = new LiopServer(
		{
			name: "LIOP-Nexus-Production",
			version: "2.5.0",
		},
		{
			auth: {
				role: "nexus",
			},
		},
	);

	configureProtocolInterceptors(liopServer);

	await liopServer.connectToMesh({
		port: 50051,
		meshConfig: {
			identityPath: path.join(dataDir, "nexus-identity.json"),
			listenAddresses: [
				"/ip4/0.0.0.0/tcp/4000",
				"/ip4/0.0.0.0/tcp/4001/ws",
			],
			bootstrapNodes: [], // Nexus is the seed
		},
	});

	const meshNode = liopServer.getMeshNode();
	if (meshNode) {
		const peerId = meshNode.getPeerId();
		const p2pAddr = `/ip4/127.0.0.1/tcp/15001/p2p/${peerId}`;
		fs.writeFileSync(path.join(dataDir, "nexus.multiaddr"), p2pAddr);
		console.log(`[Nexus-Prod] Industrial Beacon exported: ${p2pAddr}`);
	}

	const interceptorOptions = buildJevInterceptor();

	const gateway = new LiopHybridGateway(
		liopServer,
		liopServer.getMeshNode() || undefined,
		50051,
		undefined,
		interceptorOptions,
	);
	const port = await gateway.listen(3000);
	console.log(`[Nexus-Prod] Gateway active on port ${port}`);

	const shutdown = async () => {
		console.log("[Nexus-Prod] Shutdown signal received. Closing servers...");
		await gateway.stop();
		process.exit(0);
	};

	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);
}

main().catch((err) => {
	console.error("[Nexus-Prod] Fatal error in entrypoint:", err);
	process.exit(1);
});
