import * as crypto from "node:crypto";
import { LiopVerifier } from "../crypto/verifier.js";
import type { LiopManifest, MeshNode } from "../mesh/index.js";
import { Kyber768Wrapper } from "../rpc/crypto/kyber.js";
import { liopV1 } from "../rpc/proto.js";
import { createChannelCredentials } from "../rpc/tls.js";
import type { IntentResponse, LogicResponse } from "../rpc/types.js";
import type { LiopServer } from "../server/index.js";

/** Time-to-live for cached manifests (seconds) */
const MANIFEST_CACHE_TTL_S = 30;

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
	private verifier: LiopVerifier = new LiopVerifier();

	/** Callback when new remote tools are discovered */
	public onToolsChanged?: () => void;

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
					tools: [
						{
							name: "LiopMeshStatus",
							description:
								"LiopMeshStatus: Returns the current dynamic diagnostic status of the Zero-Trust Neural Mesh.",
							inputSchema: { type: "object", properties: {} },
						},
						...remoteTools,
					],
					resources,
					serverInfo: this.liopServer.getServerInfo(),
				};
			});

			// Proactively announce manifest capability to the mesh
			this.meshNode.announceManifest().catch((err: unknown) => {
				console.error(
					`[LIOP-Router] Failed to announce manifest: ${err instanceof Error ? err.message : String(err)}`,
				);
			});
		}
	}

	public async dispatch(request: {
		method: string;
		// biome-ignore lint/suspicious/noExplicitAny: MCP params are polymorphic
		params?: any;
		// biome-ignore lint/suspicious/noExplicitAny: MCP id is polymorphic
		id?: any;
		// biome-ignore lint/suspicious/noExplicitAny: MCP response is polymorphic
	}): Promise<any> {
		const { method, params, id } = request;
		console.error(`[LIOP-Router] Processing: ${method}`);

		switch (method) {
			case "initialize":
				return {
					jsonrpc: "2.0",
					id,
					result: {
						protocolVersion: "2025-03-26",
						capabilities: {
							tools: { listChanged: true },
							resources: { listChanged: true },
							prompts: { listChanged: true },
						},
						serverInfo: this.liopServer.getServerInfo(),
					},
				};
			case "notifications/initialized":
			case "notifications/cancelled":
				return null; // No-op for MCP spec compliance
			case "ping":
				return { jsonrpc: "2.0", id, result: {} };
			case "tools/list": {
				const localTools = this.liopServer.listTools();
				const remoteTools = await this.getRemoteTools();

				// Inject a mandatory static diagnostic tool.
				// This ensures that the {tools: []} list is never empty on startup.
				// Claude Desktop silently hides the connector if it receives an empty array initially,
				// which broke the UX due to the ~3s warm-up time of the Kademlia DHT.
				const diagnosticTool = {
					name: "LiopMeshStatus",
					description:
						"LiopMeshStatus: Returns the current dynamic diagnostic status of the Zero-Trust Neural Mesh.",
					inputSchema: { type: "object", properties: {} },
				};

				return {
					jsonrpc: "2.0",
					id,
					result: { tools: [diagnosticTool, ...localTools, ...remoteTools] },
				};
			}
			case "tools/call":
				return this.transcodeMcpToLiop(id, params);
			case "resources/list": {
				const localResources = this.liopServer.listResources();
				const remoteResources = await this.getRemoteResources();
				return {
					jsonrpc: "2.0",
					id,
					result: { resources: [...localResources, ...remoteResources] },
				};
			}
			case "resources/read": {
				if (!params?.uri)
					return {
						jsonrpc: "2.0",
						id,
						error: { code: -32602, message: "Missing resource uri" },
					};
				try {
					const result = this.liopServer.readResource(params.uri as string);
					return { jsonrpc: "2.0", id, result };
				} catch (err: unknown) {
					// Fallback: Resolve remotely from manifest cache
					const targetUri = params.uri as string;
					for (const { manifest } of this.manifestCache.values()) {
						const remoteResource = manifest.resources.find(
							(r) => r.uri === targetUri,
						);
						if (remoteResource) {
							console.error(
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
			case "prompts/list":
				return {
					jsonrpc: "2.0",
					id,
					result: { prompts: this.liopServer.listPrompts() },
				};
			default:
				return {
					jsonrpc: "2.0",
					id,
					error: { code: -32601, message: `Method not found: ${method}` },
				};
		}
	}

	/**
	 * Discovers and caches manifests from all remote LIOP providers in the mesh.
	 * Uses Kademlia DHT to find "liop:manifest" providers, then opens
	 * /liop/manifest/1.0.0 protocol streams to retrieve their full metadata.
	 */
	public async refreshManifestCache(silent = false): Promise<void> {
		if (!this.meshNode) return;
		if (this.currentDiscovery) return this.currentDiscovery;

		this.currentDiscovery = (async () => {
			try {
				const prevCount = Array.from(this.manifestCache.values()).reduce(
					(acc, { manifest }) => acc + manifest.tools.length,
					0,
				);

				// Phase 0: Wait for at least one active connection if mesh is empty (Cold Start)
				if (this.manifestCache.size === 0) {
					for (let i = 0; i < 10; i++) {
						const connections =
							// biome-ignore lint/suspicious/noExplicitAny: access internal nodes for connection count
							(this.meshNode as any).node?.getConnections().length || 0;
						if (connections > 0) {
							console.error(
								`[LIOP-Router] P2P Connection established. Starting discovery...`,
							);
							break;
						}
						console.error(
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
						if (providerIds.length > 0) break;
						if (attempt < MANIFEST_DISCOVERY_RETRIES - 1) {
							console.error(
								`[LIOP-Router] DHT discovery attempt ${attempt + 1}/${MANIFEST_DISCOVERY_RETRIES}...`,
							);
							await new Promise((r) => setTimeout(r, 1000));
						}
					}

					// 1.2 Fallback to all active connections
					if (providerIds.length === 0) {
						const activePeers =
							// biome-ignore lint/suspicious/noExplicitAny: access internal nodes
							(this.meshNode as any).node
								?.getConnections()
								.map((c: { remotePeer: { toString: () => string } }) =>
									c.remotePeer.toString(),
								) || [];
						if (activePeers.length > 0) {
							console.error(
								`[LIOP-Router] DHT empty. Using ${activePeers.length} active connections as fallback.`,
							);
							providerIds = activePeers;
						}
					}

					if (providerIds.length > 0) break;

					if (coldAttempt < MAX_COLD_ATTEMPTS - 1) {
						console.error(
							`[LIOP-Router] Initial discovery failed (0 providers). Retrying in 1s (${coldAttempt + 1}/${MAX_COLD_ATTEMPTS})...`,
						);
						await new Promise((r) => setTimeout(r, 1000));
					}
				}

				if (providerIds.length === 0) {
					console.error(
						`[LIOP-Router] No manifest providers found after all attempts.`,
					);
					return;
				}

				if (!silent) {
					console.error(
						`[LIOP-Router] Discovered ${providerIds.length} candidate manifest providers`,
					);
				}

				let successCount = 0;
				let errorCount = 0;
				let cacheUpdated = false;
				for (const peerId of providerIds) {
					// Avoid querying ourselves
					if (this.meshNode && peerId === this.meshNode.getPeerId()) continue;
					if (!this.meshNode) continue;

					// Skip if cached and not expired
					const cached = this.manifestCache.get(peerId);
					if (
						cached &&
						Date.now() - cached.cachedAt < MANIFEST_CACHE_TTL_S * 1000
					) {
						successCount++;
						continue;
					}

					try {
						// Add a small delay between queries to avoid muxer saturation
						await new Promise((r) => setTimeout(r, 100));

						console.error(`[LIOP-Router] Querying manifest from: ${peerId}`);
						const manifest = await this.meshNode.queryManifest(peerId);
						if (manifest) {
							this.manifestCache.set(peerId, {
								manifest,
								cachedAt: Date.now(),
							});
							cacheUpdated = true;
							successCount++;
							console.error(
								`[LIOP-Router] Manifest received from ${peerId} (${manifest.tools.length} tools)`,
							);
						} else {
							errorCount++;
							console.error(
								`[LIOP-Router] Manifest query returned NULL for ${peerId}`,
							);
						}
					} catch (err: unknown) {
						console.error(
							`[LIOP-Router] Fatal error querying manifest from ${peerId}:`,
							err instanceof Error ? err.message : String(err),
						);
						errorCount++;
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
						console.error(
							"[LIOP-Router] Mesh topology updated! Emitting notifications/tools/list_changed.",
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
	 * Returns all remote tools discovered via the manifest protocol.
	 */
	private async getRemoteTools(): Promise<
		Array<{
			name: string;
			description?: string;
			inputSchema?: Record<string, unknown>;
		}>
	> {
		// Wait for initial discovery if cache is empty
		if (this.manifestCache.size === 0 && this.meshNode) {
			await this.refreshManifestCache(true);
		}

		// biome-ignore lint/suspicious/noExplicitAny: Tool schema is polymorphic
		const tools: any[] = [];
		const seenNames = new Set(this.liopServer.listTools().map((t) => t.name));

		for (const [peerId, { manifest }] of this.manifestCache.entries()) {
			for (const tool of manifest.tools) {
				if (!seenNames.has(tool.name)) {
					const augmentedTool = { ...tool };
					const providerName = manifest.serverInfo?.name || "Unknown Provider";

					let blueprint = "";
					if (manifest.taxonomy) {
						blueprint = `\n\n[LIOP-PROTO: TAXONOMY]\nDomain: ${manifest.taxonomy.domain}\nClearance Tier: ${manifest.taxonomy.clearanceTier}`;
						if (
							manifest.taxonomy.executionTypes &&
							manifest.taxonomy.executionTypes.length > 0
						) {
							blueprint += `\nExecution Types: ${manifest.taxonomy.executionTypes.join(", ")}`;
						}
					}

					// 🛡️ LIOP Logic-on-Origin Detection:
					// If the tool has a 'payload' property, it requires the Full LIOP Envelope.
					let envelopeDoc = "";
					// biome-ignore lint/suspicious/noExplicitAny: internal schema extraction
					const properties = (tool.inputSchema as any)?.properties || {};
					if (properties.payload) {
						envelopeDoc = `\n\n[LIOP-PROTO-V1: LOGIC-ON-ORIGIN SPECIFICATION]\nCRITICAL: This tool requires a strictly formatted Logic-on-Origin payload. Failure to wrap JavaScript code within the LIOP envelope will result in a MalformedPayloadError.\n\nREQUIRED FORMAT:\nLIOP_MAGIC:0x00FF\nMANIFEST:{"target":"wasi_v1","name":"[ModuleName]","integrity_checks":true}\n---BEGIN_LOGIC---\n// Pure JavaScript logic. Access data via 'env.records'.\n// You MUST use 'return' to output results.\n---END_LOGIC---\n\nExecution Environment: Zero-Trust WASI Sandbox (Node.js Worker Pool).`;
					}

					const originStamp = `\n\n[LIOP-REMOTE-ORIGIN-METADATA]\nProvider: ${providerName}\nNetwork ID: ${peerId}${blueprint}${envelopeDoc}`;

					augmentedTool.description = augmentedTool.description
						? `${augmentedTool.description}${originStamp}`
						: originStamp.trim();

					tools.push(augmentedTool);
					seenNames.add(tool.name);
				}
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
						blueprint = `\n\n[🛡️ LIOP Zero-Trust Blueprint]\nDomain: ${manifest.taxonomy.domain}\nClearance Tier: ${manifest.taxonomy.clearanceTier}`;
						if (
							manifest.taxonomy.executionTypes &&
							manifest.taxonomy.executionTypes.length > 0
						) {
							blueprint += `\nExecution Types: ${manifest.taxonomy.executionTypes.join(", ")}`;
						}
					}

					const originStamp = `\n\n[🛡️ LIOP Zero-Trust Origin]\nProvider: ${providerName}\nNetwork ID: ${peerId}${blueprint}`;

					augmentedResource.description = augmentedResource.description
						? `${augmentedResource.description}${originStamp}`
						: originStamp.trim();

					resources.push(augmentedResource);
					seenUris.add(resource.uri);
				}
			}
		}

		return resources;
	}

	/**
	 * Resolves the gRPC target (host:port) for a given tool name
	 * by searching the manifest cache. Returns null if not found.
	 */
	private resolveGrpcTarget(toolName: string): string | null {
		for (const { manifest } of this.manifestCache.values()) {
			const found = manifest.tools.some((t) => t.name === toolName);
			if (found) {
				// Resolve IP from the peer's active connection or use localhost
				return `127.0.0.1:${manifest.grpcPort}`;
			}
		}
		return null;
	}

	// biome-ignore lint/suspicious/noExplicitAny: MCP JSON-RPC params/id are polymorphic
	private async transcodeMcpToLiop(id: any, params: any): Promise<any> {
		const toolName = params.name;

		// Intercept the static diagnostic tool
		if (toolName === "LiopMeshStatus") {
			// Trigger a proactive refresh when status is requested to force discovery
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

			const bootstrapList = bootstrapNodes
				.map((addr) => {
					const parts = addr.split("/");
					const id = parts[parts.length - 1];
					return `  • ${id ? id.slice(-8) : "Unknown"} (${addr})`;
				})
				.join("\n");

			const routingTableSize = this.meshNode
				? // biome-ignore lint/suspicious/noExplicitAny: access internal nodes
					(this.meshNode as any).getRoutingTableSize()
				: 0;

			const localPeerId = this.meshNode?.getPeerId() || "Offline";

			const cachedToolList = Array.from(this.manifestCache.entries())
				.flatMap(([peerId, { manifest }]) =>
					manifest.tools.map((t) => `  • ${t.name} (from origin: ${peerId})`),
				)
				.join("\n");

			const statusText = [
				`LIOP Mesh Status: ${meshState === "Active" ? "Active" : "Offline"}`,
				`Local Agent Identity: ${localPeerId}`,
				`Network: ${connections} Conns | ${routingTableSize} DHT Peers | ${bootstrapCount} Bootstraps`,
				bootstrapCount > 0 ? `\nActive Bootstraps:\n${bootstrapList}\n` : "",
				`Discovery: ${stats.candidates} Candidates | ${stats.success} OK | ${stats.failures} FAIL`,
				`Tooling: ${providerCount} Providers | ${cachedTools} Total Remote Tools`,
				cachedTools > 0
					? `\nDiscovered Remote Tools (Zero-Trust Origins):\n${cachedToolList}`
					: "\nNo remote tools discovered yet.",
			]
				.filter((line) => line !== "")
				.join("\n");

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
			// Phase 1: Try DHT-based dynamic provider discovery
			let providers: string[] = [];
			for (let i = 0; i < 3; i++) {
				providers = await this.meshNode.findProviders(toolName);
				if (providers.length > 0) break;
				if (i < 2) await new Promise((r) => setTimeout(r, 1000));
			}

			if (providers.length > 0) {
				return this.routeToRemoteProvider(id, toolName, providers[0], params);
			}

			// Phase 2: Resolve from cached manifests (no DHT needed)
			await this.refreshManifestCache();
			const grpcTarget = this.resolveGrpcTarget(toolName);
			if (grpcTarget) {
				console.error(
					`[LIOP-Router] Resolved ${toolName} via manifest cache -> ${grpcTarget}`,
				);
				const manifestClient = new liopV1.LogicMesh(
					grpcTarget,
					createChannelCredentials(),
				);
				return this.performTranscoding(id, manifestClient, toolName, params);
			}
		}

		// If no remote provider found, try local execution
		if (isLocal) {
			try {
				const result = await this.liopServer.callTool({
					name: toolName,
					arguments: params.arguments || {},
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
		const cached = this.manifestCache.get(peerId);
		let grpcPort = this.defaultRpcPort;

		if (cached) {
			grpcPort = cached.manifest.grpcPort;
		} else {
			// Try to query the manifest directly
			const manifest = await this.meshNode.queryManifest(peerId);
			if (manifest) {
				grpcPort = manifest.grpcPort;
				this.manifestCache.set(peerId, {
					manifest,
					cachedAt: Date.now(),
				});
			}
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

		console.error(
			`[LIOP-Router] Dynamic route: ${toolName} -> ${targetAddr} (PeerID: ${peerId})`,
		);

		const remoteClient = new liopV1.LogicMesh(
			targetAddr,
			createChannelCredentials(),
		);
		return this.performTranscoding(id, remoteClient, toolName, params);
	}

	private async performTranscoding(
		// biome-ignore lint/suspicious/noExplicitAny: MCP polymorphic
		id: any,
		// biome-ignore lint/suspicious/noExplicitAny: gRPC client from dynamic proto-loader
		client: any,
		toolName: string,
		// biome-ignore lint/suspicious/noExplicitAny: MCP polymorphic
		params: any,
		// biome-ignore lint/suspicious/noExplicitAny: MCP polymorphic
	): Promise<any> {
		return new Promise((resolve) => {
			// Using direct tool name for hash parity in Alpha v1
			const capabilityHash = toolName;

			client.negotiateIntent(
				{
					agent_did: "did:liop:identity:mcp:proxy",
					capability_hash: capabilityHash,
					proof_of_intent: Buffer.from([]),
				},
				(err: Error | null, response: IntentResponse) => {
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
						Kyber768Wrapper.encapsulateAsymmetric(response.kyber_public_key);
					const proxyLogic = `return { "__liop_proxy_tool": "${toolName}", "__liop_proxy_args": env.args };`;
					const nonce = crypto.randomBytes(12);

					const sealedLogic = this.encryptWithNonce(
						Buffer.from(proxyLogic),
						sharedSecret,
						nonce,
					);
					const sealedArgs = this.encryptWithNonce(
						Buffer.from(JSON.stringify(params.arguments || {})),
						sharedSecret,
						nonce,
					);

					const call = client.executeLogic({
						session_token: response.session_token,
						wasm_binary: new Uint8Array(sealedLogic),
						inputs: { args: new Uint8Array(sealedArgs) },
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
								const isValid = await this.verifier.verifyZkReceipt(
									Buffer.from(proxyLogic),
									Buffer.from(lastResponse.cryptographic_proof).toString("hex"),
									Buffer.from(lastResponse.zk_receipt),
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

							const parsedResult = JSON.parse(resultBody);
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
