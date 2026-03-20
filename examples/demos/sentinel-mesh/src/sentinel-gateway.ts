// "The Sentinel" - NMP Hybrid Gateway for Claude (Simple SSE Edition)
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
    console.error(chalk.cyan("\n🛡️  [NMP-SENTINEL] Initializing Hybrid Gateway (SSE/HTTP)..."));

    // 1. Load context from Manifest
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
        name: "Sentinel-Mesh-Gateway",
        version: "1.0.0"
    });

    // 5. Register "Proxy" Tools (Ensure they appear in listTools via SSE)
    virtualServer.tool(
        "query_telemetry",
        "Perform secure high-fidelity analysis over 1,000,000 telemetry records (via Neural Mesh).",
        {
            query: z.string().describe("Natural language query (e.g. 'count patients with heartRate > 100')"),
            limit: z.number().optional().describe("Max records to process")
        },
        async (args) => {
            console.error(chalk.yellow(`📡 [Sentinel] Proxying SSE call to mesh: query_telemetry`));
            return await meshClient.callTool("query_telemetry", args);
        }
    );

    // 6. Initialize the Hybrid Gateway (Multiplexer)
    const gateway = new NmpHybridGateway(virtualServer, {
        rpcPort: 50051 // Internal RPC port
    });

    // 7. Start the SSE/HTTP listener on port 3000
    await gateway.listen(3000);
    
    console.error(chalk.green("✅ [Sentinel] Hybrid Gateway is live."));
    console.error(chalk.cyan(`🔹 Protocol: Shielded Logic Streaming`));
    console.error(chalk.cyan(`🔹 Claude Access URL: http://localhost:3000/mcp`));
    
    console.error(chalk.yellow("\n[Status] Monitoring Shielded Channels... Ready for Claude (SSE). 🚀\n"));
}

main().catch(err => {
    console.error(chalk.red(`❌ [Sentinel] Critical Failure: ${err.message}`));
    process.exit(1);
});
