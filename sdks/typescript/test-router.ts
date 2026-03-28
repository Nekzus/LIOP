import { LiopMcpRouter } from "./src/gateway/router.js";
import { LiopServer } from "./src/server/index.js";
import { MeshNode } from "./src/mesh/index.js";

async function run() {
    const server = new LiopServer({ name: "test-client", version: "1.0", capabilities: { tools: {} } });
    
    // Config like agent.ts
    const bootstrapNodes: string[] = [];
    try {
        const addr = await import("node:fs/promises").then(fs => fs.readFile("nexus.multiaddr", "utf-8"));
        bootstrapNodes.push(addr.trim());
    } catch {}

    await server.connectToMesh({
        meshConfig: {
            listenAddresses: ["/ip4/0.0.0.0/tcp/0"],
            bootstrapNodes
        }
    });

    const router = new LiopMcpRouter(server, server.getMeshNode());

    console.log("Waiting for discovery to find oracle...");
    await new Promise(r => setTimeout(r, 3000));
    await router.refreshManifestCache();

    console.log("Dispatching MCP request...");
    const res = await router.dispatch({
        method: "tools/call",
        id: 1,
        params: {
            name: "GetStockPrice",
            arguments: { ticker: "AAPL" }
        }
    });

    console.log("RESULT:", JSON.stringify(res, null, 2));
    process.exit(0);
}
run().catch(console.error);
