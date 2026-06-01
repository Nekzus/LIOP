import { LiopVerifier } from "../crypto/verifier.js";
import {
	type LiopManifest,
	MeshNode,
	type MeshNodeConfig,
} from "../mesh/node.js";
import { LiopRpcClient } from "../rpc/client.js";
import { AesGcmWrapper } from "../rpc/crypto/aes.js";
import { Kyber768Wrapper } from "../rpc/crypto/kyber.js";
import type { LiopTlsOptions } from "../rpc/tls.js";
import type { LogicRequest, LogicResponse } from "../rpc/types.js";
import type { CallToolRequest, CallToolResult } from "../types.js";
import { log } from "../utils/logger.js";

/**
 * LIOP Client
 * High-level orchestration for discovery and execution in the Logic-Injection-on-Origin mesh.
 */
export class LiopClient {
	private meshNode: MeshNode | null = null;
	private rpcClients: Map<string, LiopRpcClient> = new Map();
	private manifests: Map<string, LiopManifest> = new Map();
	private tlsOptions?: LiopTlsOptions;
	private serverInfo?: { name: string; version: string };
	public verifier: LiopVerifier = new LiopVerifier();
	private oauthToken?: string;

	constructor(tls?: LiopTlsOptions) {
		this.tlsOptions = tls;
	}

	/**
	 * Requests an M2M access token from the Nexus Authorization Server using Client Credentials.
	 */
	private async acquireM2MToken(authOpts: {
		clientId: string;
		clientSecret: string;
		nexusUrl: string;
		audience: string;
		scope?: string;
	}): Promise<string> {
		const baseUrl = authOpts.nexusUrl.endsWith("/oidc")
			? authOpts.nexusUrl
			: `${authOpts.nexusUrl}/oidc`;
		const tokenUrl = `${baseUrl}/token`;
		log.info(`[LiopClient] Requesting M2M Token from Nexus AS: ${tokenUrl}`);

		const params = new URLSearchParams({
			grant_type: "client_credentials",
			scope:
				authOpts.scope ||
				"liop:tools:call liop:tools:list liop:resources:read liop:schema:read liop:mesh:query",
			resource: authOpts.audience,
			client_id: authOpts.clientId,
			client_secret: authOpts.clientSecret,
		});

		const response = await fetch(tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params.toString(),
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(
				`OAuth token request failed with status ${response.status}: ${text}`,
			);
		}

		const data = (await response.json()) as {
			access_token: string;
			expires_in?: number;
		};
		if (!data.access_token) {
			throw new Error("OAuth token response did not contain an access_token.");
		}

		log.info("[LiopClient] M2M Token acquired successfully.");
		return data.access_token;
	}

	/**
	 * Discovers and connects to the target server or mesh capability.
	 * If address is omitted, it sets up the MeshNode to act purely dynamically.
	 */
	public async connect(
		address?: string,
		options?: {
			meshConfig?: MeshNodeConfig;
			auth?: {
				clientId?: string;
				clientSecret?: string;
				nexusUrl?: string;
				audience?: string;
				scope?: string;
				token?: string;
			};
		},
	): Promise<void> {
		// Attempt to acquire OAuth M2M access token if credentials are provided
		const clientId =
			options?.auth?.clientId ||
			process.env.LIOP_OAUTH_CLIENT_ID ||
			process.env.LIOP_CLIENT_ID;
		const clientSecret =
			options?.auth?.clientSecret ||
			process.env.LIOP_OAUTH_CLIENT_SECRET ||
			process.env.LIOP_CLIENT_SECRET;
		const nexusUrl =
			options?.auth?.nexusUrl ||
			process.env.LIOP_NEXUS_URL ||
			"http://localhost:3000";
		const audience =
			options?.auth?.audience ||
			process.env.LIOP_OAUTH_AUDIENCE ||
			"urn:liop:mesh:api";
		const scope =
			options?.auth?.scope ||
			process.env.LIOP_OAUTH_SCOPE ||
			"liop:tools:call liop:tools:list liop:resources:read liop:schema:read liop:mesh:query";

		this.oauthToken =
			options?.auth?.token ||
			process.env.LIOP_OAUTH_TOKEN ||
			process.env.LIOP_TOKEN;

		if (clientId && clientSecret) {
			try {
				this.oauthToken = await this.acquireM2MToken({
					clientId,
					clientSecret,
					nexusUrl,
					audience,
					scope,
				});
			} catch (err: unknown) {
				log.error(
					`[LiopClient] Failed to acquire OAuth M2M Token: ${
						err instanceof Error ? err.message : String(err)
					}`,
				);
				// In development or when using static local token, allow connection to proceed
			}
		}

		this.meshNode = new MeshNode(options?.meshConfig);
		await this.meshNode.start();
		log.info(
			`[LiopClient] Mesh Node synchronized. PeerID: ${this.meshNode.getPeerId()}`,
		);

		if (address) {
			this.rpcClients.set(
				"static",
				new LiopRpcClient(address, this.tlsOptions, this.oauthToken),
			);
			this.serverInfo = { name: `LiopServer (${address})`, version: "1.0.0" };
			log.info(`[LiopClient] Static gRPC configured for: ${address}`);
		} else {
			this.serverInfo = { name: "LiopServer (Mesh Alpha)", version: "1.0.0" };
		}
	}

