import * as crypto from "node:crypto";
import { LiopVerifier } from "../crypto/verifier.js";
import { TokenTelemetryEngine } from "../economy/telemetry.js";
import type { LiopManifest, MeshNode } from "../mesh/index.js";
import { Kyber768Wrapper } from "../rpc/crypto/kyber.js";
import { liopV1 } from "../rpc/proto.js";
import { createChannelCredentials } from "../rpc/tls.js";
import type { IntentResponse, LogicResponse } from "../rpc/types.js";
import type { LiopServer } from "../server/index.js";
import type { McpRequest, McpResponse } from "../types.js";
import { log } from "../utils/logger.js";
import {
	mcpCompactToolDescriptions,
	stripVerboseLiopToolDescription,
} from "../utils/mcpCompact.js";

/**
 * Time-to-live for cached manifests (seconds).
 * Aligned with libp2p Kademlia DHT TABLE_REFRESH_INTERVAL (5 minutes).
 * Provider records in the DHT are valid for 48 hours (PROVIDERS_VALIDITY),
 * so 300s is a conservative, network-friendly value.
 */
const MANIFEST_CACHE_TTL_S = 300;

/** Maximum number of DHT query retries for manifest discovery */
const MANIFEST_DISCOVERY_RETRIES = 5;

/**
 * LIOP MCP Router
 *
 * Core logic for routing MCP requests to local or remote LIOP providers.
 * Decoupled from transport (HTTP/Stdio).
 *
 * All tool discovery and port resolution is DYNAMIC via the
 * /liop/manifest/1.0.0 protocol stream over Kademlia DHT.
 */
export class LiopMcpRouter {
	/** Cached manifests from remote peers. Key = PeerID */
	private manifestCache: Map<
		string,
		{ manifest: LiopManifest; cachedAt: number }
	> = new Map();

	/** Guards against concurrent discovery storms */
	private currentDiscovery: Promise<void> | null = null;

	/** Verifier for Tier-0 integrity checks */
	public verifier: LiopVerifier = new LiopVerifier();

	/** Callback when new remote tools are discovered */
	public onToolsChanged?: () => void;

	/** Circuit-breaker state for peers that repeatedly fail manifest queries. */
	private manifestFailureState: Map<
		string,
		{ failures: number; cooldownUntil: number; lastSkipLogAt: number }
	> = new Map();

	private static readonly MANIFEST_FAILURE_BASE_COOLDOWN_MS = 15_000;
	private static readonly MANIFEST_FAILURE_MAX_COOLDOWN_MS = 5 * 60_000;
	private static readonly MANIFEST_SKIP_LOG_THROTTLE_MS = 30_000;

	constructor(
		private liopServer: LiopServer,
		private meshNode: MeshNode | null = null,
		private defaultRpcPort = 50051,
	) {
		// Auto-register manifest handler if mesh node is provided
		if (this.meshNode) {
			this.meshNode.registerManifestHandler(() => {
				const remoteTools = this.liopServer.listTools().map((t) => ({
					name: t.name,
					description: t.description,
					inputSchema: t.inputSchema as Record<string, unknown>,
				}));

				const resources = this.liopServer.listResources().map((r) => ({
					name: r.name,
					uri: r.uri,
					description: r.description,
					mimeType: r.mimeType,
				}));

				return {
					peerId: this.meshNode?.getPeerId() || "unknown",
					grpcPort: this.defaultRpcPort,
					tools: [...remoteTools],
					resources,
					serverInfo: this.liopServer.getServerInfo(),
				};
			});

			// Proactively announce manifest capability to the mesh
			this.meshNode.announceManifest().catch((err: unknown) => {
				log.info(
					`[LIOP-Router] Failed to announce manifest: ${err instanceof Error ? err.message : String(err)}`,
				);
			});
		}

		// [OWASP-A01] Startup warning when diagnostic level exposes full topology
		if (process.env.LIOP_DIAGNOSTIC_LEVEL === "full") {
			process.stderr.write(
				"⚠️ [LIOP-Security] Diagnostic level set to FULL — " +
					"PeerIDs and network topology are exposed. Do NOT use in production.\n",
			);
		}
	}

	private shouldSkipManifestQuery(peerId: string): boolean {
		const state = this.manifestFailureState.get(peerId);
		if (!state) return false;
		const now = Date.now();
		if (now >= state.cooldownUntil) return false;

		if (
			now - state.lastSkipLogAt >
			LiopMcpRouter.MANIFEST_SKIP_LOG_THROTTLE_MS
		) {
			log.info(
				`[LIOP-Router] Skipping manifest query for ${peerId} during cooldown (${Math.ceil((state.cooldownUntil - now) / 1000)}s remaining)`,
			);
			state.lastSkipLogAt = now;
		}
		return true;
	}

	private recordManifestQuerySuccess(peerId: string): void {
		this.manifestFailureState.delete(peerId);
	}

	private recordManifestQueryFailure(peerId: string): void {
		const now = Date.now();
		const prev = this.manifestFailureState.get(peerId);
		const failures = (prev?.failures || 0) + 1;
		const backoff = Math.min(
			LiopMcpRouter.MANIFEST_FAILURE_BASE_COOLDOWN_MS *
				2 ** Math.max(0, failures - 1),
			LiopMcpRouter.MANIFEST_FAILURE_MAX_COOLDOWN_MS,
		);
		this.manifestFailureState.set(peerId, {
			failures,
			cooldownUntil: now + backoff,
			lastSkipLogAt: 0,
		});
	}

