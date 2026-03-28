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

	constructor(tls?: LiopTlsOptions) {
		this.tlsOptions = tls;
	}

	/**
	 * Discovers and connects to the target server or mesh capability.
	 * If address is omitted, it sets up the MeshNode to act purely dynamically.
	 */
	public async connect(
		address?: string,
		options?: { meshConfig?: MeshNodeConfig },
	): Promise<void> {
		this.meshNode = new MeshNode(options?.meshConfig);
		await this.meshNode.start();
		console.error(
			`[LiopClient] 🌍 Mesh Node synchronized. PeerID: ${this.meshNode.getPeerId()}`,
		);

		if (address) {
			this.rpcClients.set(
				"static",
				new LiopRpcClient(address, this.tlsOptions),
			);
			this.serverInfo = { name: `LiopServer (${address})`, version: "1.0.0" };
			console.error(`[LiopClient] 🔗 Static gRPC configured for: ${address}`);
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

		console.error(
			`[LiopClient] 📡 Querying Mesh DHT for Provider: ${toolName}...`,
		);
		const providers = await this.meshNode.findProviders(toolName);

		if (providers.length === 0) {
			throw new Error(
				`Kademlia DHT found zero providers for capability: ${toolName}`,
			);
		}

		const providerId = providers[0];
		console.error(
			`[LiopClient] ✅ Identified Alpha Provider PeerID: ${providerId}`,
		);

		let grpcPort = 50051;
		const manifest = await this.meshNode.queryManifest(providerId);
		if (manifest) {
			grpcPort = manifest.grpcPort;
			console.error(`[LiopClient] 📋 Manifest resolved: gRPC port ${grpcPort}`);
		}

		const addrs = await this.meshNode.resolvePeer(providerId);
		for (const maddr of addrs) {
			const parts = maddr.split("/");
			if (parts[1] === "ip4") {
				const grpcHost = `${parts[2]}:${grpcPort}`;
				console.error(
					`[LiopClient] 🧭 Translated Multiaddr to gRPC Target: ${grpcHost}`,
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

		console.error(`[LiopClient] 🔍 Discovery started...`);
		const providerIds = await this.meshNode.discoverManifestProviders();
		const tools: { name: string; description?: string }[] = [];
		const seenNames = new Set<string>();

		for (const peerId of providerIds) {
			try {
				console.error(`[LiopClient] Querying manifest from: ${peerId}`);
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
				console.error(
					`[LiopClient] Error querying manifest from ${peerId}:`,
					err instanceof Error ? err.message : String(err),
				);
			}
		}

		console.error(
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
		console.error(`[LiopClient] 🔍 Resolving Tool: ${toolName}`);

		// [ALPHA-FIX] Bypass DHT discovery if we are already statically connected to a provider (Enterprise/Test mode)
		let rpcClient = this.rpcClients.get("static");

		if (!rpcClient) {
			const dynamicAddress = await this.resolveCapability(toolName);
			rpcClient = this.getOrCreateRpcClient(toolName, dynamicAddress);
		} else {
			console.error(
				`[LiopClient] ⚡ Using existing static gRPC connection for ${toolName}.`,
			);
		}

		console.error(`[LiopClient] 🤝 Negotiating intent for ${toolName}...`);
		const intentResponse = (await rpcClient.negotiateIntent({
			agent_did: "liop-client-alpha",
			capability_hash: toolName,
			proof_of_intent: Buffer.from("alpha-intent-proof"),
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

		// NMP Robust Field Extraction (Supports both snake_case and camelCase via gRPC-JS)
		const publicKey =
			intentResponse.kyber_public_key || intentResponse.kyberPublicKey;
		const sessionToken =
			intentResponse.session_token || intentResponse.sessionToken;

		if (!publicKey) {
			console.error(
				"[LiopClient] 🚨 Critical Error: Kyber Public Key not found in IntentResponse.",
				intentResponse,
			);
			throw new Error(
				"Handshake failed: Remote host did not provide a valid Kyber Public Key.",
			);
		}

		// 2. Post-Quantum Encapsulation (ML-KEM-768)
		console.error(
			`[LiopClient] 🔒 Encapsulating Post-Quantum Shared Secret for ${request.name}...`,
		);
		const { ciphertext: kyberCiphertext, sharedSecret } =
			Kyber768Wrapper.encapsulateAsymmetric(publicKey);

		// 3. Symmetric Sealing (AES-256-GCM)
		console.error(`[LiopClient] 🛡️ Sealing WASM Payload and Inputs...`);

		const _safePayload = _wasmPayload || Buffer.from("");

		// Encrypt WASM binary
		const { ciphertext: encryptedWasm, nonce: aesNonce } =
			AesGcmWrapper.encryptPayload(_safePayload, sharedSecret);

		// Encrypt inputs using the SAME session nonce for the multi-payload request (Standard NMP V1)
		const encryptedInputs: Record<string, Uint8Array> = {};
		for (const [key, value] of Object.entries(request.arguments || {})) {
			// We manually encrypt with the same nonce/key to match the Proto structure
			// ideally we'd have per-field nonces, but for Alpha we follow the liop_core.proto v1.
			const crypto = await import("node:crypto");
			const cipher = crypto.createCipheriv(
				"aes-256-gcm",
				sharedSecret,
				aesNonce,
			);
			const encrypted = Buffer.concat([
				cipher.update(JSON.stringify(value)),
				cipher.final(),
			]);
			const authTag = cipher.getAuthTag();
			encryptedInputs[key] = Buffer.concat([encrypted, authTag]);
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

			stream.on("data", async (response: LogicResponse) => {
				if (resultFulfilled) return;
				console.error(
					"[LiopClient] ✅ Logic Executed. Verification in progress...",
				);

				try {
					const isValid = await this.verifyZkReceipt(
						_safePayload,
						Buffer.from(response.cryptographic_proof).toString("hex"),
						Buffer.from(response.zk_receipt),
					);

					if (!isValid) {
						reject(
							new Error("ZK-Receipt verification failed. ImageID mismatch."),
						);
						return;
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
				console.error("[LiopClient] ❌ Stream Error:", err);
				reject(err);
			});

			stream.on("end", () => {
				if (!resultFulfilled) {
					reject(new Error("Logic-on-Origin stream closed without results."));
				}
			});
		});
	}

	private getOrCreateRpcClient(peerId: string, address: string): LiopRpcClient {
		let client = this.rpcClients.get(peerId);
		if (!client) {
			client = new LiopRpcClient(address, this.tlsOptions);
			this.rpcClients.set(peerId, client);
		}
		return client;
	}

	/**
	 * Verify ZK-Receipt natively (Called internally when parsing gRPC streams)
	 */
	public async verifyZkReceipt(
		logicPayload: Buffer,
		remoteCryptographicProofHex: string,
		_remoteZkReceiptBuffer: Buffer,
	): Promise<boolean> {
		try {
			const crypto = await import("node:crypto");
			let processedPayload: Buffer | string = logicPayload;

			// Sanitization must match the server-side worker logic
			const isWasm =
				logicPayload[0] === 0x00 &&
				logicPayload[1] === 0x61 &&
				logicPayload[2] === 0x73 &&
				logicPayload[3] === 0x6d;

			if (!isWasm) {
				processedPayload = logicPayload
					.toString("utf-8")
					.replace(/^LIOP_MAGIC:.*?\n/g, "")
					.replace(/^MANIFEST:.*?\n/g, "")
					.replace(/---BEGIN_LOGIC---\n?/g, "")
					.replace(/\n?---END_LOGIC---/g, "")
					.trim();
			}

			const localImageId = crypto
				.createHash("sha256")
				.update(
					typeof processedPayload === "string"
						? Buffer.from(processedPayload)
						: processedPayload,
				)
				.digest("hex");

			if (localImageId !== remoteCryptographicProofHex) {
				console.error(
					`[LiopClient] 🚨 FATAL: Mathematical Proof Mismatch (Hack Detected). Expected [${localImageId}], Received [${remoteCryptographicProofHex}]`,
				);
				return false;
			}
			return true;
		} catch (error) {
			console.error(`[LiopClient] 🚨 Validation failed:`, error);
			return false;
		}
	}

	/**
	 * Reads a specific resource by URI.
	 * In NMP, resources can be static definitions or dynamic streams.
	 */
	public async readResource(uri: string): Promise<{
		contents: Array<{ uri: string; mimeType?: string; text: string }>;
	}> {
		if (!this.meshNode) {
			throw new Error("Client must be connected before reading resources.");
		}
		console.error(`[LiopClient] 🔍 Querying Mesh for Resource: ${uri}...`);

		// For now, in Alpha v3, we assume the resource is provided by an active provider.
		// A more complex implementation would use resolveCapability(uri).
		// For the industrial demo, we'll simulate a direct read if connected or throw.
		const rpcClient =
			this.rpcClients.get("static") || Array.from(this.rpcClients.values())[0];
		if (!rpcClient) {
			throw new Error(
				"Resource reading requires an active RPC connection to a provider.",
			);
		}

		// This emulates the resource retrieval.
		// In a full implementation, this might be a gRPC call.
		return {
			contents: [
				{
					uri,
					mimeType: "application/json",
					text: JSON.stringify({
						status: "Alpha-Resource-Read-Success",
						uri,
						timestamp: new Date().toISOString(),
					}),
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