	/**
	 * Dynamically queries Kademlia DHT to find the optimal PeerID providing the Capability
	 * and returns the physical gRPC target (host:port) resolved from the provider's manifest.
	 */
	public async resolveCapability(toolName: string): Promise<string> {
		if (!this.meshNode)
			throw new Error(
				"Client must be connected to Mesh to resolve capabilities.",
			);

		log.info(`[LiopClient] Querying Mesh DHT for Provider: ${toolName}...`);
		const providers = await this.meshNode.findProviders(toolName);

		if (providers.length === 0) {
			throw new Error(
				`Kademlia DHT found zero providers for capability: ${toolName}`,
			);
		}

		const providerId = providers[0];
		log.info(`[LiopClient] Identified Alpha Provider PeerID: ${providerId}`);

		let grpcPort = 50051;
		const manifest = await this.meshNode.queryManifest(providerId);
		if (manifest) {
			grpcPort = manifest.grpcPort;
			log.info(`[LiopClient] Manifest resolved: gRPC port ${grpcPort}`);
		}

		const addrs = await this.meshNode.resolvePeer(providerId);
		for (const maddr of addrs) {
			const parts = maddr.split("/");
			if (parts[1] === "ip4") {
				const grpcHost = `${parts[2]}:${grpcPort}`;
				log.info(
					`[LiopClient] Translated Multiaddr to gRPC Target: ${grpcHost}`,
				);
				return grpcHost;
			}
		}

		return `127.0.0.1:${grpcPort}`;
	}

	/**
	 * Discovers remote capabilities via the LIOP Manifest Protocol.
	 */
	public async discoverTools(): Promise<
		{ name: string; description?: string }[]
	> {
		if (!this.meshNode) {
			throw new Error("Client must be connected before discovering tools.");
		}

		log.info(`[LiopClient] Discovery started...`);
		const providerIds = await this.meshNode.discoverManifestProviders();
		const tools: { name: string; description?: string }[] = [];
		const seenNames = new Set<string>();

		for (const peerId of providerIds) {
			try {
				log.info(`[LiopClient] Querying manifest from: ${peerId}`);
				const manifest = await this.meshNode.queryManifest(peerId);
				if (manifest) {
					this.manifests.set(peerId, manifest);
					for (const tool of manifest.tools) {
						if (!seenNames.has(tool.name)) {
							tools.push({ name: tool.name, description: tool.description });
							seenNames.add(tool.name);
						}
					}
				}
			} catch (err: unknown) {
				log.info(
					`[LiopClient] Error querying manifest from ${peerId}:`,
					err instanceof Error ? err.message : String(err),
				);
			}
		}

		log.info(
			`[LiopClient] Discovery finished. Found ${tools.length} unique tools.`,
		);
		return tools;
	}