	public async dispatch(request: McpRequest): Promise<McpResponse | null> {
		const { method, params, id } = request;
		log.info(`[LIOP-Router] Processing: ${method}`);

		switch (method) {
			case "initialize":
				return {
					jsonrpc: "2.0",
					id,
					result: {
						protocolVersion: "2025-11-25",
						capabilities: {
							tools: { listChanged: true },
							resources: { listChanged: true },
							prompts: { listChanged: true },
						},
						serverInfo: this.liopServer.getServerInfo(),
					},
				};
			case "notifications/initialized":
				// Cloud MCP clients often fire tools/list immediately; kick discovery early
				// so manifests populate before (or right after) that call completes.
				this.kickDiscoveryAfterInitialized().catch(() => {});
				return null;
			case "notifications/cancelled":
				return null; // No-op for MCP spec compliance
			case "ping":
				return { jsonrpc: "2.0", id, result: {} };
			case "tools/list": {
				const localTools = this.liopServer.listTools();
				const remoteTools = await this.getRemoteTools();

				const listedLocals = mcpCompactToolDescriptions()
					? localTools.map((t) => ({
							...t,
							description: stripVerboseLiopToolDescription(t.description ?? ""),
						}))
					: localTools;

				log.info(
					`[LIOP-Router] tools/list: ${localTools.length} local, ${remoteTools.length} remote tools found`,
				);

				// Inject a mandatory static diagnostic tool.
				// This ensures that the {tools: []} list is never empty on startup.
				// Claude Desktop silently hides the connector if it receives an empty array initially,
				// which broke the UX due to the ~3s warm-up time of the Kademlia DHT.
				const diagnosticTool = {
					name: "LiopMeshStatus",
					description:
						"LiopMeshStatus: Returns the current dynamic diagnostic status of the Zero-Trust Neural Mesh.",
					inputSchema: {
						type: "object",
						properties: {},
						additionalProperties: false,
					},
				};

				const allTools = [diagnosticTool, ...listedLocals, ...remoteTools];

				// [Token Economy] Record telemetry for the tools/list response
				const telemetry = TokenTelemetryEngine.getInstance();
				const toolsPayload = JSON.stringify(allTools);
				const toolsResponsePayload = JSON.stringify({ tools: allTools });
				telemetry.record({
					type: "tools_list",
					method: "tools/list",
					estimatedInputTokens: telemetry.countTokens(toolsPayload),
					estimatedOutputTokens: telemetry.countTokens(toolsResponsePayload),
				});

				return {
					jsonrpc: "2.0",
					id,
					result: {
						tools: allTools,
					},
				};
			}
			case "tools/call":
				return this.transcodeMcpToLiop(id, params as Record<string, unknown>);
			case "resources/list": {
				const localResources = this.liopServer.listResources();
				const remoteResources = await this.getRemoteResources();
				const allResources = [...localResources, ...remoteResources];

				// [Token Economy] Record resources/list telemetry
				const rlTelemetry = TokenTelemetryEngine.getInstance();
				const rlPayload = JSON.stringify(allResources);
				rlTelemetry.record({
					type: "resource_list",
					method: "resources/list",
					estimatedInputTokens: 0,
					estimatedOutputTokens: rlTelemetry.countTokens(rlPayload),
				});

				return {
					jsonrpc: "2.0",
					id,
					result: { resources: allResources },
				};
			}
			case "resources/read": {
				const typedParams = params as { uri?: string } | undefined;
				if (!typedParams?.uri)
					return {
						jsonrpc: "2.0",
						id,
						error: { code: -32602, message: "Missing resource uri" },
					};
				try {
					const rrStartTime = Date.now();
					const result = await this.liopServer.readResource(typedParams.uri);

					// [Token Economy] Record resources/read telemetry
					const rrTelemetry = TokenTelemetryEngine.getInstance();
					const rrOutputPayload = JSON.stringify(result);
					rrTelemetry.record({
						type: "resource_read",
						method: "resources/read",
						toolName: typedParams.uri,
						estimatedInputTokens: rrTelemetry.countTokens(typedParams.uri),
						estimatedOutputTokens: rrTelemetry.countTokens(rrOutputPayload),
						durationMs: Date.now() - rrStartTime,
					});

					return { jsonrpc: "2.0", id, result };
				} catch (err: unknown) {
					// Fallback: Resolve remotely from manifest cache
					const targetUri = typedParams.uri;
					for (const { manifest } of this.manifestCache.values()) {
						const remoteResource = manifest.resources.find(
							(r) => r.uri === targetUri,
						);
						if (remoteResource) {
							log.info(
								`[LIOP-Router] Resolved resource ${targetUri} from cache (Peer: ${manifest.peerId})`,
							);
							return {
								jsonrpc: "2.0",
								id,
								result: {
									contents: [
										{
											uri: remoteResource.uri,
											mimeType: remoteResource.mimeType || "text/plain",
											text:
												remoteResource.text ||
												remoteResource.description ||
												"No content provided",
										},
									],
								},
							};
						}
					}

					return {
						jsonrpc: "2.0",
						id,
						error: {
							code: -32000,
							message: err instanceof Error ? err.message : String(err),
						},
					};
				}
			}
			case "prompts/list": {
				const promptsList = this.liopServer.listPrompts();

				// [Token Economy] Record prompts/list telemetry
				const plTelemetry = TokenTelemetryEngine.getInstance();
				const plPayload = JSON.stringify(promptsList);
				plTelemetry.record({
					type: "prompt_list",
					method: "prompts/list",
					estimatedInputTokens: 0,
					estimatedOutputTokens: plTelemetry.countTokens(plPayload),
				});

				return {
					jsonrpc: "2.0",
					id,
					result: { prompts: promptsList },
				};
			}
			case "prompts/get": {
				const typedParams = params as
					| { name?: string; arguments?: Record<string, string> }
					| undefined;
				if (!typedParams?.name)
					return {
						jsonrpc: "2.0",
						id,
						error: { code: -32602, message: "Missing prompt name" },
					};
				try {
					const pgStartTime = Date.now();
					const result = await this.liopServer.getPrompt({
						name: typedParams.name as string,
						arguments: typedParams.arguments || {},
					});

					// [Token Economy] Record prompts/get telemetry
					const pgTelemetry = TokenTelemetryEngine.getInstance();
					const pgInputPayload = JSON.stringify({
						name: typedParams.name,
						arguments: typedParams.arguments,
					});
					const pgOutputPayload = JSON.stringify(result);
					pgTelemetry.record({
						type: "prompt_get",
						method: "prompts/get",
						toolName: typedParams.name,
						estimatedInputTokens: pgTelemetry.countTokens(pgInputPayload),
						estimatedOutputTokens: pgTelemetry.countTokens(pgOutputPayload),
						durationMs: Date.now() - pgStartTime,
					});

					return { jsonrpc: "2.0", id, result };
				} catch (err: unknown) {
					return {
						jsonrpc: "2.0",
						id,
						error: {
							code: -32000,
							message: err instanceof Error ? err.message : String(err),
						},
					};
				}
			}
			default:
				return {
					jsonrpc: "2.0",
					id,
					error: { code: -32601, message: `Method not found: ${method}` },
				};
		}
	}

