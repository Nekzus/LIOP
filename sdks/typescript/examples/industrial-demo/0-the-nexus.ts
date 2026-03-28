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

	const multiaddrs = meshNode.getMultiaddrs();
	const p2pAddr =
		multiaddrs.find((a) => a.includes("/ip4/127.0.0.1/tcp/4000/p2p/")) ||
		multiaddrs[0];
	await fs.writeFile("nexus.multiaddr", p2pAddr);

	console.log(`[The Nexus] 🌐 Bootstrap Node Active`);
	console.log(`[The Nexus] 🆔 PeerID: ${meshNode.getPeerId()}`);
	console.log(`[The Nexus] ⚡ Address written to nexus.multiaddr: ${p2pAddr}`);

	process.on("SIGINT", async () => {
		console.log("\n[The Nexus] Shutting down...");
		await fs.unlink("nexus.multiaddr").catch(() => {});
		await server.close();
		process.exit(0);
	});
}

main().catch(console.error);
