import * as fs from "node:fs/promises";
import * as path from "node:path";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { bootstrap } from "@libp2p/bootstrap";
import { identify } from "@libp2p/identify";
import { kadDHT } from "@libp2p/kad-dht";
import { ping } from "@libp2p/ping";
import { tcp } from "@libp2p/tcp";
import { webSockets } from "@libp2p/websockets";
import { multiaddr } from "@multiformats/multiaddr";
import type { Libp2p } from "libp2p";
import { createLibp2p } from "libp2p";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";

/**
 * Manifest describing a node's capabilities in the NMP Mesh.
 * Exchanged via the /nmp/manifest/1.0.0 protocol stream.
 */
export interface NmpManifest {
	peerId: string;
	grpcPort: number;
	tools: Array<{
		name: string;
		description?: string;
		inputSchema?: Record<string, unknown>;
	}>;
	resources: Array<{
		name: string;
		uri: string;
		description?: string;
		mimeType?: string;
	}>;
	serverInfo: { name: string; version: string };
}

export interface MeshNodeConfig {
	listenAddresses?: string[];
	bootstrapNodes?: string[];
	identityPath?: string;
}

const NMP_MANIFEST_PROTOCOL = "/nmp/manifest/1.0.0";
const NMP_MANIFEST_CAPABILITY = "nmp:manifest";

/**
 * P2P Mesh Node backed by libp2p + Kademlia DHT.
 *
 * Provides capability advertisement via CID-based content routing
 * and decentralized peer discovery.
 */
export class MeshNode {
	private node: Libp2p | null = null;
	private config: MeshNodeConfig;

	/**
	 * Buffer of capability hashes that have been announced.
	 * Used to re-announce capabilities when new peers connect
	 * (critical for small / isolated clusters where the initial
	 * provide() finds zero peers in the routing table).
	 */
	private announcedCapabilities: Set<string> = new Set();

	/** Guards against concurrent re-announcement storms. */
	private reannouncing = false;

	/** Callback that returns the local node's manifest on request. */
	private manifestProvider: (() => NmpManifest) | null = null;

	constructor(config: MeshNodeConfig = {}) {
		this.config = {
			listenAddresses: config.listenAddresses || [
				"/ip4/0.0.0.0/tcp/0/ws",
				"/ip4/0.0.0.0/tcp/0",
			],
			bootstrapNodes: config.bootstrapNodes || [],
			identityPath: config.identityPath,
		};
	}

	/**
	 * Loads a persistent identity from disk or generates a new Ed25519 keypair.
	 * Uses privateKeyToProtobuf/privateKeyFromProtobuf (libp2p v3.x official API).
	 */
	private async loadOrCreateIdentity() {
		try {
			// biome-ignore lint/suspicious/noExplicitAny: <libp2p type workaround>
			const { generateKeyPair, privateKeyFromProtobuf } = (await import(
				"@libp2p/crypto/keys"
			)) as any;
			// biome-ignore lint/suspicious/noExplicitAny: <libp2p type workaround>
			// @ts-expect-error: libp2p ESM dynamic import type conflict
			const uint8arrays = (await import("uint8arrays")) as any;

			if (this.config.identityPath) {
				const absolutePath = path.resolve(this.config.identityPath);
				try {
					const data = await fs.readFile(absolutePath, "utf-8");
					const json = JSON.parse(data);
					const protobufBytes = uint8arrays.fromString(json.privKey, "base64");
					const privateKey = privateKeyFromProtobuf(protobufBytes);
					console.error(
						`[NMP-Mesh] Loaded persistent identity from ${absolutePath}`,
					);
					return { privateKey, isNew: false };
				} catch (error: unknown) {
					const e = error as Error & { code?: string };
					if (e.code !== "ENOENT") {
						console.error(`[NMP-Mesh] Error loading identity: ${e.message}`);
					}
				}
			}

			const privateKey = await generateKeyPair("Ed25519");
			return { privateKey, isNew: true };
		} catch (error) {
			console.error(
				`[NMP-Mesh] Critical error in identity management: ${error}`,
			);
			return undefined;
		}
	}