	/**
	 * MCP clients often send notifications/initialized then immediately tools/list.
	 * Start manifest discovery without blocking the notification handler.
	 */
	private kickDiscoveryAfterInitialized(): Promise<void> {
		return (async () => {
			await new Promise((r) => setTimeout(r, 250));
			await Promise.race([
				this.refreshManifestCache(true),
				new Promise<void>((r) => setTimeout(r, 15_000)),
			]).catch(() => {});
		})();
	}

	/**
	 * Discovers and caches manifests from all remote LIOP providers in the mesh.
	 * Uses Kademlia DHT to find "liop:manifest" providers, then opens
	 * /liop/manifest/1.0.0 protocol streams to retrieve their full metadata.
	 */
	public async refreshManifestCache(silent = false): Promise<void> {
		if (!this.meshNode) return;
		if (this.currentDiscovery) return this.currentDiscovery;

		// Fast-path: Skip DHT query entirely when cache is fresh and populated.
		// Only background polls (silent=true) should bypass this to detect new nodes.
		// Foreground requests (tools/list, tools/call) can safely reuse valid cache.
		if (!silent && this.manifestCache.size > 0) {
			const now = Date.now();
			const allFresh = Array.from(this.manifestCache.values()).every(
				({ cachedAt }) => now - cachedAt < MANIFEST_CACHE_TTL_S * 1000,
			);
			if (allFresh) return;
		}

		this.currentDiscovery = (async () => {
			try {
				const prevCount = Array.from(this.manifestCache.values()).reduce(
					(acc, { manifest }) => acc + manifest.tools.length,
					0,
				);

				// Phase 0: Wait for at least one active connection if mesh is empty (Cold Start)
				if (this.manifestCache.size === 0) {
					for (let i = 0; i < 3; i++) {
						const connections =
							// biome-ignore lint/suspicious/noExplicitAny: access internal nodes for connection count
							(this.meshNode as any).node?.getConnections().length || 0;
						if (connections > 0) {
							log.info(
								`[LIOP-Router] P2P Connection established. Starting discovery...`,
							);
							break;
						}
						log.info(
							`[LIOP-Router] Waiting for P2P connections (attempt ${i + 1}/10)...`,
						);
						await new Promise((r) => setTimeout(r, 1000));
					}
				}

				// Phase 1: Try DHT discovery + Fallback loop
				let providerIds: string[] = [];
				const MAX_COLD_ATTEMPTS = this.manifestCache.size === 0 ? 5 : 1;

				for (
					let coldAttempt = 0;
					coldAttempt < MAX_COLD_ATTEMPTS;
					coldAttempt++
				) {
					// 1.1 Try DHT discovery
					for (
						let attempt = 0;
						attempt < MANIFEST_DISCOVERY_RETRIES;
						attempt++
					) {
						providerIds =
							(await this.meshNode?.discoverManifestProviders()) || [];
						const selfId = this.meshNode?.getPeerId();
						const remoteIds = providerIds.filter((id) => id !== selfId);
						if (remoteIds.length > 0) break;
						if (attempt < MANIFEST_DISCOVERY_RETRIES - 1) {
							log.info(
								`[LIOP-Router] DHT discovery attempt ${attempt + 1}/${MANIFEST_DISCOVERY_RETRIES}...`,
							);
							await new Promise((r) => setTimeout(r, 1000));
						}
					}

					// 1.2 Aggressively merge all active connections to bypass DHT propagation delays
					const activePeers =
						// biome-ignore lint/suspicious/noExplicitAny: access internal nodes
						(this.meshNode as any).node
							?.getConnections()
							.map((c: { remotePeer: { toString: () => string } }) =>
								c.remotePeer.toString(),
							) || [];

					if (activePeers.length > 0) {
						providerIds = Array.from(new Set([...providerIds, ...activePeers]));
					}

					const selfIdEnd = this.meshNode?.getPeerId();
					const remoteIdsEnd = providerIds.filter((id) => id !== selfIdEnd);
					if (remoteIdsEnd.length > 0) break;

					if (coldAttempt < MAX_COLD_ATTEMPTS - 1) {
						log.info(
							`[LIOP-Router] Initial discovery failed (0 providers). Retrying in 1s (${coldAttempt + 1}/${MAX_COLD_ATTEMPTS})...`,
						);
						await new Promise((r) => setTimeout(r, 1000));
					}
				}

				if (providerIds.length === 0) {
					log.info(
						`[LIOP-Router] No manifest providers found after all attempts.`,
					);
					return;
				}

				if (!silent) {
					log.info(
						`[LIOP-Router] Discovered ${providerIds.length} candidate manifest providers`,
					);
				}

				// Prioritize already-connected peers to avoid blocking on stale providers.
				// This improves first tools/list latency on Linux/Ubuntu while preserving
				// full discovery for slower peers in subsequent refresh cycles.
				const connectedPeers = new Set<string>(
					// biome-ignore lint/suspicious/noExplicitAny: internal node access for fast peer ordering
					((this.meshNode as any).node?.getConnections?.() || []).map(
						(c: { remotePeer: { toString: () => string } }) =>
							c.remotePeer.toString(),
					),
				);
				providerIds = [...providerIds].sort((a, b) => {
					const aConnected = connectedPeers.has(a) ? 1 : 0;
					const bConnected = connectedPeers.has(b) ? 1 : 0;
					return bConnected - aConnected;
				});

				let successCount = 0;
				let errorCount = 0;
				let cacheUpdated = false;

				// Filter peers eligible for querying
				const selfId = this.meshNode?.getPeerId();
				const eligiblePeers = providerIds.filter((peerId) => {
					if (!this.meshNode) return false;
					if (peerId === selfId) return false;
					if (this.shouldSkipManifestQuery(peerId)) return false;
					const cached = this.manifestCache.get(peerId);
					if (
						cached &&
						Date.now() - cached.cachedAt < MANIFEST_CACHE_TTL_S * 1000
					) {
						successCount++;
						return false;
					}
					return true;
				});

				// Parallel manifest queries — eliminates sequential 100ms + retry delays
				const queryResults = await Promise.allSettled(
					eligiblePeers.map(async (peerId) => {
						if (!this.meshNode) return null;
						log.info(`[LIOP-Router] Querying manifest from: ${peerId}`);
						return {
							peerId,
							manifest: await this.meshNode.queryManifest(peerId),
						};
					}),
				);

				for (const result of queryResults) {
					if (result.status === "fulfilled" && result.value?.manifest) {
						const { peerId, manifest } = result.value;
						this.manifestCache.set(peerId, {
							manifest,
							cachedAt: Date.now(),
						});
						this.recordManifestQuerySuccess(peerId);
						cacheUpdated = true;
						successCount++;
						log.info(
							`[LIOP-Router] Manifest received from ${peerId} (${manifest.tools.length} tools)`,
						);
					} else if (result.status === "fulfilled" && result.value) {
						this.recordManifestQueryFailure(result.value.peerId);
						errorCount++;
						log.info(
							`[LIOP-Router] Manifest query returned NULL for ${result.value.peerId}`,
						);
					} else if (result.status === "rejected") {
						errorCount++;
						log.info(
							`[LIOP-Router] Fatal error querying manifest:`,
							result.reason instanceof Error
								? result.reason.message
								: String(result.reason),
						);
					}
				}

				// Store discovery stats for LiopMeshStatus diagnostics
				// biome-ignore lint/suspicious/noExplicitAny: private stats for telemetry
				(this as any)._discoveryStats = {
					candidates: providerIds.length,
					success: successCount,
					failures: errorCount,
					lastDiscovery: Date.now(),
				};

				if (cacheUpdated) {
					const newCount = Array.from(this.manifestCache.values()).reduce(
						(acc, { manifest }) => acc + manifest.tools.length,
						0,
					);

					if (newCount !== prevCount && this.onToolsChanged) {
						process.stderr.write(
							"[LIOP-Router] Mesh topology updated! Emitting notifications/tools/list_changed.\n",
						);
						this.onToolsChanged();
					}
				}
			} finally {
				this.currentDiscovery = null;
			}
		})();

		return this.currentDiscovery;
	}

