import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { NmpServer } from "../../src/server/index.js";
import { MeshNode } from "../../src/mesh/index.js";
import { NmpMcpRouter } from "../../src/gateway/router.js";

describe("NMP Dynamic Discovery Sync", () => {
    let sourceServer: NmpServer;
    let sourceMesh: MeshNode;
    let clientServer: NmpServer;
    let clientMesh: MeshNode;
    let router: NmpMcpRouter;

    beforeAll(async () => {
        // 1. Source Node (Provides tools)
        sourceServer = new NmpServer({ name: "SourceHost", version: "1.0.0" });
        sourceServer.tool("GetStockPrice", "Returns price", {}, async () => ({ content: [] }));
        
        sourceMesh = new MeshNode({ identityPath: "./source-id.json" });
        await sourceMesh.start();
        await sourceServer.connectToMesh({ port: 50070 });
        
        // Register manifest for source
        new NmpMcpRouter(sourceServer, sourceMesh, 50070);

        // Give source node time to announce manifest
        await new Promise(r => setTimeout(r, 2000));

        // 2. Client Agent (Discovers tools)
        clientServer = new NmpServer({ name: "AgentAgent", version: "1.0.0" });
        clientMesh = new MeshNode({ 
            identityPath: "./client-id.json",
            bootstrapNodes: [(sourceMesh as any).node.getMultiaddrs().map((m: any) => m.toString())[0]]
        });
        await clientMesh.start();

        // Wait a bit for connection
        await new Promise(r => setTimeout(r, 1000));

        router = new NmpMcpRouter(clientServer, clientMesh);
    }, 30000);

    afterAll(async () => {
        await sourceMesh.stop();
        await clientMesh.stop();
        await sourceServer.close();
        await clientServer.close();
    });

    it("should wait for discovery and return remote tools in the FIRST tools/list call", async () => {
        // Immediate call to tools/list
        const response = await router.dispatch({
            method: "tools/list",
            id: 1,
            jsonrpc: "2.0"
        } as any);

        const tools = response.result.tools.map((t: any) => t.name);
        
        // Should contain NmpMeshStatus (static) AND GetStockPrice (discovered)
        expect(tools).toContain("NmpMeshStatus");
        expect(tools).toContain("GetStockPrice");
        
        console.log("[Test-Discovery] ✅ Successfully discovered 'GetStockPrice' in the first sync call.");
    }, 60000);
});