	/**
	 * Invokes a tool.
	 */
	public async callTool(
		request: CallToolRequest,
		_wasmPayload?: Buffer,
	): Promise<CallToolResult> {
		if (!this.meshNode) {
			throw new Error("Client must be connected before calling tools.");
		}

		const toolName = request.name;
		log.info(`[LiopClient] Resolving Tool: ${toolName}`);

		// [ALPHA-FIX] Bypass DHT discovery if we are already statically connected to a provider (Enterprise/Test mode)
		let rpcClient = this.rpcClients.get("static");

		if (!rpcClient) {
			const dynamicAddress = await this.resolveCapability(toolName);
			rpcClient = this.getOrCreateRpcClient(toolName, dynamicAddress);
		} else {
			log.info(
				`[LiopClient] Using existing static gRPC connection for ${toolName}.`,
			);
		}

		log.info(`[LiopClient] Negotiating intent for ${toolName}...`);
		const agentDid = this.meshNode
			? `did:liop:${this.meshNode.getPeerId()}`
			: "did:liop:ephemeral";
		const intentPayload = Buffer.from(`${toolName}:${Date.now()}`);
		const proofOfIntent = this.meshNode
			? await this.meshNode.sign(intentPayload)
			: intentPayload;

		const intentResponse = (await rpcClient.negotiateIntent({
			agent_did: agentDid,
			capability_hash: toolName,
			proof_of_intent: proofOfIntent,
		})) as unknown as {
			accepted: boolean;
			error_message: string;
			kyber_public_key: Uint8Array;
			kyberPublicKey: Uint8Array;
			session_token: string;
			sessionToken: string;
		};

		if (!intentResponse.accepted) {
			throw new Error(`Intent denied by host: ${intentResponse.error_message}`);
		}

		// LIOP Robust Field Extraction (Supports both snake_case and camelCase via gRPC-JS)
		const publicKey =
			intentResponse.kyber_public_key || intentResponse.kyberPublicKey;
		const sessionToken =
			intentResponse.session_token || intentResponse.sessionToken;

		if (!publicKey) {
			log.info(
				"[LiopClient] Critical Error: Kyber Public Key not found in IntentResponse.",
				intentResponse,
			);
			throw new Error(
				"Handshake failed: Remote host did not provide a valid Kyber Public Key.",
			);
		}

		// 2. Post-Quantum Encapsulation (ML-KEM-768)
		log.info(
			`[LiopClient] Encapsulating Post-Quantum Shared Secret for ${request.name}...`,
		);
		const { ciphertext: kyberCiphertext, sharedSecret } =
			await Kyber768Wrapper.encapsulateAsymmetric(publicKey);

		// 3. Symmetric Sealing (AES-256-GCM)
		log.info(`[LiopClient] Sealing WASM Payload and Inputs...`);

		const _safePayload = _wasmPayload || Buffer.from("");

		// Encrypt WASM binary
		const { ciphertext: encryptedWasm, nonce: aesNonce } =
			AesGcmWrapper.encryptPayload(_safePayload, sharedSecret);

		// Encrypt inputs using a fresh random nonce per input to prevent AES-GCM nonce reuse
		const encryptedInputs: Record<string, Uint8Array> = {};
		const crypto = await import("node:crypto");
		for (const [key, value] of Object.entries(request.arguments || {})) {
			const inputNonce = crypto.randomBytes(12);
			const cipher = crypto.createCipheriv(
				"aes-256-gcm",
				sharedSecret,
				inputNonce,
			);
			const encrypted = Buffer.concat([
				cipher.update(JSON.stringify(value)),
				cipher.final(),
			]);
			const authTag = cipher.getAuthTag();
			// Prepend the 12-byte nonce to the ciphertext
			encryptedInputs[key] = Buffer.concat([inputNonce, encrypted, authTag]);
		}

		// 4. Assemble and Execute gRPC LogicRequest
		const logicRequest: LogicRequest = {
			session_token: sessionToken,
			wasm_binary: encryptedWasm,
			inputs: encryptedInputs,
			pqc_ciphertext: kyberCiphertext,
			aes_nonce: aesNonce,
		};

		return new Promise((resolve, reject) => {
			const stream = rpcClient.executeLogic(logicRequest);
			if (!stream) {
				reject(new Error("RPC Client unavailable or failed to create stream."));
				return;
			}
			let resultFulfilled = false;
			let hasReceivedData = false;

			stream.on("data", async (response: LogicResponse) => {
				if (resultFulfilled) return;
				hasReceivedData = true;

				log.info("[LiopClient] Logic Executed. Verification in progress...");

				try {
					// Only verify ZK-Receipt if the remote execution succeeded.
					// If the remote execution failed due to a policy error (e.g. Egress Shield),
					// the ZK proof is empty and we should bypass validation to propagate the original error.
					if (!response.is_error) {
						const isValid = await this.verifier.verifyZkReceipt(
							_safePayload,
							Buffer.from(response.cryptographic_proof).toString("hex"),
							Buffer.from(response.zk_receipt),
							Buffer.from(sharedSecret),
						);

						if (!isValid) {
							reject(
								new Error(
									"PROTOCOL INTEGRITY VIOLATION: ZK-Receipt verification failed.",
								),
							);
							return;
						}
					}

					resultFulfilled = true;
					resolve({
						content: [
							{
								type: "text",
								text: response.semantic_evidence,
							},
						],
						isError: response.is_error,
					});
				} catch (err) {
					reject(err);
				}
			});

			stream.on("error", (err) => {
				if (resultFulfilled) return;
				log.error("[LiopClient] Stream Error:", err);
				reject(err);
			});

			stream.on("end", () => {
				// We don't throw here if we already received a response block that is currently
				// undergoing ZK Verification in the Piscina worker pool.
				if (!hasReceivedData && !resultFulfilled) {
					reject(new Error("Logic-on-Origin stream closed without results."));
				}
			});
		});
	}