	/**
	 * Returns the current manifest cache size for external telemetry.
	 * Used by the adaptive polling system to detect topology stabilization.
	 */
	public getCacheSize(): number {
		return this.manifestCache.size;
	}

	/**
	 * Returns all remote tools discovered via the manifest protocol.
	 */
	private async getRemoteTools(): Promise<
		Array<{
			name: string;
			description?: string;
			inputSchema?: Record<string, unknown>;
		}>
	> {
		const EXPECTED_PROVIDERS = Number.parseInt(
			process.env.LIOP_EXPECTED_PROVIDERS ?? "1",
			10,
		);

		// [Phase 106] Smart Warm-up with Stabilization Detection
		// Loops until EXPECTED_PROVIDERS are found, the deadline expires, or
		// the provider count stabilizes (same count for 3 consecutive checks).
		// This prevents a ~20s block when a node (e.g. Bank) is absent.
		if (this.manifestCache.size < EXPECTED_PROVIDERS && this.meshNode) {
			const initialTimeoutMs = Number.parseInt(
				process.env.LIOP_INITIAL_DISCOVERY_TIMEOUT_MS ?? "8000",
				10,
			);
			const boundedTimeoutMs =
				Number.isFinite(initialTimeoutMs) && initialTimeoutMs > 0
					? initialTimeoutMs
					: 12000;

			const deadline = Date.now() + boundedTimeoutMs;
			let stableCount = 0;
			let lastCacheSize = -1;

			while (Date.now() < deadline) {
				if (this.manifestCache.size >= EXPECTED_PROVIDERS) break;

				await Promise.race([
					this.refreshManifestCache(true),
					new Promise<void>((resolve) => setTimeout(resolve, 3000)),
				]).catch(() => {});

				if (this.manifestCache.size >= EXPECTED_PROVIDERS) break;

				// Stabilization detection: exit early when provider count plateaus
				if (this.manifestCache.size === lastCacheSize) {
					stableCount++;
					if (stableCount >= 3 && this.manifestCache.size > 0) {
						log.info(
							`[LIOP-Router] Provider count stabilized at ${this.manifestCache.size}/${EXPECTED_PROVIDERS}. Proceeding with available mesh.`,
						);
						break;
					}
				} else {
					stableCount = 0;
					lastCacheSize = this.manifestCache.size;
				}

				// Wait before the next iteration to avoid CPU spin
				await new Promise((r) => setTimeout(r, 1000));
			}

			// Diagnostic warning for partial mesh availability
			if (this.manifestCache.size < EXPECTED_PROVIDERS) {
				log.info(
					`[LIOP-Router] ⚠️ Mesh partially available: ${this.manifestCache.size}/${EXPECTED_PROVIDERS} providers. Some tools may be unavailable. Check Docker containers.`,
				);
				// Trigger one more background refresh to catch late joiners
				this.refreshManifestCache(true).catch(() => {});
			}
		}

		// biome-ignore lint/suspicious/noExplicitAny: Tool schema is polymorphic
		const tools: any[] = [];
		const seenNames = new Set<string>();
		const localToolNames = new Set(
			this.liopServer.listTools().map((t) => t.name),
		);

		for (const [peerId, { manifest }] of this.manifestCache.entries()) {
			for (const tool of manifest.tools) {
				// LiopMeshStatus is a local-only diagnostic — skip remote copies
				if (tool.name === "LiopMeshStatus") continue;

				// [LIOP-STABILITY] Allow discovery of ALL remote tools.
				// MCP Requires unique names per server session.
				// In a P2P mesh, multiple nodes might expose the same tool (e.g. LiopMeshStatus).
				// We suffix duplicate names with a short peer hash to ensure
				// ALL tools from ALL providers are correctly registered and visible.
				let finalName = tool.name;
				if (seenNames.has(tool.name) || localToolNames.has(tool.name)) {
					finalName = `${tool.name}_${peerId.slice(-4)}`;
				}
				seenNames.add(finalName);

				const providerName = manifest.serverInfo?.name || "Unknown Provider";

				// [SANITIZATION] Create a clean MCP-compliant tool object
				const baseDesc = tool.description || `Remote tool from ${providerName}`;
				const cleanTool: {
					name: string;
					description: string;
					inputSchema: Record<string, unknown>;
				} = {
					name: finalName,
					description: mcpCompactToolDescriptions()
						? stripVerboseLiopToolDescription(baseDesc)
						: baseDesc,
					inputSchema: (tool.inputSchema || {
						type: "object",
						properties: {},
					}) as Record<string, unknown>,
				};

				// Ensure inputSchema has the mandatory 'type: object' for MCP compliance
				if (
					typeof cleanTool.inputSchema === "object" &&
					!cleanTool.inputSchema.type
				) {
					cleanTool.inputSchema.type = "object";
				}
				if (
					typeof cleanTool.inputSchema === "object" &&
					!cleanTool.inputSchema.properties
				) {
					cleanTool.inputSchema.properties = {};
				}

				let blueprint = "";
				if (manifest.taxonomy) {
					blueprint = `\n[LIOP-DOMAIN: ${manifest.taxonomy.domain}]`;
				}

				// LIOP Logic-on-Origin Detection:
				// biome-ignore lint/suspicious/noExplicitAny: polymorphic input schema
				const properties = (cleanTool.inputSchema.properties || {}) as any;
				let envelopeDoc = "";
				if (!mcpCompactToolDescriptions() && properties.payload) {
					envelopeDoc = `\n[REQUIRES: LIOP-PROTO-V1 ENVELOPE]`;
				}

				// INDUSTRIAL REPLICATION: Highlight schema adherence blocks
				if (
					!mcpCompactToolDescriptions() &&
					cleanTool.description.includes("STRICT SCHEMA ADHERENCE")
				) {
					cleanTool.description = cleanTool.description.replace(
						"STRICT SCHEMA ADHERENCE:",
						"[INDUSTRIAL-REQUISITE] STRICT SCHEMA ADHERENCE (MANDATORY):",
					);
				}

				const originStamp = mcpCompactToolDescriptions()
					? `\n(Peer: ${peerId.slice(-8)})${blueprint}`
					: `\n(Origin: ${peerId.slice(-8)})${blueprint}${envelopeDoc}`;
				cleanTool.description = `${cleanTool.description}${originStamp}`;

				tools.push(cleanTool);
			}
		}

		return tools;
	}

