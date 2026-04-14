import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MeshNode } from "../../src/mesh/node.js";
import { LiopServer } from "../../src/server/index.js";
import { LiopMcpRouter } from "../../src/gateway/router.js";
import { z } from "zod";

describe("LIOP Dynamic Routing & Disambiguation", () => {
    let agentNode: MeshNode;
    let providerA: MeshNode;
    let providerB: MeshNode;
    let serverA: LiopServer;
    let serverB: LiopServer;
    let router: LiopMcpRouter;

    beforeAll(async () => {
        // Setup Provider A
        serverA = new LiopServer({ name: "ProviderA", version: "1.0.0" });
        serverA.tool("collide_tool", "Tool from Node A", { data: z.string() }, async () => {
            return { content: [{ type: "text", text: "Response from A" }] };
        });
        providerA = new MeshNode({ 
            listenAddresses: ["/ip4/127.0.0.1/tcp/0"],
        });
        await providerA.start();
        providerA.registerManifestHandler(() => ({
            peerId: providerA.getPeerId(),
            grpcPort: 50061, // Simulated ports for routing logic
            tools: [{ 
                name: "collide_tool", 
                description: "Tool from Node A", 
                inputSchema: { type: "object", properties: { data: { type: "string" } } } 
            }],
            resources: [],
            serverInfo: serverA.getServerInfo()
        }));
        await providerA.announceManifest();

        // Setup Provider B
        serverB = new LiopServer({ name: "ProviderB", version: "1.0.0" });
        serverB.tool("collide_tool", "Tool from Node B", { data: z.string() }, async () => {
            return { content: [{ type: "text", text: "Response from B" }] };
        });
        providerB = new MeshNode({ 
            listenAddresses: ["/ip4/127.0.0.1/tcp/0"],
            bootstrapNodes: providerA.getMultiaddrs()
        });
        await providerB.start();
        providerB.registerManifestHandler(() => ({
            peerId: providerB.getPeerId(),
            grpcPort: 50062,
            tools: [{ 
                name: "collide_tool", 
                description: "Tool from Node B", 
                inputSchema: { type: "object", properties: { data: { type: "string" } } } 
            }],
            resources: [],
            serverInfo: serverB.getServerInfo()
        }));
        await providerB.announceManifest();

        // Setup Agent Node (The Gateway)
        agentNode = new MeshNode({
            listenAddresses: ["/ip4/127.0.0.1/tcp/0"],
            bootstrapNodes: providerA.getMultiaddrs()
        });
        await agentNode.start();
        
        const localServer = new LiopServer({ name: "Agent", version: "1.0.0" });
        localServer.tool("collide_tool", "Local Tool", { data: z.string() }, async () => {
            return { content: [{ type: "text", text: "Response from Local" }] };
        });
        router = new LiopMcpRouter(localServer, agentNode);

        // Manually inject manifests into cache to bypass DHT propagation lag in unit tests
        // @ts-expect-error: accessing private manifestCache
        router.manifestCache.set(providerA.getPeerId(), {
            cachedAt: Date.now(),
            manifest: {
                peerId: providerA.getPeerId(),
                grpcPort: 50061,
                tools: [{ name: "collide_tool", description: "Node A", inputSchema: { type: "object" } }],
                resources: [],
                serverInfo: { name: "ProviderA", version: "1.0.0" }
            }
        });
        // @ts-expect-error: accessing private manifestCache
        router.manifestCache.set(providerB.getPeerId(), {
            cachedAt: Date.now(),
            manifest: {
                peerId: providerB.getPeerId(),
                grpcPort: 50062,
                tools: [{ name: "collide_tool", description: "Node B", inputSchema: { type: "object" } }],
                resources: [],
                serverInfo: { name: "ProviderB", version: "1.0.0" }
            }
        });

        // Wait for peer discovery
        await new Promise(resolve => setTimeout(resolve, 2000));
    }, 30000);

    afterAll(async () => {
        await agentNode.stop();
        await providerA.stop();
        await providerB.stop();
    });

    it("should discover all providers and apply suffixes during tools/list", async () => {
        const response = await router.dispatch({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list"
        });

        expect(response).not.toBeNull();
        const result = response!.result as { tools: Array<{ name: string }> };
        const tools = result.tools.map((t) => t.name);
        
        // Should find LiopMeshStatus + 2 disambiguated tools
        expect(tools).toContain("LiopMeshStatus");
        
        const suffixedA = `collide_tool_${providerA.getPeerId().slice(-4)}`;
        const suffixedB = `collide_tool_${providerB.getPeerId().slice(-4)}`;
        
        expect(tools).toContain(suffixedA);
        expect(tools).toContain(suffixedB);
    });

    it("should resolve suffixed tool name to correct provider and clean it", async () => {
        // We can't actually call gRPC in this unit test without a real running gRPC server on 50061
        // But we can verify the 'resolveManifestTarget' logic directly
        const suffixedA = `collide_tool_${providerA.getPeerId().slice(-4)}`;
        
        // @ts-expect-error: accessing private method for unit test
        const target = router.resolveManifestTarget(suffixedA);
        
        expect(target).not.toBeNull();
        expect(target!.peerId).toBe(providerA.getPeerId());
        expect(target!.originalToolName).toBe("collide_tool");
    });
});
