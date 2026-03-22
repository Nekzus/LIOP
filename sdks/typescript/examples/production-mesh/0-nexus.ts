import { MeshNode } from "@nekzus/neural-mesh";

/**
 * THE NEXUS (Bootstrap Node)
 *
 * This node acts as the decentralized rendezvous point for the Alpha mesh.
 * It provides no data, only facilitates DHT (Kademlia) discovery.
 */
async function startNexus() {
	console.log("🌌 [Nexus] Initiating Ancestral Rendezvous Point...");

	const nexus = new MeshNode({
		identityPath: "./nexus-identity.json",
		listenAddresses: ["/ip4/0.0.0.0/tcp/4001"],
	});

	await nexus.start();

	console.log("✅ [Nexus] Mesh active and listening on port 4001.");
	const multiaddr = `/ip4/127.0.0.1/tcp/4001/p2p/${nexus.getPeerId()}`;
	console.log(`🔗 [Nexus] PeerID: ${nexus.getPeerId()}`);
	console.log(`🔗 [Nexus] Multiaddr: ${multiaddr}`);

	// Write the Multiaddr to a local file for Auto-Discovery
	const fs = await import("node:fs/promises");
	await fs.writeFile("nexus.multiaddr", multiaddr, "utf-8");
	console.log("📄 [Nexus] Multiaddr saved to 'nexus.multiaddr' for the Agent.");
}

startNexus().catch(console.error);
