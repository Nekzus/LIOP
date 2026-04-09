import * as fs from "node:fs/promises";
import { LiopServer } from "../../src/server/index.js";

async function main() {
	console.log("==================================================");
	console.log("🌌  THE NEXUS: LIOP Bootstrap Node");
	console.log("==================================================");

	const server = new LiopServer({
		name: "the-nexus",
		version: "1.0.0",
		capabilities: {},
	});

	await server.connectToMesh({
		port: 50050, // Nexus gRPC port
		meshConfig: {
			listenAddresses: ["/ip4/0.0.0.0/tcp/4000", "/ip4/0.0.0.0/tcp/4001/ws"],
			identityPath: "nexus-identity.json",
		},
	});

	const meshNode = server.getMeshNode();
	if (!meshNode) throw new Error("Mesh node failed to initialize");

	// For cross-environment safety (WSL -> Windows Claude Desktop), ALWAYS force 127.0.0.1
	const peerId = meshNode.getPeerId();
	const p2pAddr = `/ip4/127.0.0.1/tcp/4001/ws/p2p/${peerId}`;
	await fs.writeFile("nexus.multiaddr", p2pAddr);

	console.log(`[The Nexus] 🌐 Bootstrap Node Active`);
	console.log(`[The Nexus] 🆔 PeerID: ${peerId}`);
	console.log(`[The Nexus] ⚡ Address written to nexus.multiaddr: ${p2pAddr}`);

	process.on("SIGINT", async () => {
		console.log("\n[The Nexus] Shutting down...");
		await fs.unlink("nexus.multiaddr").catch(() => {});
		await server.close();
		process.exit(0);
	});
}

main().catch(console.error);
