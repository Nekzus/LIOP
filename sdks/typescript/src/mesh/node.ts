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
import { pipe } from "it-pipe";
import type { Libp2p } from "libp2p";
import { createLibp2p } from "libp2p";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
// import { pEvent } from "p-event"; // Comentado para evitar conflictos ESM en tests

/**
 * Manifest describing a node's capabilities in the LIOP Mesh.
 * Exchanged via the /liop/manifest/1.0.0 protocol stream.
 */
export interface LiopManifest {
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
		text?: string;
	}>;
	serverInfo: { name: string; version: string };
	taxonomy?: {
		domain: string;
		clearanceTier: number;
		executionTypes: string[];
	};
}

export interface MeshNodeConfig {
	listenAddresses?: string[];
	bootstrapNodes?: string[];
	identityPath?: string;
	enableWAN?: boolean;
	dhtStoragePath?: string;
}

const DEFAULT_BOOTSTRAP_NODES = [
	"/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDuVkcruPhcoXdia1vAHm1qrCEYWvmqVkMBjeEbFR",
	"/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
	"/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
	"/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjWZcYW7dwt",
];

const LIOP_MANIFEST_PROTOCOL = "/liop/manifest/1.0.0";
const LIOP_MANIFEST_CAPABILITY = "liop:manifest";

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
	private manifestProvider: (() => LiopManifest) | null = null;

	/** Flag to ensure the manifest protocol is only registered once. */
	private manifestProtocolRegistered = false;

	/** Local Ed25519 Private Key for protocol signatures */
	// biome-ignore lint/suspicious/noExplicitAny: libp2p keys type
	private localPrivateKey: any | null = null;

	constructor(config: MeshNodeConfig = {}) {
		this.config = {
			listenAddresses: config.listenAddresses || [
				"/ip4/0.0.0.0/tcp/0/ws",
				"/ip4/0.0.0.0/tcp/0",
			],
			bootstrapNodes: config.bootstrapNodes || [],
			identityPath: config.identityPath,
			enableWAN: config.enableWAN ?? false,
			dhtStoragePath: config.dhtStoragePath,
		};
	}

	/**
	 * Loads a persistent identity from disk or generates a new Ed25519 keypair.
	 * Uses privateKeyToProtobuf/privateKeyFromProtobuf (libp2p v3.x official API).
	 */
	private async loadOrCreateIdentity() {
		try {
			const { generateKeyPair, privateKeyFromProtobuf } = (await import(
				"@libp2p/crypto/keys"
				// biome-ignore lint/suspicious/noExplicitAny: <libp2p type workaround>
			)) as any;
			// @ts-expect-error: libp2p ESM dynamic import type conflict
			// biome-ignore lint/suspicious/noExplicitAny: <libp2p type workaround>
			const uint8arrays = (await import("uint8arrays")) as any;

			if (this.config.identityPath) {
				const absolutePath = path.resolve(this.config.identityPath);
				try {
					const data = await fs.readFile(absolutePath, "utf-8");
					const json = JSON.parse(data);
					const protobufBytes = uint8arrays.fromString(json.privKey, "base64");
					const privateKey = privateKeyFromProtobuf(protobufBytes);
					console.error(
						`[LIOP-Mesh] Loaded persistent identity from ${absolutePath}`,
					);
					return { privateKey, isNew: false };
				} catch (error: unknown) {
					const e = error as Error & { code?: string };
					if (e.code !== "ENOENT") {
						console.error(`[LIOP-Mesh] Error loading identity: ${e.message}`);
					}
				}
			}

			const privateKey = await generateKeyPair("Ed25519");
			return { privateKey, isNew: true };
		} catch (error) {
			console.error(
				`[LIOP-Mesh] Critical error in identity management: ${error}`,
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
			const { privateKeyToProtobuf } = (await import(
				"@libp2p/crypto/keys"
				// biome-ignore lint/suspicious/noExplicitAny: <libp2p type workaround>
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
			console.error(`[LIOP-Mesh] Identity persisted to ${absolutePath}`);
		} catch (error) {
			console.error(`[LIOP-Mesh] FAILED to persist identity: ${error}`);
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
				`[LIOP-Mesh] Re-announcing ${this.announcedCapabilities.size} capabilities to updated routing table...`,
			);

			for (const hash of this.announcedCapabilities) {
				try {
					const cid = await this.capabilityToCID(hash);
					await this.node.contentRouting.provide(cid);
					console.error(`[LIOP-Mesh] Re-announced: ${hash}`);
				} catch (e) {
					console.error(`[LIOP-Mesh] Re-announce failed for ${hash}: ${e}`);
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
		this.localPrivateKey = privateKey;

		let bootNodes = this.config.bootstrapNodes || [];
		if (bootNodes.length === 0 && this.config.enableWAN) {
			bootNodes = DEFAULT_BOOTSTRAP_NODES;
		}

		const discovery =
			bootNodes.length > 0
				? [
						bootstrap({
							list: bootNodes,
						}),
					]
				: undefined;

		const dhtProtocol = this.config.enableWAN
			? "/ipfs/kad/1.0.0"
			: "/ipfs/lan/kad/1.0.0";

		this.node = await createLibp2p({
			privateKey,
			addresses: {
				listen: this.config.listenAddresses,
			},
			transports: [tcp(), webSockets()],
			connectionEncrypters: [noise()],
			streamMuxers: [yamux()],
			services: {
				identify: identify(),
				ping: ping(),
				dht: kadDHT({
					protocol: dhtProtocol,
					clientMode: false,
					// Allow local/private IPs in the DHT routing table for development/testing
					allowQueryWithZeroPeers: true,
					// By default kadDHT drops local IP addresses. Override the mapper to keep them.
					peerInfoMapper: (peer) => peer,
				}),
			},
			// biome-ignore lint/suspicious/noExplicitAny: libp2p discovery type mismatch
			peerDiscovery: discovery as any,
		});

		// Monitor Connectivity Events
		this.node.addEventListener("peer:discovery", (evt) => {
			console.error(`[LIOP-Mesh] Discovered peer: ${evt.detail.id.toString()}`);
		});

		this.node.addEventListener("peer:connect", (evt) => {
			const peerId = evt.detail;
			console.error(`[LIOP-Mesh] Connected to peer: ${peerId.toString()}`);

			if (!this.node) return;
			// biome-ignore lint/suspicious/noExplicitAny: access internal services
			const dht = (this.node.services as any).dht;
			if (dht?.routingTable) {
				console.error(
					`[LIOP-Mesh] Adding ${peerId.toString()} to DHT Routing Table`,
				);
				dht.routingTable.add(peerId).catch((err: unknown) => {
					console.error(
						`[LIOP-Mesh] Failed to add peer to routing table: ${err instanceof Error ? err.message : String(err)}`,
					);
				});
			}

			// Trigger reactive re-announcement of all capabilities
			// so that ADD_PROVIDER messages reach the new peer
			this.reannounceAll().catch((err: unknown) => {
				console.error(
					`[LIOP-Mesh] Re-announce error: ${err instanceof Error ? err.message : String(err)}`,
				);
			});
		});

		await this.node.start();

		// Load persisted DHT routing table to enable rapid cold-start reconnections
		await this.loadRoutingTable();

		// [LIOP-ALPHA] Protocols and services setup
		this.applyHandlers();

		if (isNew && this.config.identityPath) {
			await this.saveIdentity(privateKey);
		}

		console.error(
			`[LIOP-Mesh] Node started with id: ${this.node.peerId.toString()}`,
		);
		this.node.getMultiaddrs().forEach((addr) => {
			console.error(`[LIOP-Mesh] Listening on: ${addr.toString()}`);
		});

		// Force explicit dialing of Bootstrap nodes to guarantee topology
		if (bootNodes.length > 0) {
			console.error(
				`[LIOP-Mesh] Forcing direct P2P dial to ${bootNodes.length} bootstrap nodes...`,
			);
			for (const addr of bootNodes) {
				try {
					await this.node.dial(multiaddr(addr));
					console.error(`[LIOP-Mesh] Successfully dialed ${addr}`);
				} catch (e) {
					console.error(`[LIOP-Mesh] Failed to explicitly dial ${addr}`, e);
				}
			}
		}
	}

	async stop(): Promise<void> {
		if (this.node) {
			await this.saveRoutingTable();
			await this.node.stop();
			console.error("[LIOP-Mesh] Node stopped");
		}
	}

	private async loadRoutingTable() {
		if (!this.config.dhtStoragePath || !this.node) return;
		try {
			const absolutePath = path.resolve(this.config.dhtStoragePath);
			const data = await fs.readFile(absolutePath, "utf-8");
			const peers = JSON.parse(data);
			const { peerIdFromString } = await import("@libp2p/peer-id");

			let loadedCount = 0;
			for (const peer of peers) {
				if (!peer.id || !peer.addresses) continue;
				try {
					const peerId = peerIdFromString(peer.id);
					const addrs = peer.addresses.map((a: string) => multiaddr(a));
					// @ts-expect-error: libp2p version drift workaround
					await this.node.peerStore.save(peerId, { multiaddrs: addrs });

					// Pre-seed DHT routing table
					// biome-ignore lint/suspicious/noExplicitAny: Internal service access
					const dht = (this.node.services as any).dht;
					if (dht?.routingTable) {
						dht.routingTable.add(peerId).catch(() => {});
					}
					loadedCount++;
				} catch (_e) {}
			}
			console.error(`[LIOP-Mesh] Loaded ${loadedCount} peers from DHT storage`);
		} catch (error: unknown) {
			const e = error as Error & { code?: string };
			if (e.code !== "ENOENT") {
				console.error(`[LIOP-Mesh] Failed to load DHT table: ${e.message}`);
			}
		}
	}

	private async saveRoutingTable() {
		if (!this.config.dhtStoragePath || !this.node) return;
		try {
			const absolutePath = path.resolve(this.config.dhtStoragePath);
			const allPeers = await this.node.peerStore.all();
			const peersToSave = [];
			for (const peer of allPeers) {
				if (peer.addresses.length > 0) {
					peersToSave.push({
						id: peer.id.toString(),
						// biome-ignore lint/suspicious/noExplicitAny: internal libp2p addr
						addresses: peer.addresses.map((a: any) => a.multiaddr.toString()),
					});
				}
			}
			await fs.mkdir(path.dirname(absolutePath), { recursive: true });
			await fs.writeFile(absolutePath, JSON.stringify(peersToSave, null, 2));
			console.error(
				`[LIOP-Mesh] Saved ${peersToSave.length} peers to DHT storage`,
			);
		} catch (error) {
			console.error(`[LIOP-Mesh] FAILED to save DHT routing table: ${error}`);
		}
	}

	/**
	 * Internal logic to register protocol handlers against the libp2p node.
	 * Can be called multiple times; handles idempotent registration.
	 */
	private applyHandlers(): void {
		if (!this.node || this.manifestProtocolRegistered) return;
		if (!this.manifestProvider) return;

		this.manifestProtocolRegistered = true;

		// Announce manifest capability to the Mesh DHT for discovery
		this.announceCapability(LIOP_MANIFEST_CAPABILITY).catch((err) => {
			console.error(`[LIOP-Mesh] Initial manifest announcement failed: ${err}`);
		});

		// libp2p v1.x/v3.x handle API uses { stream, connection }
		this.node.handle(
			LIOP_MANIFEST_PROTOCOL,
			// biome-ignore lint/suspicious/noExplicitAny: libp2p v1.x/v3.x polymorphic handler
			async (arg: any, connection?: any) => {
				const stream = arg.stream || arg; // Robust extraction
				const remotePeer =
					(arg.connection || connection)?.remotePeer?.toString() || "unknown";

				console.error(
					`[LIOP-Mesh] Incoming manifest request from ${remotePeer}.`,
				);

				try {
					const manifest = this.manifestProvider?.();
					if (!manifest || !stream) {
						console.error(
							`[LIOP-Mesh] Skipping manifest request (no provider or stream)`,
						);
						try {
							await (stream.close || stream.abort)?.();
						} catch (_e) {}
						return;
					}

					const manifestStr = JSON.stringify(manifest);
					const payload = new TextEncoder().encode(manifestStr);

					// Write length-prefixed payload (Big Endian 4 bytes)
					const lengthBuf = Buffer.alloc(4);
					lengthBuf.writeUInt32BE(payload.length, 0);
					const fullPacket = Buffer.concat([lengthBuf, Buffer.from(payload)]);

					console.error(
						`[LIOP-Mesh] Serving manifest (${fullPacket.length} bytes) to ${remotePeer} [Tools: ${manifest.tools.map((t) => t.name).join(", ")}]`,
					);

					try {
						// Modern libp2p (v1.x/v3.0+) uses stream.send() for writing
						if (typeof stream.send === "function") {
							if (!stream.send(fullPacket)) {
								// Handle backpressure
								const { pEvent } = await import("p-event");
								try {
									await pEvent(stream, "drain", { timeout: 5000 });
								} catch (e) {
									console.error(
										`[LIOP-Mesh] WARN: Drain timeout or error for ${remotePeer}: ${e instanceof Error ? e.message : String(e)}`,
									);
								}
							}
						} else {
							// Legacy fallback for older libp2p or custom wrappers
							await pipe([fullPacket], stream);
						}
						console.error(
							`[LIOP-Mesh] Manifest sent successfully to ${remotePeer}`,
						);
					} catch (writeErr: unknown) {
						console.error(
							`[LIOP-Mesh] Write error serving manifest to ${remotePeer}: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`,
						);
					} finally {
						// Ensure the stream is closed after serving the manifest
						try {
							if (typeof stream.close === "function") await stream.close();
							else if (typeof stream.abort === "function") await stream.abort();
						} catch (_e) {
							// Ignore close errors
						}
					}
					return;
				} catch (err: unknown) {
					console.error(
						`[LIOP-Mesh] Error serving manifest to ${remotePeer}: ${err instanceof Error ? err.message : String(err)}`,
					);
				}
			},
		);

		console.error(
			`[LIOP-Mesh] Manifest Protocol registered: ${LIOP_MANIFEST_PROTOCOL}`,
		);
	}

	/**
	 * Registers a callback as the manifest provider.
	 * Will be applied immediately if the node is already initialized.
	 */
	registerManifestHandler(provider: () => LiopManifest): void {
		this.manifestProvider = provider;
		if (this.node) {
			this.applyHandlers();
		}
	}

	/**
	 * Queries a remote peer's manifest by opening a /liop/manifest/1.0.0 stream.
	 * Returns null if the peer doesn't support the protocol or is unreachable.
	 */
	async queryManifest(peerIdStr: string): Promise<LiopManifest | null> {
		if (!this.node) throw new Error("Mesh Node is not running");

		// [ALPHA-OPTIMIZATION] Local Loopback Bypass
		// If we are querying our own manifest, return it directly from the provider.
		if (peerIdStr === this.node.peerId.toString()) {
			console.error(
				`[LIOP-Mesh] Loopback: Returning local manifest directly for ${peerIdStr}`,
			);
			return this.manifestProvider?.() || null;
		}

		const MAX_ATTEMPTS = 3;
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				// biome-ignore lint/suspicious/noExplicitAny: targetPeer can be from connections or from string
				let targetPeer: any = null;
				const connections = this.node.getConnections();
				const activeConn = connections.find(
					(c) => c.remotePeer.toString() === peerIdStr,
				);

				if (activeConn) {
					targetPeer = activeConn.remotePeer;
				} else {
					// Fallback to string parsing if not connected yet
					const { peerIdFromString } = await import("@libp2p/peer-id");
					targetPeer = peerIdFromString(peerIdStr);
				}

				// Open a protocol stream using high-level dialProtocol for automated it-stream wrapping
				// biome-ignore lint/suspicious/noExplicitAny: stream type varies by transport
				let stream: any;
				try {
					// biome-ignore lint/suspicious/noExplicitAny: complex libp2p dial types
					const result: any = await this.node.dialProtocol(
						// biome-ignore lint/suspicious/noExplicitAny: PeerId type mismatch
						targetPeer as any,
						LIOP_MANIFEST_PROTOCOL,
					);
					stream = result.stream || result;
				} catch (dialErr) {
					if (attempt === MAX_ATTEMPTS) {
						console.error(
							`[LIOP-Mesh] Dial error for ${peerIdStr} after ${MAX_ATTEMPTS} attempts: ${dialErr}`,
						);
						return null;
					}
					const delay = 500 * 2 ** attempt;
					console.error(
						`[LIOP-Mesh] Dial error for ${peerIdStr} (Attempt ${attempt}). Retrying in ${delay}ms...`,
					);
					await new Promise((r) => setTimeout(r, delay));
					continue;
				}

				// Strategy: Robust Async Reader
				let source =
					stream.source ||
					(typeof stream[Symbol.asyncIterator] === "function" ? stream : null);

				// Final attempt: check if it's already an iterable
				if (!source && typeof stream[Symbol.asyncIterator] === "function") {
					source = stream;
				}

				if (!source) {
					throw new Error("Target stream has no source (AsyncIterable)");
				}

				const chunks: Uint8Array[] = [];

				// Read segments until timeout or closure
				const timeoutPromise = new Promise<never>((_, reject) => {
					setTimeout(
						() => reject(new Error("Manifest read timeout (1.5s)")),
						1500,
					);
				});

				try {
					await Promise.race([
						(async () => {
							for await (const chunk of source) {
								if (!chunk) continue;

								// Telemetry: inspect chunk structure
								const bytes =
									chunk instanceof Uint8Array
										? chunk
										: // biome-ignore lint/suspicious/noExplicitAny: chunks can be Buffer/Uint8Array hybrids
											(chunk as any).subarray
											? // biome-ignore lint/suspicious/noExplicitAny: chunks can be Buffer/Uint8Array hybrids
												(chunk as any).subarray()
											: // biome-ignore lint/suspicious/noExplicitAny: chunks can be Buffer/Uint8Array hybrids
												Buffer.from(chunk as any);

								if (bytes.length > 0) {
									console.error(
										`[LIOP-Mesh] Received chunk (${bytes.length} bytes) from ${peerIdStr}`,
									);
									chunks.push(bytes);
								}
							}
						})(),
						timeoutPromise,
					]);
				} catch (itErr: unknown) {
					if (chunks.length === 0) throw itErr;
					console.error(
						`[LIOP-Mesh] Partial manifest read from ${peerIdStr}: ${itErr instanceof Error ? itErr.message : String(itErr)}`,
					);
				}

				const raw = Buffer.concat(chunks);
				if (raw.length < 4) {
					throw new Error("Received empty/invalid manifest (too short)");
				}

				// Skip length prefix (4 bytes)
				const jsonStr = raw.subarray(4).toString("utf-8");
				const manifest: LiopManifest = JSON.parse(jsonStr);

				console.error(
					`[LIOP-Mesh] Received manifest from ${peerIdStr}: ${manifest.tools.length} tools`,
				);

				return manifest;
			} catch (err: unknown) {
				if (attempt === MAX_ATTEMPTS) {
					console.error(
						`[LIOP-Mesh] Failed to query manifest from ${peerIdStr} after ${MAX_ATTEMPTS} attempts: ${err instanceof Error ? err.message : String(err)}`,
					);
					return null;
				}
				const delay = 500 * 2 ** attempt;
				console.error(
					`[LIOP-Mesh] Query error for ${peerIdStr} (Attempt ${attempt}): ${err instanceof Error ? err.message : String(err)}. Retrying in ${delay}ms...`,
				);
				await new Promise((r) => setTimeout(r, delay));
			}
		}
		return null;
	}

	/**
	 * Discovers all peers in the DHT that have announced "liop:manifest".
	 * Returns their PeerIDs for subsequent manifest queries.
	 */
	async discoverManifestProviders(): Promise<string[]> {
		return this.findProviders(LIOP_MANIFEST_CAPABILITY);
	}

	/**
	 * Announces this node as a manifest provider in the DHT.
	 * Should be called after tools/resources have been registered.
	 */
	async announceManifest(): Promise<void> {
		await this.announceCapability(LIOP_MANIFEST_CAPABILITY);
	}

	/**
	 * Returns the current size of the routing table for diagnostic purposes.
	 */
	getRoutingTableSize(): number {
		if (!this.node) return 0;
		// @ts-expect-error: Accessing internal routing table size for diagnostics
		return this.node.services.dht?.routingTable?.size || 0;
	}

	getPeerId(): string {
		if (!this.node) throw new Error("Mesh Node is not running");
		return this.node.peerId.toString();
	}

	async sign(data: Uint8Array): Promise<Uint8Array> {
		if (!this.localPrivateKey) {
			throw new Error("Local identity not loaded or initialized");
		}
		// libp2p private key implementations typically return a Promise<Uint8Array> or Uint8Array
		return Buffer.from(await this.localPrivateKey.sign(data));
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
				`[LIOP-Mesh] Announcing capability: ${hash} (CID: ${cid.toString()})`,
			);

			// In libp2p v1.x, contentRouting.provide returns Promise<void>
			await this.node.contentRouting.provide(cid);
			console.error(`[LIOP-Mesh] Successfully announced capability: ${hash}`);

			// [DEV-ONLY] Self-verification
			const selfId = this.node.peerId.toString();
			for await (const peer of this.node.contentRouting.findProviders(cid)) {
				if (peer.id.toString() === selfId) {
					console.error(
						`[LIOP-Mesh] Self-verification success: Node is providing ${hash}`,
					);
					break;
				}
			}
		} catch (error) {
			console.error(`[LIOP-Mesh] Failed to announce capability: ${error}`);
		}
	}

	async findProviders(hash: string): Promise<string[]> {
		if (!this.node) throw new Error("Mesh Node is not running");
		const providers: string[] = [];
		try {
			const cid = await this.capabilityToCID(hash);
			console.error(
				`[LIOP-Mesh] Querying DHT for ${hash} (CID: ${cid.toString()})...`,
			);

			// In libp2p v1.x, contentRouting.findProviders returns AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>
			let foundAny = false;
			for await (const peer of this.node.contentRouting.findProviders(cid)) {
				foundAny = true;
				const peerId = peer.id.toString();
				console.error(`[LIOP-Mesh] Found provider: ${peerId}`);
				if (!providers.includes(peerId)) {
					providers.push(peerId);
				}
			}
			if (!foundAny) {
				const services = this.node.services as {
					dht?: { routingTable?: { size: number } };
				};
				const dhtSize = services.dht?.routingTable?.size || 0;
				console.error(
					`[LIOP-Mesh] DHT search for ${hash} returned zero results (routing table size: ${dhtSize})`,
				);
			}

			// [DEVELOPER-EXPERIENCE] Local Loopback Discovery
			// If we are providing this capability, ensure we find ourselves even if DHT findProviders doesn't return us.
			if (this.announcedCapabilities.has(hash)) {
				const selfId = this.node.peerId.toString();
				if (!providers.includes(selfId)) {
					console.error(
						`[LIOP-Mesh] Including local node (${selfId}) in results for ${hash}`,
					);
					providers.push(selfId);
				}
			}
		} catch (error: unknown) {
			console.error(
				`[LIOP-Mesh] Error finding providers for ${hash}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		console.error(
			`[LIOP-Mesh] DHT search for ${hash} finished. Found ${providers.length} providers.`,
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
						`[LIOP-Mesh] Resolved peer ${peerIdStr} via active connection: ${remoteAddr}`,
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
						`[LIOP-Mesh] Resolved peer ${peerIdStr} via peerStore: ${addrs[0]}`,
					);
					return addrs;
				}
			}

			console.error(
				`[LIOP-Mesh] Peer ${peerIdStr} not found in connections or peerStore`,
			);
		} catch (error) {
			console.error(
				`[LIOP-Mesh] Failed to resolve peer ${peerIdStr}: ${error}`,
			);
		}
		return [];
	}
}