	/**
	 * Returns all remote resources discovered via the manifest protocol.
	 */
	private async getRemoteResources(): Promise<
		Array<{
			name: string;
			uri: string;
			description?: string;
			mimeType?: string;
		}>
	> {
		// Trigger background refresh if not already discovering
		if (!this.currentDiscovery) {
			this.refreshManifestCache(true).catch(() => {});
		}

		const resources: Array<{
			name: string;
			uri: string;
			description?: string;
			mimeType?: string;
		}> = [];
		const seenUris = new Set(this.liopServer.listResources().map((r) => r.uri));

		for (const [peerId, { manifest }] of this.manifestCache.entries()) {
			for (const resource of manifest.resources) {
				if (!seenUris.has(resource.uri)) {
					const augmentedResource = { ...resource };
					const providerName = manifest.serverInfo?.name || "Unknown Provider";

					let blueprint = "";
					if (manifest.taxonomy) {
						blueprint = `\n\n[LIOP Zero-Trust Blueprint]\nDomain: ${manifest.taxonomy.domain}\nClearance Tier: ${manifest.taxonomy.clearanceTier}`;
						if (
							manifest.taxonomy.executionTypes &&
							manifest.taxonomy.executionTypes.length > 0
						) {
							blueprint += `\nExecution Types: ${manifest.taxonomy.executionTypes.join(", ")}`;
						}
					}

					const originStamp = `\n\n[LIOP Zero-Trust Origin]\nProvider: ${providerName}\nNetwork ID: ${peerId}${blueprint}`;

					// INDUSTRIAL REPLICATION: Mark schema resources clearly
					if (augmentedResource.uri.startsWith("liop://schema/")) {
						augmentedResource.name = `[SCHEMA] ${augmentedResource.name}`;
						augmentedResource.description = `[CRITICAL SCHEMA] ${augmentedResource.description || "Data Dictionary for Zero-Shot Autonomy"}${originStamp}`;
					} else {
						augmentedResource.description = augmentedResource.description
							? `${augmentedResource.description}${originStamp}`
							: originStamp.trim();
					}

					resources.push(augmentedResource);
					seenUris.add(resource.uri);
				}
			}
		}

		return resources;
	}

