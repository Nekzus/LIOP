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
import { MeshNode } from "../../../src/mesh/index.js";
import { LiopServer } from "../../../src/server/index.js";
import { LiopHybridGateway } from "../../../src/gateway/hybrid.js";
import { log } from "../../../src/utils/logger.js";

async function main() {
	const dataDir = "/app/data";
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	const liopServer = new LiopServer({
		name: "LIOP-Nexus",
		version: "1.0.0",
	});

	const meshNode = new MeshNode({
		identityPath: path.join(dataDir, "nexus-identity.json"),
		listenAddresses: ["/ip4/0.0.0.0/tcp/4001"],
		bootstrapNodes: [], // Nexus is the seed
	});

	await meshNode.start();
	liopServer.setMeshNode(meshNode);

	const gateway = new LiopHybridGateway({
		liopServer,
		meshNode,
	});

	const port = await gateway.listen(3000);
	log.info(`[Nexus] Gateway active on port ${port}`);
}

main().catch(console.error);
