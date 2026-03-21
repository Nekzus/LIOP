import * as crypto from "node:crypto";
import type { MeshNode, NmpManifest } from "../mesh/index.js";
import { Kyber768Wrapper } from "../rpc/crypto/kyber.js";
import { nmpV1 } from "../rpc/proto.js";
import { createChannelCredentials } from "../rpc/tls.js";
import type { IntentResponse, LogicResponse } from "../rpc/types.js";
import type { NmpServer } from "../server/index.js";

/** Time-to-live for cached manifests (seconds) */
const MANIFEST_CACHE_TTL_S = 30;

/** Maximum number of DHT query retries for manifest discovery */
const MANIFEST_DISCOVERY_RETRIES = 3;

/**
 * NMP MCP Router
 *
 * Core logic for routing MCP requests to local or remote NMP providers.
 * Decoupled from transport (HTTP/Stdio).
 *
 * All tool discovery and port resolution is DYNAMIC via the
 * /nmp/manifest/1.0.0 protocol stream over Kademlia DHT.
 */
export class NmpMcpRouter {
	/** Cached manifests from remote peers. Key = PeerID */
	private manifestCache: Map<
		string,
		{ manifest: NmpManifest; cachedAt: number }
	> = new Map();

	/** Guards against concurrent discovery storms */
	private discovering = false;

	/** Callback when new remote tools are discovered */
	public onToolsChanged?: () => void;

	constructor(
		private nmpServer: NmpServer,
		private meshNode: MeshNode | null = null,
		private defaultRpcPort = 50051,
	) {}