	/**
	 * Resolves the gRPC target (host:port) AND the peerId for a given tool name
	 * by searching the manifest cache. Supports exact names and suffixed names.
	 */
	private resolveManifestTarget(
		toolName: string,
	): { peerId: string; originalToolName: string } | null {
		// 1. Try exact match
		for (const [peerId, { manifest }] of this.manifestCache.entries()) {
			const tool = manifest.tools.find((t) => t.name === toolName);
			if (tool) {
				return {
					peerId,
					originalToolName: toolName,
				};
			}
		}

		// 2. Try suffixed match (tool_xxxx)
		const parts = toolName.split("_");
		if (parts.length > 1) {
			const suffix = parts.pop();
			const baseName = parts.join("_");
			for (const [peerId, { manifest }] of this.manifestCache.entries()) {
				if (peerId.endsWith(suffix || "")) {
					const tool = manifest.tools.find((t) => t.name === baseName);
					if (tool) {
						return {
							peerId,
							originalToolName: baseName,
						};
					}
				}
			}
		}

		return null;
	}

	/**
	 * Redacts a PeerID for external-facing diagnostics.
	 * LIOP_DIAGNOSTIC_LEVEL controls verbosity:
	 *   - "redacted" (default): truncated to last 8 chars
	 *   - "full": complete PeerID (development only)
	 */
	private redactPeerId(peerId: string): string {
		const level = process.env.LIOP_DIAGNOSTIC_LEVEL || "redacted";
		if (level === "full") return peerId;
		return `***${peerId.slice(-8)}`;
	}

	// biome-ignore lint/suspicious/noExplicitAny: MCP JSON-RPC params/id are polymorphic
	private async transcodeMcpToLiop(id: any, params: any): Promise<any> {
		const toolName = params.name;

		// Intercept the static diagnostic tool
		if (toolName === "LiopMeshStatus") {
			// [INDUSTRIAL-FIX] Proactive warm-up: request a refresh when status is called.
			// This ensures that even if the DHT was cold, the next status call (or tools/list)
			// will have data.
			this.refreshManifestCache(true).catch(() => {});

			// biome-ignore lint/suspicious/noExplicitAny: private stats for telemetry
			const stats = (this as any)._discoveryStats || {
				candidates: 0,
				success: 0,
				failures: 0,
			};
			const providerCount = this.manifestCache.size;
			const meshState = this.meshNode ? "Active" : "Offline";
			const cachedTools = Array.from(this.manifestCache.values()).reduce(
				(acc, { manifest }) => acc + manifest.tools.length,
				0,
			);
			const connections = this.meshNode
				? // biome-ignore lint/suspicious/noExplicitAny: access internal nodes
					(this.meshNode as any).node?.getConnections().length
				: 0;

			const bootstrapNodes: string[] =
				this.meshNode &&
				// biome-ignore lint/suspicious/noExplicitAny: access internal config
				(this.meshNode as any).config?.bootstrapNodes
					? // biome-ignore lint/suspicious/noExplicitAny: access internal config
						(this.meshNode as any).config.bootstrapNodes
					: [];
			const bootstrapCount = bootstrapNodes.length;

			const diagLevel = process.env.LIOP_DIAGNOSTIC_LEVEL || "redacted";
			const showBootstraps = diagLevel !== "minimal";

			const bootstrapList = showBootstraps
				? bootstrapNodes
						.map((addr) => {
							const parts = addr.split("/");
							const id = parts[parts.length - 1];
							return `  • ${id ? id.slice(-8) : "Unknown"} (bootstrap)`;
						})
						.join("\n")
				: "";

			const routingTableSize = this.meshNode
				? // biome-ignore lint/suspicious/noExplicitAny: access internal nodes
					(this.meshNode as any).getRoutingTableSize()
				: 0;

			const rawPeerId = this.meshNode?.getPeerId() || "Offline";
			const localPeerId =
				rawPeerId === "Offline" ? rawPeerId : this.redactPeerId(rawPeerId);

			const cachedToolList = Array.from(this.manifestCache.entries())
				.flatMap(([peerId, { manifest }]) =>
					manifest.tools.map(
						(t) => `  • ${t.name} (from origin: ${this.redactPeerId(peerId)})`,
					),
				)
				.join("\n");

			const statusText = [
				`LIOP Mesh Status: ${meshState === "Active" ? "Active" : "Offline"}`,
				`Local Agent Identity: ${localPeerId}`,
				`Network: ${connections} Conns | ${routingTableSize} Mesh Nodes | ${bootstrapCount} Bootstraps`,
				showBootstraps && bootstrapCount > 0
					? `\nActive Bootstraps:\n${bootstrapList}\n`
					: "",
				`Discovery: ${stats.candidates} Candidates | ${stats.success} OK | ${stats.failures} FAIL`,
				`Tooling: ${providerCount} Providers | ${cachedTools} Total Remote Tools`,
				cachedTools > 0
					? `\nDiscovered Remote Tools (Zero-Trust Origins):\n${cachedToolList}`
					: "\nNo remote tools discovered yet.",
				// [Token Economy] Telemetry block (only appears when operations exist)
				TokenTelemetryEngine.getInstance().formatStatusBlock(),
			]
				.filter((line) => line !== "")
				.join("\n");

			// [Token Economy] Record diagnostic output telemetry
			const diagTelemetry = TokenTelemetryEngine.getInstance();
			diagTelemetry.record({
				type: "diagnostic",
				method: "tools/call",
				toolName: "LiopMeshStatus",
				estimatedInputTokens: 0,
				estimatedOutputTokens: diagTelemetry.countTokens(statusText),
			});

			return {
				jsonrpc: "2.0",
				id,
				result: {
					content: [
						{
							type: "text",
							text: statusText,
						},
					],
				},
			};
		}

		const isLocal = this.liopServer
			.listTools()
			.some((t) => t.name === toolName);

		if (!isLocal && this.meshNode) {
			// Phase 1: Cache-first — resolve directly from cached manifests (zero-latency)
			// Per MCP spec, tools don't change between notifications/tools/list_changed.
			let target = this.resolveManifestTarget(toolName);

			// Phase 2: If not cached, trigger DHT refresh and retry
			if (!target) {
				await this.refreshManifestCache();
				target = this.resolveManifestTarget(toolName);
			}

			if (target) {
				log.info(
					`[LIOP-Router] Resolved ${toolName} via manifest cache (Peer: ${target.peerId}, Original: ${target.originalToolName})`,
				);
				return this.routeToRemoteProvider(
					id,
					target.originalToolName,
					target.peerId,
					params,
				);
			}

			// Phase 2: Try DHT-based dynamic provider discovery (fallback for unsuffixed names)
			let providers: string[] = [];
			for (let i = 0; i < 3; i++) {
				providers = await this.meshNode.findProviders(toolName);
				if (providers.length > 0) break;
				if (i < 2) await new Promise((r) => setTimeout(r, 1000));
			}

			if (providers.length > 0) {
				return this.routeToRemoteProvider(id, toolName, providers[0], params);
			}
		}

		// If no remote provider found, try local execution
		if (isLocal) {
			try {
				const localStartTime = Date.now();
				const result = await this.liopServer.callTool({
					name: toolName,
					arguments: params.arguments || {},
				});

				// [Token Economy] Record local tool call telemetry
				const localTelemetry = TokenTelemetryEngine.getInstance();
				const localInputPayload = JSON.stringify(params.arguments || {});
				const localOutputPayload = JSON.stringify(result);
				localTelemetry.record({
					type: "tool_call",
					method: "tools/call",
					toolName,
					estimatedInputTokens: localTelemetry.countTokens(localInputPayload),
					estimatedOutputTokens: localTelemetry.countTokens(localOutputPayload),
					durationMs: Date.now() - localStartTime,
				});

				return { jsonrpc: "2.0", id, result };
			} catch (err: unknown) {
				return {
					jsonrpc: "2.0",
					id,
					error: {
						code: -32000,
						message: err instanceof Error ? err.message : String(err),
					},
				};
			}
		}

		return {
			jsonrpc: "2.0",
			id,
			error: {
				code: -32002,
				message: `No provider found for tool: ${toolName}. Ensure the provider node is active and connected to the mesh.`,
			},
		};
	}

