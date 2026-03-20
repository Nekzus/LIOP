import { yamux } from "@chainsafe/libp2p-yamux";
import { identify } from "@libp2p/identify";
import { kadDHT } from "@libp2p/kad-dht";
import { mplex } from "@libp2p/mplex";
import { noise } from "@chainsafe/libp2p-noise";
import { ping } from "@libp2p/ping";
import type { Libp2p } from "libp2p";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createLibp2p } from "libp2p";
import { webSockets } from "@libp2p/websockets";
import { tcp } from "@libp2p/tcp";
import { multiaddr } from "@multiformats/multiaddr";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import { bootstrap } from "@libp2p/bootstrap";

export interface MeshNodeConfig {
	listenAddresses?: string[];
	bootstrapNodes?: string[];
	identityPath?: string;
}

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
			const { generateKeyPair, privateKeyFromProtobuf } = await import("@libp2p/crypto/keys") as any;
			// biome-ignore lint/suspicious/noExplicitAny: <libp2p type workaround>
			// @ts-ignore: libp2p ESM dynamic import type conflict
			const uint8arrays = await import("uint8arrays") as any;

			if (this.config.identityPath) {
				const absolutePath = path.resolve(this.config.identityPath);
				try {
					const data = await fs.readFile(absolutePath, "utf-8");
					const json = JSON.parse(data);
					const protobufBytes = uint8arrays.fromString(json.privKey, "base64");
					const privateKey = privateKeyFromProtobuf(protobufBytes);
					console.error(`[NMP-Mesh] Loaded persistent identity from ${absolutePath}`);
					return { privateKey, isNew: false };
				} catch (e: any) {
					if (e.code !== "ENOENT") {
						console.error(`[NMP-Mesh] Error loading identity: ${e.message}`);
					}
				}
			}

			const privateKey = await generateKeyPair("Ed25519");
			return { privateKey, isNew: true };
		} catch (error) {
			console.error(`[NMP-Mesh] Critical error in identity management: ${error}`);
			return undefined;
		}
	}

	/**
	 * Persists the private key to disk using protobuf serialization (libp2p v3.x).
	 */
	private async saveIdentity(privateKey: any) {
		if (!this.config.identityPath || !this.node) return;

		try {
			const absolutePath = path.resolve(this.config.identityPath);
			// biome-ignore lint/suspicious/noExplicitAny: <libp2p type workaround>
			const { privateKeyToProtobuf } = await import("@libp2p/crypto/keys") as any;
			// @ts-ignore: libp2p ESM dynamic import type conflict
			const uint8arrays = await import("uint8arrays");

			const protobufBytes = privateKeyToProtobuf(privateKey);
			const privKeyEncoded = (uint8arrays.toString || uint8arrays.default.toString)(protobufBytes, "base64");

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
		if (this.reannouncing || !this.node || this.announcedCapabilities.size === 0) return;

		this.reannouncing = true;
		try {
			// Wait for the DHT protocol handshake to settle
			await new Promise((resolve) => setTimeout(resolve, 500));

			if (!this.node) return;

			console.error(`[NMP-Mesh] 🔄 Re-announcing ${this.announcedCapabilities.size} capabilities to updated routing table...`);

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
			streamMuxers: [yamux(), mplex()],
			services: {
				identify: identify(),
				dht: kadDHT({
					protocol: "/ipfs/kad/1.0.0",
					clientMode: false,
					// Allow local/private IPs in the DHT routing table for development/testing
					allowQueryWithZeroPeers: true,
				}),
				// @ts-ignore: Conflict between @libp2p/peer-collections versions
				ping: ping(),
			},
			// @ts-ignore: Conflict between @libp2p/interface versions for bootstrap components
			peerDiscovery:
				this.config.bootstrapNodes && this.config.bootstrapNodes.length > 0
					? [
							bootstrap({
								list: this.config.bootstrapNodes,
							}),
					  ]
					: undefined,
		});

		// Monitor Connectivity Events
		this.node.addEventListener("peer:discovery", (evt) => {
			console.error(`[NMP-Mesh] 🔎 Discovered peer: ${evt.detail.id.toString()}`);
		});

		this.node.addEventListener("peer:connect", (evt) => {
			const peerId = evt.detail;
			console.error(`[NMP-Mesh] 🤝 Connected to peer: ${peerId.toString()}`);
			
			if (!this.node) return;
			const dht = (this.node.services as any).dht;
			if (dht && dht.routingTable) {
				console.error(`[NMP-Mesh] 📍 Adding ${peerId.toString()} to DHT Routing Table`);
				dht.routingTable.add(peerId).catch((err: any) => {
					console.error(`[NMP-Mesh] Failed to add peer to routing table: ${err}`);
				});
			}

			// Trigger reactive re-announcement of all capabilities
			// so that ADD_PROVIDER messages reach the new peer
			this.reannounceAll().catch((err: any) => {
				console.error(`[NMP-Mesh] Re-announce error: ${err}`);
			});
		});

		await this.node.start();

		if (isNew && this.config.identityPath) {
			await this.saveIdentity(privateKey);
		}

		console.error(`[NMP-Mesh] Node started with id: ${this.node.peerId.toString()}`);
		this.node.getMultiaddrs().forEach((addr) => {
			console.error(`[NMP-Mesh] Listening on: ${addr.toString()}`);
		});

		// Force explicit dialing of Bootstrap nodes to guarantee topology
		if (this.config.bootstrapNodes && this.config.bootstrapNodes.length > 0) {
			console.error(`[NMP-Mesh] Forcing direct P2P dial to ${this.config.bootstrapNodes.length} bootstrap nodes...`);
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
			console.error(`[NMP-Mesh] Announcing capability: ${hash} (CID: ${cid.toString()})`);

			// In libp2p v1.x, contentRouting.provide returns Promise<void>
			await this.node.contentRouting.provide(cid);
			console.error(`[NMP-Mesh] Successfully announced capability: ${hash}`);

			// [DEV-ONLY] Self-verification
			const selfId = this.node.peerId.toString();
			for await (const peer of this.node.contentRouting.findProviders(cid)) {
				if (peer.id.toString() === selfId) {
					console.error(`[NMP-Mesh] ✨ Self-verification success: Node is providing ${hash}`);
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
			console.error(`[NMP-Mesh] 🔍 Querying Mesh DHT for Provider: ${hash}...`);

			// In libp2p v1.x, contentRouting.findProviders returns AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>
			for await (const peer of this.node.contentRouting.findProviders(cid)) {
				const peerId = peer.id.toString();
				console.error(`[NMP-Mesh] ✨ Found provider: ${peerId}`);
				if (!providers.includes(peerId)) {
					providers.push(peerId);
				}
			}
		} catch (error: any) {
			console.error(`[NMP-Mesh] 🚨 Error finding providers for ${hash}: ${error.message}`);
		}

		console.error(`[NMP-Mesh] 🏁 DHT search for ${hash} finished. Found ${providers.length} providers.`);
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
					console.error(`[NMP-Mesh] Resolved peer ${peerIdStr} via active connection: ${remoteAddr}`);
					return [remoteAddr];
				}
			}

			// Strategy 2: Try peerStore (iterate all peers to avoid toMultihash conflict)
			const allPeers = await this.node.peerStore.all();
			for (const peer of allPeers) {
				if (peer.id.toString() === peerIdStr && peer.addresses.length > 0) {
					const addrs = peer.addresses.map((a: any) => a.multiaddr.toString());
					console.error(`[NMP-Mesh] Resolved peer ${peerIdStr} via peerStore: ${addrs[0]}`);
					return addrs;
				}
			}

			console.error(`[NMP-Mesh] Peer ${peerIdStr} not found in connections or peerStore`);
		} catch (error) {
			console.error(`[NMP-Mesh] Failed to resolve peer ${peerIdStr}: ${error}`);
		}
		return [];
	}
}
