// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { TokenTelemetryEngine } from "@nekzus/liop";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { validateHostHeader } from "../security/sanitizer.js";
import { createTransport } from "../transports/index.js";
import type {
	ScanReport,
	StudioTransport,
	TargetConnectionConfig,
} from "../transports/transport.interface.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
	port?: number;
	initialTarget?: TargetConnectionConfig;
	distPath?: string;
}

export function createStudioServer(options: ServerOptions = {}) {
	const app = new Hono();
	const port = options.port || 16000;
	const distPath = options.distPath || path.resolve(__dirname, "../../ui/dist");

	// Active transport state
	let activeConfig: TargetConnectionConfig = options.initialTarget || {
		type: "http",
		http: { url: process.env.LIOP_MCP_URL || "http://127.0.0.1:15000/mcp" },
	};
	let activeTransport: StudioTransport = createTransport(activeConfig);
	let lastReport: ScanReport | null = null;

	// Host Header Validation Guard
	app.use("*", async (c, next) => {
		const host = c.req.header("host");
		if (
			host &&
			!validateHostHeader(host, ["localhost", "127.0.0.1", "0.0.0.0"])
		) {
			return c.text(
				"Forbidden: Invalid Host header (DNS Rebinding Defense)",
				403,
			);
		}
		return next();
	});

	// Static UI assets
	app.use(
		"/*",
		serveStatic({
			root: path.relative(process.cwd(), distPath).replace(/\\/g, "/"),
			rewriteRequestPath: (pathStr) => {
				if (
					!pathStr.includes(".") &&
					!pathStr.startsWith("/api") &&
					pathStr !== "/health"
				) {
					return "/index.html";
				}
				return pathStr;
			},
		}),
	);

	// Liveness & health
	app.get("/health", (c) => {
		const isConnected =
			activeTransport.isConnected() && lastReport?.status === "online";
		return c.json({
			status: isConnected ? "healthy" : "offline",
			version: "1.0.0",
			targetType: activeConfig.type,
			connected: isConnected,
		});
	});

	app.get("/api/health", async (c) => {
		if (!lastReport) {
			lastReport = await activeTransport.scan().catch(() => null);
		}
		const isConnected =
			activeTransport.isConnected() && lastReport?.status === "online";
		return c.json({
			status: isConnected ? "healthy" : "offline",
			targetType: activeConfig.type,
			connected: isConnected,
			toolsCount: isConnected ? lastReport?.totalTools || 0 : 0,
			latencyMs: isConnected ? lastReport?.latencyMs || 0 : 0,
			version: "1.0.0",
			serverInfo: lastReport?.serverInfo,
		});
	});

	// Connect / Switch target endpoint
	app.post("/api/connect", async (c) => {
		try {
			const body = (await c.req.json()) as TargetConnectionConfig;
			if (!body.type) {
				return c.json({ error: "Missing required 'type' parameter" }, 400);
			}

			// Disconnect previous
			await activeTransport.disconnect().catch(() => {});

			activeConfig = body;
			activeTransport = createTransport(body);
			try {
				await activeTransport.connect();
			} catch {
				// Failed connect handled in scan
			}
			lastReport = await activeTransport.scan();

			return c.json({
				success:
					activeTransport.isConnected() && lastReport.status === "online",
				report: lastReport,
			});
		} catch (err: unknown) {
			return c.json(
				{ error: err instanceof Error ? err.message : String(err) },
				500,
			);
		}
	});

	// Scan / Topology endpoint
	app.get("/api/scan", async (c) => {
		try {
			lastReport = await activeTransport.scan();
			return c.json(lastReport);
		} catch (err: unknown) {
			return c.json(
				{ error: err instanceof Error ? err.message : String(err) },
				500,
			);
		}
	});

	app.get("/api/nodes", async (c) => {
		const force = c.req.query("force") === "true";
		if (force || !lastReport) {
			lastReport = await activeTransport.scan().catch(() => null);
		}
		const nodes = lastReport?.nodes || [];
		const onlineNodes = nodes.filter((n) => n.status === "online").length;
		const tier1Count = nodes.filter(
			(n) => n.tier === 1 && n.status === "online",
		).length;
		const tier2Count = nodes.filter(
			(n) => n.tier === 2 && n.status === "online",
		).length;
		const tier3Count = nodes.filter(
			(n) => n.tier === 3 && n.status === "online",
		).length;
		const avgLatency = onlineNodes > 0 ? lastReport?.latencyMs || 0 : 0;
		return c.json({
			summary: {
				totalNodes: nodes.length,
				onlineNodes,
				offlineNodes: nodes.length - onlineNodes,
				avgLatencyMs: avgLatency,
				byTier: {
					tier1: tier1Count,
					tier2: tier2Count,
					tier3: tier3Count,
				},
			},
			nodes,
		});
	});

	// Tools discovery
	app.get("/api/discover", async (c) => {
		try {
			const tools = await activeTransport.listTools();
			return c.json({ tools });
		} catch (err: unknown) {
			return c.json(
				{ error: err instanceof Error ? err.message : String(err) },
				500,
			);
		}
	});

	app.get("/api/tools", async (c) => {
		try {
			const tools = await activeTransport.listTools();
			return c.json({ tools });
		} catch (err: unknown) {
			return c.json(
				{ error: err instanceof Error ? err.message : String(err) },
				500,
			);
		}
	});

	// Telemetry endpoint
	app.get("/api/telemetry", (c) => {
		const engine = TokenTelemetryEngine.getInstance();
		return c.json({
			session: engine.getReport(),
			timestamp: Date.now(),
		});
	});

	// Execution stream (SSE)
	app.post("/api/execute", async (c) => {
		const body = await c.req.json();
		const tool = body.tool || body.name;
		const logic = body.logic || body.code || "";
		const args = body.args || body.arguments || {};

		return streamSSE(c, async (stream) => {
			const sendStep = async (
				phase: string,
				detail: string,
				status: "pending" | "running" | "success" | "failed",
				durationMs?: number,
			) => {
				await stream.writeSSE({
					data: JSON.stringify({
						type: "step",
						phase,
						detail,
						status,
						durationMs,
					}),
					event: "message",
				});
			};

			try {
				const availableTools = await activeTransport.listTools();
				const isSupported =
					availableTools.length === 0 ||
					availableTools.some(
						(t) =>
							t.name.toLowerCase() === tool?.toLowerCase() ||
							t.name.toLowerCase().replace(/_/g, "") ===
								tool?.toLowerCase().replace(/_/g, ""),
					);

				if (!isSupported) {
					const supportedNames = availableTools.map((t) => t.name).join(", ");
					await sendStep(
						"discovery",
						`Capability '${tool}' rejected: not exposed by target`,
						"failed",
						0,
					);
					await stream.writeSSE({
						data: JSON.stringify({
							type: "error",
							payload: {
								title: "Capability Mismatch (Execution Discarded)",
								desc: `Tool '${tool}' is not available on the active target. Available capabilities on target: [${supportedNames}]. Execution was discarded to maintain zero-trust integrity.`,
							},
							meta: { latencyMs: 0, tool },
						}),
						event: "message",
					});
					return;
				}

				const result = await activeTransport.callTool(
					tool,
					args,
					logic,
					sendStep,
				);

				await stream.writeSSE({
					data: JSON.stringify(result),
					event: "message",
				});
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				await sendStep("execution", errMsg, "failed", 0);
				await stream.writeSSE({
					data: JSON.stringify({
						type: "error",
						payload: { title: "Execution Error", desc: errMsg },
						meta: { latencyMs: 0, tool },
					}),
					event: "message",
				});
			}
		});
	});

	return {
		app,
		start: () => {
			console.log(
				`[LIOP-Studio] Sovereign Studio active on http://127.0.0.1:${port}`,
			);
			return serve({ fetch: app.fetch, port });
		},
	};
}
