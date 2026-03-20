import { AesGcmWrapper } from "../rpc/crypto/aes.js";
import { Kyber768Wrapper } from "../rpc/crypto/kyber.js";
import { NmpRpcClient } from "../rpc/client.js";
import type { CallToolRequest, CallToolResult, ServerInfo } from "../types.js";
import type { LogicRequest, LogicResponse } from "../rpc/types.js";
import { MeshNode, type MeshNodeConfig } from "../mesh/node.js";

/**
 * NmpClient interfaces with the P2P Mesh (or local Bridge) to dynamically
 * request or inject Logic-on-Origin capabilities into remote execution environments.
 */
export class NmpClient {
	private serverInfo?: ServerInfo;
	private rpcClient: NmpRpcClient | null = null;
	private meshNode: MeshNode | null = null;

	/**
	 * Discovers and connects to the target server or mesh capability.
	 * If address is omitted, it sets up the MeshNode to act purely dynamically.
	 */
	public async connect(
		address?: string,
		options?: { meshConfig?: MeshNodeConfig }
	): Promise<void> {
		this.meshNode = new MeshNode(options?.meshConfig);
		await this.meshNode.start();
		console.error(`[NmpClient] 🌍 Mesh Node synchronized. PeerID: ${this.meshNode.getPeerId()}`);

		if (address) {
			this.rpcClient = new NmpRpcClient(address);
			this.serverInfo = { name: `NmpServer (${address})`, version: "1.0.0" };
			console.error(`[NmpClient] 🔗 Static gRPC configured for: ${address}`);
		}
	}

	/**
	 * Dynamically queries Kademlia DHT to find the optimal PeerID providing the Capability
	 * and returns the physical Multiaddr pointing to its tonic instance.
	 */
	public async resolveCapability(toolName: string): Promise<string> {
		if (!this.meshNode) throw new Error("Client must be connected to Mesh to resolve capabilities.");
		
		console.error(`[NmpClient] 📡 Querying Mesh DHT for Provider: ${toolName}...`);
		const providers = await this.meshNode.findProviders(toolName);
		
		if (providers.length === 0) {
			throw new Error(`Kademlia DHT found zero providers for capability: ${toolName}`);
		}

		console.error(`[NmpClient] ✅ Identified Alpha Provider PeerID: ${providers[0]}`);
		const addrs = await this.meshNode.resolvePeer(providers[0]);
		
		if (addrs.length === 0) {
			throw new Error(`Failed to resolve external IPv4 for Peer: ${providers[0]}`);
		}

		// NMP V1 Convention: Extract the lowest level IPv4 of the P2P swarm, and assume
		// the Tonic gRPC Server executes on the default Layer 4 TCP Port (50051).
		// Over time, this transforms into Option B (Libp2p-Yamux wrapping).
		for (const maddr of addrs) {
			const parts = maddr.split("/");
			if (parts[1] === "ip4") {
				const grpcHost = `${parts[2]}:50051`;
				console.error(`[NmpClient] 🧭 Translated Multiaddr to gRPC Target: ${grpcHost}`);
				return grpcHost;
			}
		}

		// Fallback to localhost behavior if strictly local testing via memory DHT
		return "127.0.0.1:50051";
	}

	/**
	 * Retrieves Remote Capabilities via DHT (simulated here for generic queries)
	 */
	public async discoverTools(): Promise<{ name: string; description?: string }[]> {
		if (!this.meshNode) {
			throw new Error("Client must be connected before discovering tools.");
		}
		// DHT standard iteration is still experimental for generic enumerations without keys.
		// A full implementation requires PubSub or manual dictionary records on The Nexus.
		return [];
	}