	/**
	 * Persists the private key to disk using protobuf serialization (libp2p v3.x).
	 */
	// biome-ignore lint/suspicious/noExplicitAny: Libp2p private key type is complex for Alpha
	private async saveIdentity(privateKey: any) {
		if (!this.config.identityPath || !this.node) return;

		try {
			const absolutePath = path.resolve(this.config.identityPath);
			// biome-ignore lint/suspicious/noExplicitAny: <libp2p type workaround>
			const { privateKeyToProtobuf } = (await import(
				"@libp2p/crypto/keys"
			)) as any;
			// @ts-expect-error: libp2p ESM dynamic import type conflict
			const uint8arrays = await import("uint8arrays");

			const protobufBytes = privateKeyToProtobuf(privateKey);
			const privKeyEncoded = (
				uint8arrays.toString || uint8arrays.default.toString
			)(protobufBytes, "base64");

			const json = {
				id: this.node.peerId.toString(),
				privKey: privKeyEncoded,
			};

			await fs.mkdir(path.dirname(absolutePath), { recursive: true });
			await fs.writeFile(absolutePath, JSON.stringify(json, null, 2));
			console.error(`[NMP-Mesh] Identity persisted to ${absolutePath}`);
		} catch (error) {
			console.error(`[NMP-Mesh] FAILED to persist identity: ${error}`);
		}
	}

	/**
	 * Creates a CID v1 (raw codec 0x55) from a SHA-256 hash of the capability string.
	 * Required by @libp2p/kad-dht v16+ for provide/findProviders.
	 */
	private async capabilityToCID(capability: string): Promise<CID> {
		const hash = await sha256.digest(new TextEncoder().encode(capability));
		return CID.create(1, 0x55, hash);
	}

	/**
	 * Re-announces all buffered capabilities after a new peer connects.
	 * Uses a small delay to allow the DHT protocol handshake to complete.
	 */
	private async reannounceAll(): Promise<void> {
		if (
			this.reannouncing ||
			!this.node ||
			this.announcedCapabilities.size === 0
		)
			return;

		this.reannouncing = true;
		try {
			// Wait for the DHT protocol handshake to settle
			await new Promise((resolve) => setTimeout(resolve, 500));

			if (!this.node) return;

			console.error(
				`[NMP-Mesh] 🔄 Re-announcing ${this.announcedCapabilities.size} capabilities to updated routing table...`,
			);

			for (const hash of this.announcedCapabilities) {
				try {
					const cid = await this.capabilityToCID(hash);
					await this.node.contentRouting.provide(cid);
					console.error(`[NMP-Mesh] ✅ Re-announced: ${hash}`);
				} catch (e) {
					console.error(`[NMP-Mesh] ⚠️ Re-announce failed for ${hash}: ${e}`);
				}
			}
		} finally {
			this.reannouncing = false;
		}
	}