	private getOrCreateRpcClient(peerId: string, address: string): LiopRpcClient {
		let client = this.rpcClients.get(peerId);
		if (!client) {
			let nodeToken = this.oauthToken;

			let manifest = this.manifests.get(peerId);
			let realPeerId = peerId;

			// If peerId is actually a toolName (which happens when called from callTool),
			// resolve the real PeerID and its manifest from the manifest cache.
			if (!manifest) {
				for (const [pId, m] of this.manifests.entries()) {
					if (m.tools.some((t) => t.name === peerId)) {
						manifest = m;
						realPeerId = pId;
						break;
					}
				}
			}

			const providerName = manifest?.serverInfo?.name?.toLowerCase() || "";
			let envToken: string | undefined;

			// 0. Deterministic tokenSlug resolution (highest priority, zero heuristic)
			const slug = manifest?.tokenSlug;
			if (slug) {
				envToken =
					process.env[`LIOP_TOKEN_${slug}`] ||
					process.env[`LIOP_OAUTH_TOKEN_${slug}`];
			}

			// 1. PeerID-specific resolution: LIOP_TOKEN_<last 8 chars of PeerID in uppercase>
			if (!envToken && realPeerId) {
				const shortId = realPeerId.slice(-8).toUpperCase();
				envToken =
					process.env[`LIOP_TOKEN_${shortId}`] ||
					process.env[`LIOP_OAUTH_TOKEN_${shortId}`];
			}

			// 2. Provider-name resolution: LIOP_TOKEN_<CLEAN_PROVIDER_NAME_UPPERCASE>
			if (!envToken && providerName) {
				const cleanName = providerName
					.toUpperCase()
					.replace(/[^A-Z0-9_]/g, "_");
				envToken =
					process.env[`LIOP_TOKEN_${cleanName}`] ||
					process.env[`LIOP_OAUTH_TOKEN_${cleanName}`];
			}

			if (envToken) {
				log.info(
					`[LiopClient] Resolved node-specific token for peer ${realPeerId.slice(-8)} (${providerName || "unknown"})`,
				);
				nodeToken = envToken;
			}

			client = new LiopRpcClient(address, this.tlsOptions, nodeToken);
			this.rpcClients.set(peerId, client);
		}
		return client;
	}

	/**
	 * Reads a specific resource by URI.
	 * In LIOP, resources can be static definitions or dynamic streams.
	 */
	public async readResource(uri: string): Promise<{
		contents: Array<{ uri: string; mimeType?: string; text: string }>;
	}> {
		if (!this.meshNode) {
			throw new Error("Client must be connected before reading resources.");
		}
		log.info(`[LiopClient] Querying Mesh for Resource: ${uri}...`);

		// We search for the peer hosting the resource in the P2P Mesh
		const providers = await this.meshNode.findProviders(uri);
		if (providers.length === 0) {
			throw new Error(`No mesh providers found for resource: ${uri}`);
		}

		// Query the remote peer's manifest
		const manifest = await this.meshNode.queryManifest(providers[0]);
		if (!manifest) {
			throw new Error("Target peer did not return a valid LIOP Manifest.");
		}

		// Locate the exact resource metadata
		const resourceDef = manifest.resources?.find((r) => r.uri === uri);
		if (!resourceDef) {
			throw new Error(`Resource ${uri} not listed in remote manifest.`);
		}

		// Return the declarative metadata (Logic-Injection is required for actual data extraction)
		return {
			contents: [
				{
					uri,
					mimeType: resourceDef.mimeType || "application/json",
					text: JSON.stringify(resourceDef, null, 2),
				},
			],
		};
	}

	public getServerInfo(): { name: string; version: string } | undefined {
		return this.serverInfo;
	}

	/**
	 * Destroys the active Mesh Node resources.
	 */
	public async close(): Promise<void> {
		if (this.meshNode) {
			await this.meshNode.stop();
		}
	}
}
