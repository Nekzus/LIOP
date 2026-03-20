// "The Sentinel Stdio Bridge" - Connecting Claude Desktop to NMP via Stdio
import { NmpHybridGateway } from "@nekzus/neural-mesh/gateway";
import { NmpServer } from "@nekzus/neural-mesh/server";
import { MeshNode } from "@nekzus/neural-mesh/mesh";
import { NmpClient } from "@nekzus/neural-mesh/client";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    // 1. Load context from Manifest (Nexus address)
    const manifestPath = path.resolve(__dirname, "..", "mesh-manifest.json");
    if (!fs.existsSync(manifestPath)) {
        console.error(chalk.red("❌ [Sentinel] Mesh manifest not found. Start Nexus first."));
        process.exit(1);
    }
    const { nexus } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // 2. Setup Mesh Infrastructure
    const meshNode = new MeshNode({
        listenAddresses: ["/ip4/0.0.0.0/tcp/0"],
        bootstrapNodes: [nexus]
    });
    await meshNode.start();

    // 3. Initialize Mesh Client
    const meshClient = new NmpClient({ meshNode });

    // 4. Setup Virtual Server
    const virtualServer = new NmpServer({
        name: "Sentinel-Stdio-Bridge",
        version: "1.0.0"
    });

    // 5. Register Proxy Tool
    // This handler explicitly delegates to the NMP Mesh Client
    virtualServer.tool(
        "query_telemetry",
        "Perform secure high-fidelity analysis over 1,000,000 telemetry records (via Neural Mesh).",
        {
            query: z.string().describe("Natural language query (e.g. 'count patients with heartRate > 100')"),
            limit: z.number().optional().describe("Max records to process"),
            payload: z.string().optional().describe("JavaScript logic between boundaries")
        },
        async (args) => {
            console.error(chalk.yellow(`📡 [Sentinel] Proxying tool call to mesh: query_telemetry`));

            // We search for the tool in the mesh and call it
            return await meshClient.callTool("query_telemetry", args);
        }
    );

    // 6. Initialize the Hybrid Gateway
    // Since we registered the tool locally and the handler uses meshClient, 
    // the gateway will resolve it via our virtualServer.
    const gateway = new NmpHybridGateway(virtualServer, {
        rpcPort: 50059
    });

    // 7. Connect Stdio to the Gateway Logic
    process.stdin.on("data", async (data) => {
        const input = data.toString();
        const lines = input.split("\n");
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const request = JSON.parse(line);
                // @ts-ignore
                const response = await gateway.dispatchMcp(request);
                if (response) {
                    process.stdout.write(JSON.stringify(response) + "\n");
                }
            } catch (e) {
                // Buffer handle
            }
        }
    });

    await gateway.listen(0);

    console.error(chalk.green("✅ [Sentinel] Stdio Bridge is live and mesh-connected."));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
