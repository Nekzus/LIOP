/**
 * LIOP Agent Node — Automated Consumer
 *
 * Lightweight node for the Test Runner. No local tools.
 * All discovery via Kademlia DHT.
 *
 * Network: 172.20.0.12 | Ports: gRPC 50051, HTTP 3000
 * Bootstrap: Nexus at 172.20.0.10:4001
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { MeshNode } from "../../../src/mesh/index.js";
import { LiopServer } from "../../../src/server/index.js";
import { LiopMcpRouter } from "../../../src/gateway/router.js";
import { LiopHybridGateway } from "../../../src/gateway/hybrid.js";
import { log } from "../../../src/utils/logger.js";

async function main() {
	const dataDir = "/app/data";
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	const liopServer = new LiopServer({
		name: "LIOP-Agent-Node",
		version: "1.0.0"
	});

	await liopServer.connectToMesh({ port: 50051, meshConfig: { 
		identityPath: path.join(dataDir, "agent-identity.json"),
		listenAddresses: ["/ip4/0.0.0.0/tcp/4001"], 
		bootstrapNodes: ["/ip4/172.20.0.10/tcp/4001"] 
	}});

	const meshNode = liopServer.getMeshNode();
	if (!meshNode) throw new Error("Failed to initialize MeshNode");

	const router = new LiopMcpRouter(liopServer, meshNode);

	const gateway = new LiopHybridGateway(liopServer, meshNode, 50051);

	const port = await gateway.listen(3000);
	log.info(`[Agent Node] Gateway active on port ${port}`);

	// Keep alive and do periodic discovery
	setInterval(async () => {
		try {
			await router.refreshManifestCache(true);
		} catch (e) {
			/* ignore errors silently in background */
		}
	}, 15000);
}

main().catch(console.error);