	async start(): Promise<void> {
		const result = await this.loadOrCreateIdentity();
		if (!result) throw new Error("Could not initialize P2P Identity");

		const { privateKey, isNew } = result;

		this.node = await createLibp2p({
			privateKey,
			addresses: {
				listen: this.config.listenAddresses,
			},
			transports: [webSockets(), tcp()],
			connectionEncrypters: [noise()],
			streamMuxers: [yamux()],
			services: {
				identify: identify(),
				dht: kadDHT({
					protocol: "/ipfs/lan/kad/1.0.0", // SHIFT TO LAN PROTOCOL!
					clientMode: false,
					// Allow local/private IPs in the DHT routing table for development/testing
					allowQueryWithZeroPeers: true,
					// By default kadDHT drops local IP addresses. Override the mapper to keep them.
					peerInfoMapper: (peer) => peer,
					logPrefix: "libp2p:dht-lan",
				}),
				ping: ping(),
			},
			// biome-ignore lint/suspicious/noExplicitAny: libp2p interface version conflict (PeerId/PeerStore mismatch)
			peerDiscovery: (this.config.bootstrapNodes &&
			this.config.bootstrapNodes.length > 0
				? [
						bootstrap({
							list: this.config.bootstrapNodes,
						}),
					]
				: undefined) as any,
		});

		// Monitor Connectivity Events
		this.node.addEventListener("peer:discovery", (evt) => {
			console.error(
				`[NMP-Mesh] 🔎 Discovered peer: ${evt.detail.id.toString()}`,
			);
		});

		this.node.addEventListener("peer:connect", (evt) => {
			const peerId = evt.detail;
			console.error(`[NMP-Mesh] 🤝 Connected to peer: ${peerId.toString()}`);

			if (!this.node) return;
			const dht = (this.node.services as any).dht;
			if (dht?.routingTable) {
				console.error(
					`[NMP-Mesh] 📍 Adding ${peerId.toString()} to DHT Routing Table`,
				);
				dht.routingTable.add(peerId).catch((err: unknown) => {
					console.error(
						`[NMP-Mesh] Failed to add peer to routing table: ${err instanceof Error ? err.message : String(err)}`,
					);
				});
			}

			// Trigger reactive re-announcement of all capabilities
			// so that ADD_PROVIDER messages reach the new peer
			this.reannounceAll().catch((err: unknown) => {
				console.error(
					`[NMP-Mesh] Re-announce error: ${err instanceof Error ? err.message : String(err)}`,
				);
			});
		});

		await this.node.start();

		if (isNew && this.config.identityPath) {
			await this.saveIdentity(privateKey);
		}

		console.error(
			`[NMP-Mesh] Node started with id: ${this.node.peerId.toString()}`,
		);
		this.node.getMultiaddrs().forEach((addr) => {
			console.error(`[NMP-Mesh] Listening on: ${addr.toString()}`);
		});

		// Force explicit dialing of Bootstrap nodes to guarantee topology
		if (this.config.bootstrapNodes && this.config.bootstrapNodes.length > 0) {
			console.error(
				`[NMP-Mesh] Forcing direct P2P dial to ${this.config.bootstrapNodes.length} bootstrap nodes...`,
			);
			for (const addr of this.config.bootstrapNodes) {
				try {
					await this.node.dial(multiaddr(addr));
					console.error(`[NMP-Mesh] Successfully dialed ${addr}`);
				} catch (e) {
					console.error(`[NMP-Mesh] Failed to explicitly dial ${addr}`, e);
				}
			}
		}
	}

	async stop(): Promise<void> {
		if (this.node) {
			await this.node.stop();
			console.error("[NMP-Mesh] Node stopped");
		}
	}

