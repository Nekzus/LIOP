/**
 * LIOP Nexus Node — Bootstrap Seed
 *
 * First node of the mesh. Provides DHT bootstrap for all other nodes.
 * Does NOT expose any tools — sole purpose is peer discovery.
 * Publishes its multiaddr + PeerID via the /health JSON endpoint
 * to enable SDK Auto-Discovery.
 *
 * Network: 172.20.0.10 | Ports: libp2p TCP 4001, HTTP 3000
 * Identity: Persistent at /app/data/nexus-identity.json
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { LiopServer } from "../../../src/server/index.js";
import { LiopHybridGateway } from "../../../src/gateway/hybrid.js";
import { log } from "../../../src/utils/logger.js";

async function main() {
	const dataDir = "/app/data";
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	const liopServer = new LiopServer(
		{
			name: "LIOP-Nexus",
			version: "1.0.0",
		},
		{
			auth: {
				role: "nexus",
			},
		},
	);

	await liopServer.connectToMesh({
		port: 50051,
		meshConfig: {
			identityPath: path.join(dataDir, "nexus-identity.json"),
			listenAddresses: [
				"/ip4/0.0.0.0/tcp/4000",
				"/ip4/0.0.0.0/tcp/4001/ws"
			],
			bootstrapNodes: [], // Nexus is the seed
		}
	});

	// Export multiaddr for the Agent (Industrial Discovery Pattern)
	const meshNode = liopServer.getMeshNode();
	if (meshNode) {
		const peerId = meshNode.getPeerId();
		// For cross-environment safety, ALWAYS advertise the host-mapped port
		const p2pAddr = `/ip4/127.0.0.1/tcp/13001/p2p/${peerId}`;
		
		fs.writeFileSync(path.join(dataDir, "nexus.multiaddr"), p2pAddr);
		log.info(`[Nexus] 🌌 Industrial TCP Beacon exported: ${p2pAddr}`);
	}

	const gateway = new LiopHybridGateway(liopServer, liopServer.getMeshNode() || undefined);
	const port = await gateway.listen(3000);
	log.info(`[Nexus] Gateway active on port ${port}`);
	const shutdown = async () => {
		log.info("[Nexus] Shutdown signal received. Closing servers...");
		await gateway.stop();
		process.exit(0);
	};

	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);
}

main().catch(console.error);