	// biome-ignore lint/suspicious/noExplicitAny: MCP JSON-RPC dispatch is polymorphic
	public async dispatch(request: {
		method: string;
		// biome-ignore lint/suspicious/noExplicitAny: MCP params are polymorphic
		params?: any;
		// biome-ignore lint/suspicious/noExplicitAny: MCP id is polymorphic
		id?: any;
		// biome-ignore lint/suspicious/noExplicitAny: MCP response is polymorphic
	}): Promise<any> {
		const { method, params, id } = request;
		console.error(`[NMP-Router] Processing: ${method}`);

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
						serverInfo: this.nmpServer.getServerInfo(),
					},
				};
			case "notifications/initialized":
				return null; // No-op for MCP spec compliance
			case "ping":
				return { jsonrpc: "2.0", id, result: {} };
			case "tools/list": {
				const localTools = this.nmpServer.listTools();
				const remoteTools = await this.getRemoteTools();
				
				// Inyectamos una herramienta diagnóstica estática obligatoria.
				// Esto garantiza que la lista {tools: []} nunca esté vacía en el arranque.
				// Claude Desktop oculta silenciosamente el conector si recibe un array vacío al inicio,
				// lo cual rompía la UX debido a los ~3s de warm-up del Kademlia DHT.
				const diagnosticTool = {
					name: "NmpMeshStatus",
					description: "Returns the current dynamic status of the Zero-Trust Neural Mesh.",
					inputSchema: { type: "object", properties: {} }
				};

				return {
					jsonrpc: "2.0",
					id,
					result: { tools: [diagnosticTool, ...localTools, ...remoteTools] },
				};
			}
			case "tools/call":
				return this.transcodeMcpToNmp(id, params);
			case "resources/list": {
				const localResources = this.nmpServer.listResources();
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
					const result = this.nmpServer.readResource(params.uri as string);
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
			case "prompts/list":
				return {
					jsonrpc: "2.0",
					id,
					result: { prompts: this.nmpServer.listPrompts() },
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
	 * Discovers and caches manifests from all remote NMP providers in the mesh.
	 * Uses Kademlia DHT to find "nmp:manifest" providers, then opens
	 * /nmp/manifest/1.0.0 protocol streams to retrieve their full metadata.
	 */
	public async refreshManifestCache(silent = false): Promise<void> {
		if (!this.meshNode || this.discovering) return;

		this.discovering = true;
		try {
			const prevCount = Array.from(this.manifestCache.values()).reduce(
				(acc, { manifest }) => acc + manifest.tools.length, 0
			);

			// Retry logic for DHT warm-up latency
			let providerIds: string[] = [];
			for (let attempt = 0; attempt < MANIFEST_DISCOVERY_RETRIES; attempt++) {
				providerIds = await this.meshNode.discoverManifestProviders();
				if (providerIds.length > 0) break;
				if (attempt < MANIFEST_DISCOVERY_RETRIES - 1) {
					if (!silent) {
						console.error(
							`[NMP-Router] 🔄 DHT warm-up retry ${attempt + 1}/${MANIFEST_DISCOVERY_RETRIES}...`,
						);
					}
					await new Promise((r) => setTimeout(r, 1000));
				}
			}

			if (!silent && providerIds.length > 0) {
				console.error(
					`[NMP-Router] 📡 Found ${providerIds.length} manifest providers in DHT`,
				);
			}

			// Query each provider's manifest
			let cacheUpdated = false;
			for (const peerId of providerIds) {
				// Skip if cached and not expired
				const cached = this.manifestCache.get(peerId);
				if (
					cached &&
					Date.now() - cached.cachedAt < MANIFEST_CACHE_TTL_S * 1000
				) {
					continue;
				}

				const manifest = await this.meshNode.queryManifest(peerId);
				if (manifest) {
					this.manifestCache.set(peerId, {
						manifest,
						cachedAt: Date.now(),
					});
					cacheUpdated = true;
					if (!silent) {
						console.error(
							`[NMP-Router] ✅ Cached manifest from ${peerId}: ${manifest.tools.length} tools, gRPC:${manifest.grpcPort}`,
						);
					}
				}
			}

			if (cacheUpdated) {
				const newCount = Array.from(this.manifestCache.values()).reduce(
					(acc, { manifest }) => acc + manifest.tools.length, 0
				);
				
				if (newCount !== prevCount && this.onToolsChanged) {
					console.error(`[NMP-Router] 🔔 Mesh topology updated! Emitting notifications/tools/list_changed.`);
					this.onToolsChanged();
				}
			}

		} finally {
			this.discovering = false;
		}
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
		await this.refreshManifestCache();

		// biome-ignore lint/suspicious/noExplicitAny: Tool schema is polymorphic
		const tools: any[] = [];
		const seenNames = new Set(
			this.nmpServer.listTools().map((t) => t.name),
		);

		for (const { manifest } of this.manifestCache.values()) {
			for (const tool of manifest.tools) {
				if (!seenNames.has(tool.name)) {
					tools.push(tool);
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
		await this.refreshManifestCache();

		const resources: Array<{
			name: string;
			uri: string;
			description?: string;
			mimeType?: string;
		}> = [];
		const seenUris = new Set(
			this.nmpServer.listResources().map((r) => r.uri),
		);

		for (const { manifest } of this.manifestCache.values()) {
			for (const resource of manifest.resources) {
				if (!seenUris.has(resource.uri)) {
					resources.push(resource);
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
	private async transcodeMcpToNmp(id: any, params: any): Promise<any> {
		const toolName = params.name;

		// Intercept the static diagnostic tool
		if (toolName === "NmpMeshStatus") {
			const providerCount = this.manifestCache.size;
			const meshState = this.meshNode ? "Active" : "Offline";
			const cachedTools = Array.from(this.manifestCache.values()).reduce(
				(acc, { manifest }) => acc + manifest.tools.length, 
				0
			);
			const connections = this.meshNode ? (this.meshNode as any).node?.getConnections().length : 0;
			const bootstrapCount = (this.meshNode as any).config?.bootstrapNodes?.length || 0;
			
			return {
				jsonrpc: "2.0",
				id,
				result: {
					content: [
						{
							type: "text",
							text: `NMP Mesh Status: ${meshState}\nConnections: ${connections}\nBootstraps: ${bootstrapCount}\nProviders Discovered: ${providerCount}\nRemote Tools Mapped: ${cachedTools}`,
						},
					],
				},
			};
		}

		const isLocal = this.nmpServer.listTools().some((t) => t.name === toolName);

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
					`[NMP-Router] 📋 Resolved ${toolName} via manifest cache → ${grpcTarget}`,
				);
				const manifestClient = new nmpV1.NeuralMesh(
					grpcTarget,
					createChannelCredentials(),
				);
				return this.performTranscoding(id, manifestClient, toolName, params);
			}
		}

		// If no remote provider found, try local execution
		if (isLocal) {
			try {
				const result = await this.nmpServer.callTool({
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

		for (const addr of addrs) {
			const parts = addr.split("/");
			const ipIdx = parts.indexOf("ip4");
			if (ipIdx !== -1) {
				targetAddr = `${parts[ipIdx + 1]}:${grpcPort}`;
				break;
			}
		}

		if (!targetAddr) {
			// Fallback to localhost with the dynamically resolved port
			targetAddr = `127.0.0.1:${grpcPort}`;
		}

		console.error(
			`[NMP-Router] 🧭 Dynamic route: ${toolName} → ${targetAddr} (PeerID: ${peerId})`,
		);

		const remoteClient = new nmpV1.NeuralMesh(
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
					agent_did: "did:nmp:identity:mcp:proxy",
					capability_hash: capabilityHash,
					proof_of_intent: Buffer.from([]),
				},
				(err: Error | null, response: IntentResponse) => {
					if (err || !response.accepted) {
						return resolve({
							jsonrpc: "2.0",
							id,
							error: { code: -32001, message: "PQC Handshake Failed" },
						});
					}

					const { ciphertext, sharedSecret } =
						Kyber768Wrapper.encapsulateAsymmetric(response.kyber_public_key);
					const proxyLogic = `return { "__nmp_proxy_tool": "${toolName}", "__nmp_proxy_args": env.args };`;
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
					call.on("data", (grpcRes: LogicResponse) => {
						resultBody += grpcRes.semantic_evidence;
					});
					call.on("end", () => {
						try {
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
							error: { code: -32603, message: `NMP Error: ${e.message}` },
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