	/**
	 * Registers a callback that provides this node's manifest.
	 * When a remote peer opens a /nmp/manifest/1.0.0 stream,
	 * the callback is invoked and the result is sent as JSON.
	 */
	registerManifestHandler(provider: () => NmpManifest): void {
		this.manifestProvider = provider;
		if (!this.node) return;

		// libp2p v1.x/v3.x handle API uses { stream, connection }
		this.node.handle(NMP_MANIFEST_PROTOCOL, async (arg: any, connection?: any) => {
			const stream = arg.stream || arg; // Robust extraction
			try {
				const manifest = this.manifestProvider?.();
				if (!manifest || !stream) {
					stream?.close?.();
					return;
				}

				const manifestStr = JSON.stringify(manifest);
				const payload = new TextEncoder().encode(manifestStr);

				// Write length-prefixed payload (4 bytes for length)
				const lengthBuf = new Uint8Array(4);
				new DataView(lengthBuf.buffer).setUint32(0, payload.length);
				const buf = Buffer.concat([lengthBuf, payload]);

				// Strategy 1: Standard libp2p AsyncIterable sink
				if (typeof stream.sink === "function") {
					await stream.sink(
						(async function* () {
							yield buf;
						})(),
					);
				} 
				// Strategy 2: Yamux native sendData (Found in user telemetry)
				else if (typeof stream.sendData === "function") {
					console.error("[NMP-Mesh] 🛠️ Serving manifest via native Yamux sendData");
					// Libp2p internal muxers often expect Uint8ArrayList and will loop until length is 0.
					// We wrap our buffer in a pseudo-list that implements sublist and consume correctly.
					const pseudoList = {
						_buf: buf,
						_pos: 0,
						get length() { return Math.max(0, this._buf.length - this._pos); },
						sublist(start: number, end?: number) {
							const absoluteStart = this._pos + start;
							const absoluteEnd = end !== undefined ? (this._pos + end) : this._buf.length;
							return this._buf.subarray(absoluteStart, absoluteEnd);
						},
						consume(n: number) {
							this._pos += n;
						},
						// Add common aliases just in case
						subarray(start: number, end?: number) { return this.sublist(start, end); }
					};
					
					stream.sendData(pseudoList);
					// Gracefully close the write side as required by Yamux
					if (typeof stream.sendCloseWrite === "function") {
						stream.sendCloseWrite();
					}
				}
				// Strategy 3: it-pipe style function (stream is the sink)
				else if (typeof stream === "function") {
					await stream((async function* () {
						yield buf;
					})());
				}
				// Strategy 4: Fallback write/push
				else if (typeof stream.write === "function") {
					await stream.write(buf);
					await stream.closeWrite?.();
				} else {
					throw new Error(`Unsupported stream. Keys: ${Object.keys(stream)}`);
				}

				// CRITICAL: Force close the stream after sending the manifest to avoid manifest-reading hangs
				try {
					await (stream.close || stream.closeWrite)?.();
				} catch (closeErr) {
					// Ignore close errors
				}

				console.error(
					`[NMP-Mesh] 📋 Served manifest (${manifest.tools.length} tools, port ${manifest.grpcPort})`,
				);
			} catch (err) {
				console.error(`[NMP-Mesh] 🚨 Error serving manifest: ${err}`);
			}
		});

		console.error(
			`[NMP-Mesh] 📡 Manifest Protocol registered: ${NMP_MANIFEST_PROTOCOL}`,
		);
	}

