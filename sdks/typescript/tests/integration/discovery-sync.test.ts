import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { LiopServer } from "../../src/server/index.js";
import { MeshNode } from "../../src/mesh/index.js";
import { LiopMcpRouter } from "../../src/gateway/router.js";
import { createSwarmKey } from "../../src/mesh/swarm-key.js";

process.env.LIOP_EXPECTED_PROVIDERS = "1";
process.env.LIOP_INITIAL_DISCOVERY_TIMEOUT_MS = "20000";

describe("LIOP Dynamic Discovery Sync", () => {
    let sourceServer: LiopServer;
    let sourceMesh: MeshNode;
    let clientServer: LiopServer;
    let clientMesh: MeshNode;
    let router: LiopMcpRouter;

    beforeAll(async () => {
        const testSwarmKey = createSwarmKey();

        // 1. Source Node (Provides tools)
        sourceServer = new LiopServer({ name: "SourceHost", version: "1.0.0" });
        sourceServer.tool("GetStockPrice", "Returns price", {}, async () => ({ content: [] }));
        
        await sourceServer.connectToMesh({ 
            port: 0,
            meshConfig: {
                listenAddresses: ["/ip4/127.0.0.1/tcp/0"],
                enableMdns: false,
                swarmKey: testSwarmKey,
            },
        });
        // biome-ignore lint/suspicious/noExplicitAny: test helper
        sourceMesh = (sourceServer as any).meshNode;

        // Give source node time to announce manifest
        await new Promise(r => setTimeout(r, 2000));

        // 2. Client Agent (Discovers tools)
        clientServer = new LiopServer({ name: "AgentAgent", version: "1.0.0" });
        const tcpAddr = sourceMesh.getMultiaddrs().find(a => !a.includes("/ws")) || sourceMesh.getMultiaddrs()[0];
        const sourceMultiaddr = `${tcpAddr}/p2p/${sourceMesh.getPeerId()}`;
        clientMesh = new MeshNode({ 
            listenAddresses: ["/ip4/127.0.0.1/tcp/0"],
            bootstrapNodes: [sourceMultiaddr],
            enableMdns: false,
            swarmKey: testSwarmKey,
        });
        await clientMesh.start();

        // Explicitly dial source to ensure active connection in the routing table
        // biome-ignore lint/suspicious/noExplicitAny: test helper
        const rawNode = (clientMesh as any).node;
        if (rawNode) {
            try {
                const { multiaddr } = await import("@multiformats/multiaddr");
                await rawNode.dial(multiaddr(sourceMultiaddr));
            } catch {}
        }

        // Wait a bit for connection
        await new Promise(r => setTimeout(r, 1000));

        router = new LiopMcpRouter(clientServer, clientMesh);
    }, 30000);

    afterAll(async () => {
        await sourceMesh.stop();
        await clientMesh.stop();
        await sourceServer.close();
        await clientServer.close();
        try {
            const fs = await import("node:fs");
            if (fs.existsSync("./source-id.json")) fs.unlinkSync("./source-id.json");
            if (fs.existsSync("./client-id.json")) fs.unlinkSync("./client-id.json");
        } catch {}
    });

    it("should wait for discovery and return remote tools in the FIRST tools/list call", async () => {
        // Immediate call to tools/list
        const response = await router.dispatch({
            method: "tools/list",
            id: 1,
            jsonrpc: "2.0"
        } as any);

        expect(response).not.toBeNull();
        expect(response?.result).toBeDefined();

        const tools = (response?.result as any)?.tools?.map((t: any) => t.name) || [];
        
        // Should contain LiopMeshStatus (static) AND GetStockPrice (discovered)
        expect(tools).toContain("LiopMeshStatus");
        expect(tools).toContain("GetStockPrice");
        
        console.log("[Test-Discovery] ✅ Successfully discovered 'GetStockPrice' in the first sync call.");
    }, 60000);
});