	private async routeToRemoteProvider(
		// biome-ignore lint/suspicious/noExplicitAny: MCP polymorphic
		id: any,
		toolName: string,
		peerId: string,
		// biome-ignore lint/suspicious/noExplicitAny: MCP polymorphic
		params: any,
		// biome-ignore lint/suspicious/noExplicitAny: MCP polymorphic
	): Promise<any> {
		if (!this.meshNode)
			return {
				jsonrpc: "2.0",
				id,
				error: { code: -32603, message: "Mesh Node inactive" },
			};

		// Dynamic gRPC port resolution from manifest cache
		let manifestEntry = this.manifestCache.get(peerId);
		let grpcPort = this.defaultRpcPort;

		if (manifestEntry) {
			grpcPort = manifestEntry.manifest.grpcPort;
		} else {
			// Try to query the manifest directly
			const manifest = await this.meshNode.queryManifest(peerId);
			if (manifest) {
				grpcPort = manifest.grpcPort;
				this.manifestCache.set(peerId, {
					manifest,
					cachedAt: Date.now(),
				});
				manifestEntry = this.manifestCache.get(peerId);
			}
		}

		// Docker Demo convenience (opt-in):
		// Docker Desktop setups publish gRPC ports on the host as 13011/13021/13031.
		// Container-internal gRPC ports (50051) are unreachable from the host.
		// Activated by any Docker-mapping flag: LIOP_DOCKER_MAP, LIOP_DEV_MODE,
		// LIOP_USE_PUBLISHED_GRPC_PORTS, or NODE_ENV=development/test.
		const shouldRemapGrpcPorts =
			process.env.LIOP_USE_PUBLISHED_GRPC_PORTS === "1" ||
			process.env.LIOP_DOCKER_MAP === "true" ||
			process.env.LIOP_DEV_MODE === "true" ||
			process.env.NODE_ENV === "development" ||
			process.env.NODE_ENV === "test";
		if (shouldRemapGrpcPorts && manifestEntry) {
			const providerName =
				manifestEntry.manifest.serverInfo?.name?.toLowerCase() || "";
			if (providerName.includes("vault")) grpcPort = 13011;
			else if (providerName.includes("bank")) grpcPort = 13021;
			else if (providerName.includes("oracle")) grpcPort = 13031;
		}

		// Resolve IP from active connections
		const addrs = await this.meshNode.resolvePeer(peerId);
		let targetAddr: string | null = null;

		// [LIOP-ALPHA] Check if the peer is running on the same physical machine
		// by comparing its advertised IPs against our local OS interfaces.
		const os = await import("node:os");
		const localInterfaces = Object.values(os.networkInterfaces())
			.flat()
			.filter((i) => i?.family === "IPv4")
			.map((i) => i?.address);

		// Loop through all advertised addresses to find the optimal target
		for (const addr of addrs) {
			const parts = addr.split("/");
			const ipIdx = parts.indexOf("ip4");
			if (ipIdx !== -1) {
				const advertisedIp = parts[ipIdx + 1];

				// Loopback priority or Same-Machine detection
				if (
					advertisedIp === "127.0.0.1" ||
					localInterfaces.includes(advertisedIp)
				) {
					targetAddr = `127.0.0.1:${grpcPort}`;
					break; // Supreme priority for local execution
				}

				// Default to first discovered valid external IP
				if (!targetAddr) {
					targetAddr = `${advertisedIp}:${grpcPort}`;
				}
			}
		}

		if (!targetAddr) {
			// Fallback to localhost with the dynamically resolved port
			targetAddr = `127.0.0.1:${grpcPort}`;
		}

		log.info(
			`[LIOP-Router] Dynamic route: ${toolName} -> ${targetAddr} (PeerID: ${peerId})`,
		);

		const remoteClient = new liopV1.LogicMesh(
			targetAddr,
			createChannelCredentials(),
		);
		return this.performTranscoding(id, remoteClient, toolName, params, peerId);
	}