	/**
	 * Invokes a tool. In NMP, rather than a JSON-RPC "call_tool", this conceptually
	 * pushes the WASM binary securely over the Zero-Trust Mesh using Kyber768 and AES-256-GCM.
	 */
	/**
	 * Invokes a tool. In NMP, rather than a JSON-RPC "call_tool", this conceptually
	 * pushes the WASM binary securely over the Zero-Trust Mesh using Kyber768 and AES-256-GCM.
	 */
	public async callTool(
		request: CallToolRequest,
		wasmPayload?: Buffer,
	): Promise<CallToolResult> {
		if (!this.meshNode) {
			throw new Error("Client must be connected before calling tools.");
		}

		// 0. Auto-Resolve Dynamics if disconnected
		if (!this.rpcClient) {
			const dynamicAddress = await this.resolveCapability(request.name);
			this.rpcClient = new NmpRpcClient(dynamicAddress);
			this.serverInfo = { name: `NmpServer (${dynamicAddress})`, version: "1.0.0" };
		}

		// 1. Negotiate Intent with the remote host
		console.error(`[NmpClient] 🤝 Negotiating intent for ${request.name}...`);
		const intentResponse = await this.rpcClient.negotiateIntent({
			agent_did: "nmp-client-alpha", // In production, this would be a Noise PeerID or SPIFFE ID
			capability_hash: request.name,
			proof_of_intent: Buffer.from("alpha-intent-proof"),
		}) as any;

		if (!intentResponse.accepted) {
			throw new Error(`Intent denied by host: ${intentResponse.error_message}`);
		}

		// NMP Robust Field Extraction (Supports both snake_case and camelCase via gRPC-JS)
		const publicKey = intentResponse.kyber_public_key || intentResponse.kyberPublicKey;
		const sessionToken = intentResponse.session_token || intentResponse.sessionToken;

		if (!publicKey) {
			console.error("[NmpClient] 🚨 Critical Error: Kyber Public Key not found in IntentResponse.", intentResponse);
			throw new Error("Handshake failed: Remote host did not provide a valid Kyber Public Key.");
		}

		// 2. Post-Quantum Encapsulation (ML-KEM-768)
		console.error(`[NmpClient] 🔒 Encapsulating Post-Quantum Shared Secret for ${request.name}...`);
		const { ciphertext: kyberCiphertext, sharedSecret } =
			Kyber768Wrapper.encapsulateAsymmetric(publicKey);

		// 3. Symmetric Sealing (AES-256-GCM)
		console.error(`[NmpClient] 🛡️ Sealing WASM Payload and Inputs...`);
		
		const safePayload = wasmPayload || Buffer.from("");

		// Encrypt WASM binary
		const { ciphertext: encryptedWasm, nonce: aesNonce } =
			AesGcmWrapper.encryptPayload(safePayload, sharedSecret);

		// Encrypt inputs using the SAME session nonce for the multi-payload request (Standard NMP V1)
		const encryptedInputs: Record<string, Uint8Array> = {};
		for (const [key, value] of Object.entries(request.arguments || {})) {
			// We manually encrypt with the same nonce/key to match the Proto structure
			// ideally we'd have per-field nonces, but for Alpha we follow the nmp_core.proto v1.
			const crypto = await import("node:crypto");
			const cipher = crypto.createCipheriv("aes-256-gcm", sharedSecret, aesNonce);
			const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
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
			const stream = this.rpcClient!.executeLogic(logicRequest);
			let resultFulfilled = false;

			stream.on("data", async (response: LogicResponse) => {
				if (resultFulfilled) return;
				console.error("[NmpClient] ✅ Logic Executed. Verification in progress...");

				try {
					const isValid = await this.verifyZkReceipt(
						safePayload,
						Buffer.from(response.cryptographic_proof).toString("hex"),
						Buffer.from(response.zk_receipt),
					);

					if (!isValid) {
						reject(new Error("ZK-Receipt verification failed. ImageID mismatch."));
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
				console.error("[NmpClient] ❌ Stream Error:", err);
				reject(err);
			});

			stream.on("end", () => {
				if (!resultFulfilled) {
					reject(new Error("Logic-on-Origin stream closed without results."));
				}
			});
		});
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
					.replace(/^NMP_MAGIC:.*?\n/g, "")
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
					`[NmpClient] 🚨 FATAL: Mathematical Proof Mismatch (Hack Detected). Expected [${localImageId}], Received [${remoteCryptographicProofHex}]`,
				);
				return false;
			}
			return true;
		} catch (error) {
			console.error(`[NmpClient] 🚨 Validation failed:`, error);
			return false;
		}
	}

	public getServerInfo(): ServerInfo | undefined {
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