	/**
	 * Queries a remote peer's manifest by opening a /nmp/manifest/1.0.0 stream.
	 * Returns null if the peer doesn't support the protocol or is unreachable.
	 */
	async queryManifest(peerIdStr: string): Promise<NmpManifest | null> {
		if (!this.node) throw new Error("Mesh Node is not running");

		try {
			// Resolve the target from active connections to ensure PeerId version compatibility
			let targetPeer: any = null;
			const connections = this.node.getConnections();
			const activeConn = connections.find(c => c.remotePeer.toString() === peerIdStr);
			
			if (activeConn) {
				console.error(`[NMP-Mesh] ☎️ Using active connection's PeerId for ${peerIdStr}`);
				targetPeer = activeConn.remotePeer;
			} else {
				// Fallback to string parsing if not connected yet
				const { peerIdFromString } = await import("@libp2p/peer-id");
				targetPeer = peerIdFromString(peerIdStr);
			}

			// Open a protocol stream using high-level dialProtocol for automated it-stream wrapping
			// biome-ignore lint/suspicious/noExplicitAny: libp2p version compatibility
			let stream: any;
			try {
				// We dial using the native PeerId object found or parsed
				const result: any = await this.node.dialProtocol(targetPeer as any, NMP_MANIFEST_PROTOCOL);
				stream = result.stream || result;
			} catch (dialErr) {
				console.error(`[NMP-Mesh] 🚨 Dial error for ${peerIdStr}: ${dialErr}`);
				return null;
			}

			// Strategy: Robust Async Reader
			let source = stream.source || (typeof stream[Symbol.asyncIterator] === "function" ? stream : null);
			if (!source) {
				// Fallback to the manual robust event reader if dialProtocol failed to wrap (unlikely but safe)
				if (typeof stream.on === "function" || typeof stream.resume === "function") {
					console.error("[NMP-Mesh] 🛠️ Reading manifest via native fallback (Stream Wrapper missing)");
					source = (async function* () {
						const queue: any[] = [];
						let resolve: (() => void) | null = null;
						let finished = false;
						let error: Error | null = null;

						const dataHandler = (chunk: any) => {
							queue.push(chunk);
							if (resolve) {
								const r = resolve;
								resolve = null;
								r();
							}
						};
						
						if (typeof stream.on === "function") {
							stream.on("data", dataHandler);
							stream.on("end", () => {
								finished = true;
								if (resolve) {
									const r = resolve;
									resolve = null;
									r();
								}
							});
							stream.on("error", (e: Error) => {
								error = e;
								if (resolve) {
									const r = resolve;
									resolve = null;
									r();
								}
							});
						}

						// Ensure stream is flowing
						if (typeof stream.resume === "function") stream.resume();

						while (!finished || queue.length > 0) {
							if (error) throw error;
							if (queue.length > 0) {
								yield queue.shift();
							} else {
								await new Promise<void>((res) => {
									resolve = res;
								});
							}
							// Exit loop if we haven't received anything and stream has no event emitter
							if (!stream.on && queue.length === 0) break;
						}
					})();
				}
			}

			if (!source) {
				// Final attempt: check if it's already an iterable
				if (typeof stream[Symbol.asyncIterator] === "function") {
					source = stream;
				} else {
					console.error(`[NMP-Mesh] 🚨 Stream Debug: keys=[${Object.keys(stream)}] typeof source=${typeof stream.source}`);
					throw new Error("Target stream has no source (AsyncIterable) or event emitter (Readable)");
				}
			}

			// Read the response with a 5-second timeout to prevent hangs
			const chunks: Uint8Array[] = [];
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error("Manifest read timeout (5s)")), 5000);
			});

			try {
				await Promise.race([
					(async () => {
						for await (const chunk of source) {
							// libp2p streams yield Uint8ArrayList or Uint8Array
							const data =
								chunk instanceof Uint8Array ? chunk : chunk.subarray();
							chunks.push(data);
						}
					})(),
					timeoutPromise,
				]);
			} catch (itErr: any) {
				console.error(`[NMP-Mesh] ⚠️ Error or timeout while reading manifest from ${peerIdStr}: ${itErr.message}`);
				// Cleanup stream if possible
				try { stream.abort?.(); } catch(e) {}
				return null;
			}

			const raw = Buffer.concat(chunks);
			if (raw.length < 4) {
				console.error(`[NMP-Mesh] ⚠️ Received empty/invalid manifest from ${peerIdStr}`);
				return null;
			}

			// Skip length prefix (4 bytes)
			const jsonStr = raw.subarray(4).toString("utf-8");
			const manifest: NmpManifest = JSON.parse(jsonStr);

			console.error(
				`[NMP-Mesh] 📋 Received manifest from ${peerIdStr}: ${manifest.tools.length} tools, gRPC port ${manifest.grpcPort}`,
			);

			return manifest;
		} catch (err) {
			console.error(
				`[NMP-Mesh] Failed to query manifest from ${peerIdStr}: ${err}`,
			);
			return null;
		}
	}

	/**
	 * Discovers all peers in the DHT that have announced "nmp:manifest".
	 * Returns their PeerIDs for subsequent manifest queries.
	 */
	async discoverManifestProviders(): Promise<string[]> {
		return this.findProviders(NMP_MANIFEST_CAPABILITY);
	}

	/**
	 * Announces this node as a manifest provider in the DHT.
	 * Should be called after tools/resources have been registered.
	 */
	async announceManifest(): Promise<void> {
		await this.announceCapability(NMP_MANIFEST_CAPABILITY);
	}

	getPeerId(): string {
		if (!this.node) throw new Error("Mesh Node is not running");
		return this.node.peerId.toString();
	}

	getMultiaddrs(): string[] {
		if (!this.node) throw new Error("Mesh Node is not running");
		return this.node.getMultiaddrs().map((a) => a.toString());
	}

	async announceCapability(hash: string): Promise<void> {
		if (!this.node) throw new Error("Mesh Node is not running");

		// Buffer the capability for reactive re-announcement
		this.announcedCapabilities.add(hash);

		try {
			const cid = await this.capabilityToCID(hash);
			console.error(
				`[NMP-Mesh] Announcing capability: ${hash} (CID: ${cid.toString()})`,
			);

			// In libp2p v1.x, contentRouting.provide returns Promise<void>
			await this.node.contentRouting.provide(cid);
			console.error(`[NMP-Mesh] Successfully announced capability: ${hash}`);

			// [DEV-ONLY] Self-verification
			const selfId = this.node.peerId.toString();
			for await (const peer of this.node.contentRouting.findProviders(cid)) {
				if (peer.id.toString() === selfId) {
					console.error(
						`[NMP-Mesh] ✨ Self-verification success: Node is providing ${hash}`,
					);
					break;
				}
			}
		} catch (error) {
			console.error(`[NMP-Mesh] Failed to announce capability: ${error}`);
		}
	}

	async findProviders(hash: string): Promise<string[]> {
		if (!this.node) throw new Error("Mesh Node is not running");
		const providers: string[] = [];
		try {
			const cid = await this.capabilityToCID(hash);
			console.error(`[NMP-Mesh] 🔍 Querying DHT for ${hash} (CID: ${cid.toString()})...`);

			// In libp2p v1.x, contentRouting.findProviders returns AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>
			let foundAny = false;
			for await (const peer of this.node.contentRouting.findProviders(cid)) {
				foundAny = true;
				const peerId = peer.id.toString();
				console.error(`[NMP-Mesh] ✨ Found provider: ${peerId}`);
				if (!providers.includes(peerId)) {
					providers.push(peerId);
				}
			}
			if (!foundAny) {
				console.error(`[NMP-Mesh] 💨 DHT search for ${hash} returned zero results (routing table size: ${(this.node.services as any).dht?.routingTable?.size || 0})`);
			}
		} catch (error: unknown) {
			console.error(
				`[NMP-Mesh] 🚨 Error finding providers for ${hash}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		console.error(
			`[NMP-Mesh] 🏁 DHT search for ${hash} finished. Found ${providers.length} providers.`,
		);
		return providers;
	}

	async resolvePeer(peerIdStr: string): Promise<string[]> {
		if (!this.node) throw new Error("Mesh Node is not running");
		try {
			// Strategy 1: Check active connections for the peer's multiaddrs
			const connections = this.node.getConnections();
			for (const conn of connections) {
				if (conn.remotePeer.toString() === peerIdStr) {
					const remoteAddr = conn.remoteAddr.toString();
					console.error(
						`[NMP-Mesh] Resolved peer ${peerIdStr} via active connection: ${remoteAddr}`,
					);
					return [remoteAddr];
				}
			}

			// Strategy 2: Try peerStore (iterate all peers to avoid toMultihash conflict)
			const allPeers = await this.node.peerStore.all();
			for (const peer of allPeers) {
				if (peer.id.toString() === peerIdStr && peer.addresses.length > 0) {
					// biome-ignore lint/suspicious/noExplicitAny: Internal libp2p addr type
					const addrs = peer.addresses.map((a: any) => a.multiaddr.toString());
					console.error(
						`[NMP-Mesh] Resolved peer ${peerIdStr} via peerStore: ${addrs[0]}`,
					);
					return addrs;
				}
			}

			console.error(
				`[NMP-Mesh] Peer ${peerIdStr} not found in connections or peerStore`,
			);
		} catch (error) {
			console.error(`[NMP-Mesh] Failed to resolve peer ${peerIdStr}: ${error}`);
		}
		return [];
	}
}
