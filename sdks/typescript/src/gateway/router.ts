import * as crypto from "node:crypto";
import type { MeshNode } from "../mesh/index.js";
import { Kyber768Wrapper } from "../rpc/crypto/kyber.js";
import { nmpV1 } from "../rpc/proto.js";
import { createChannelCredentials } from "../rpc/tls.js";
import type { IntentResponse, LogicResponse } from "../rpc/types.js";
import type { NmpServer } from "../server/index.js";

/**
 * NMP MCP Router
 *
 * Core logic for routing MCP requests to local or remote NMP providers.
 * Decoupled from transport (HTTP/Stdio).
 */
export class NmpMcpRouter {
	// biome-ignore lint/suspicious/noExplicitAny: Temporary for Alpha v1 heterogeneous tool list
	private virtualTools: any[] = [];
	// biome-ignore lint/suspicious/noExplicitAny: Internal gRPC client from dynamic proto-loader
	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: Initialized in constructor for Alpha v1 flows
	private internalRpcClient: any;

	constructor(
		private nmpServer: NmpServer,
		private meshNode: MeshNode | null = null,
		rpcPort = 50051,
		// biome-ignore lint/suspicious/noExplicitAny: Temporary for Alpha v1 heterogeneous tool list
		virtualTools: any[] = [],
	) {
		this.virtualTools = virtualTools;
		this.internalRpcClient = new nmpV1.NeuralMesh(
			`localhost:${rpcPort}`,
			createChannelCredentials(),
		);
	}

	public async dispatch(request: {
		method: string;
		// biome-ignore lint/suspicious/noExplicitAny: MCP params are polymorphic
		params?: any;
		// biome-ignore lint/suspicious/noExplicitAny: MCP id is polymorphic
		id?: any;
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
				return {
					jsonrpc: "2.0",
					id,
					result: { tools: [...localTools, ...this.virtualTools] },
				};
			}
			case "tools/call":
				return this.transcodeMcpToNmp(id, params);
			case "resources/list":
				return {
					jsonrpc: "2.0",
					id,
					result: { resources: this.nmpServer.listResources() },
				};
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

	// biome-ignore lint/suspicious/noExplicitAny: MCP JSON-RPC params/id are polymorphic
	private async transcodeMcpToNmp(id: any, params: any): Promise<any> {
		const toolName = params.name;
		const isLocal = this.nmpServer.listTools().some((t) => t.name === toolName);

		if (!isLocal && this.meshNode) {
			// Stability Improvement: Wait up to 3 seconds for DHT propagation
			// in case the network just joined.
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

		// STATIC FALLBACK FOR INDUSTRIAL DEMO
		// Kademlia DHT takes 1-2 minutes to warm up provider records in a new local mesh.
		// We use this static routing table to bypass the delay strictly for local demos.
		let fallbackPort = 50051;
		if (toolName === "CheckBalance") fallbackPort = 50052;
		if (toolName === "GetStockPrice") fallbackPort = 50053;

		const fallbackClient = new nmpV1.NeuralMesh(
			`127.0.0.1:${fallbackPort}`,
			createChannelCredentials(),
		);
		return this.performTranscoding(id, fallbackClient, toolName, params);
	}

	private async routeToRemoteProvider(
		id: any,
		toolName: string,
		peerId: string,
		params: any,
	): Promise<any> {
		if (!this.meshNode)
			return {
				jsonrpc: "2.0",
				id,
				error: { code: -32603, message: "Mesh Node inactive" },
			};

		const addrs = await this.meshNode.resolvePeer(peerId);
		if (addrs.length === 0)
			return {
				jsonrpc: "2.0",
				id,
				error: { code: -32002, message: "Remote Peer unreachable" },
			};

		let targetAddr: string | null = null;
		for (const addr of addrs) {
			const parts = addr.split("/");
			const ipIdx = parts.indexOf("ip4");
			if (ipIdx !== -1) {
				// HACK for Industrial Demo: Map specific ports for local testing
				let grpcPort = 50051; // The Vault Default
				if (toolName === "CheckBalance") grpcPort = 50052;
				if (toolName === "GetStockPrice") grpcPort = 50053;

				targetAddr = `${parts[ipIdx + 1]}:${grpcPort}`;
				break;
			}
		}

		if (!targetAddr)
			return {
				jsonrpc: "2.0",
				id,
				error: { code: -32002, message: "Invalid Remote Multiaddr" },
			};

		const remoteClient = new nmpV1.NeuralMesh(
			targetAddr,
			createChannelCredentials(),
		);
		return this.performTranscoding(id, remoteClient, toolName, params);
	}

	private async performTranscoding(
		id: any,
		client: any,
		toolName: string,
		params: any,
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