	private async performTranscoding(
		// biome-ignore lint/suspicious/noExplicitAny: MCP polymorphic
		id: any,
		// biome-ignore lint/suspicious/noExplicitAny: gRPC client from dynamic proto-loader
		client: any,
		toolName: string,
		// biome-ignore lint/suspicious/noExplicitAny: MCP polymorphic
		params: any,
		peerId?: string,
		// biome-ignore lint/suspicious/noExplicitAny: MCP polymorphic
	): Promise<any> {
		const capabilityHash = toolName;
		const proofOfIntent = this.meshNode
			? await this.meshNode.sign(Buffer.from(capabilityHash))
			: Buffer.from([]);

		const transcodingStartTime = Date.now();

		return new Promise((resolve) => {
			client.negotiateIntent(
				{
					agent_did: `did:liop:${this.meshNode?.getPeerId() || "mcp-proxy"}`,
					capability_hash: capabilityHash,
					proof_of_intent: proofOfIntent,
				},
				async (err: Error | null, response: IntentResponse) => {
					if (err || !response.accepted) {
						return resolve({
							jsonrpc: "2.0",
							id,
							result: {
								content: [
									{
										type: "text",
										text: `PQC Handshake Failed: ${err?.message || "Rejected"}`,
									},
								],
								isError: true,
							},
						});
					}

					const { ciphertext, sharedSecret } =
						await Kyber768Wrapper.encapsulateAsymmetric(
							response.kyber_public_key,
						);
					// SECURITY: Avoid AES-GCM nonce reuse across multiple ciphertexts.
					// We embed arguments directly into the proxy logic so we only encrypt ONE payload per session/nonce.
					const embeddedArgsJson = JSON.stringify(params.arguments || {});
					const proxyLogic = `return { "__liop_proxy_tool": "${toolName}", "__liop_proxy_args": ${embeddedArgsJson} };`;
					const nonce = crypto.randomBytes(12);

					const sealedLogic = this.encryptWithNonce(
						Buffer.from(proxyLogic),
						sharedSecret,
						nonce,
					);

					const call = client.executeLogic({
						session_token: response.session_token,
						wasm_binary: new Uint8Array(sealedLogic),
						inputs: {},
						pqc_ciphertext: ciphertext,
						aes_nonce: nonce,
					});

					let resultBody = "";
					let lastResponse: LogicResponse | null = null;
					call.on("data", (grpcRes: LogicResponse) => {
						resultBody += grpcRes.semantic_evidence;
						lastResponse = grpcRes;
					});
					call.on("end", async () => {
						try {
							if (lastResponse) {
								// Only verify ZK-Receipt if the remote execution succeeded.
								// If the remote execution failed due to a policy error (e.g. Egress Shield),
								// the ZK proof is empty and we should bypass validation to propagate the original error.
								if (!lastResponse.is_error) {
									const proofHex = Buffer.from(
										lastResponse.cryptographic_proof,
									).toString("hex");
									const isValid = await this.verifier.verifyZkReceipt(
										Buffer.from(proxyLogic),
										proofHex,
										Buffer.from(lastResponse.zk_receipt),
										Buffer.from(sharedSecret),
									);

									if (!isValid) {
										return resolve({
											jsonrpc: "2.0",
											id,
											result: {
												content: [
													{
														type: "text",
														text: "SECURITY ALERT: Remote response failed cryptographic integrity audit.",
													},
												],
												isError: true,
											},
										});
									}
								}
							}

							const parsedResult = JSON.parse(resultBody);

							// [Token Economy] Record remote tool call telemetry
							const remoteTelemetry = TokenTelemetryEngine.getInstance();
							remoteTelemetry.record({
								type: "tool_call",
								method: "tools/call",
								toolName,
								peerId,
								estimatedInputTokens:
									remoteTelemetry.countTokens(embeddedArgsJson),
								estimatedOutputTokens: remoteTelemetry.countTokens(resultBody),
								durationMs: Date.now() - transcodingStartTime,
							});

							resolve({ jsonrpc: "2.0", id, result: parsedResult });
						} catch (_e) {
							resolve({
								jsonrpc: "2.0",
								id,
								result: { content: [{ type: "text", text: resultBody }] },
							});
						}
					});
					call.on("error", (e: Error) =>
						resolve({
							jsonrpc: "2.0",
							id,
							result: {
								content: [
									{ type: "text", text: `LIOP gRPC Error: ${e.message}` },
								],
								isError: true,
							},
						}),
					);
				},
			);
		});
	}

	private encryptWithNonce(
		payload: Buffer,
		key: Uint8Array,
		nonce: Buffer,
	): Buffer {
		const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
		const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
		return Buffer.concat([encrypted, cipher.getAuthTag()]);
	}
}
