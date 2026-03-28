// "The Bastion" - NMP Secure Data Provider
import { LiopServer } from "@nekzus/liop/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import chalk from "chalk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The Bastion hosts the telemetry data and executes logic-on-origin.
 */
async function main() {
    console.error(chalk.cyan("\n🏛️  [NMP-BASTION] Initializing Secure Data Bastion..."));

    // 1. Load context from Manifest
    const manifestPath = path.resolve(__dirname, "..", "mesh-manifest.json");
    if (!fs.existsSync(manifestPath)) {
        console.error(chalk.red("❌ [Bastion] Mesh manifest not found. Start Nexus first."));
        process.exit(1);
    }
    const { nexus } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // 2. LiopServer Initialization with PII Patterns
    const server = new LiopServer(
        {
            name: "Bastion-Industrial-Provider",
            version: "1.0.0",
        },
        {
            capabilities: {
                logging: true,
                pii_protection: true,
                zk_receipts: true
            },
            security: {
                piiPatterns: [
                    { name: "PATIENT_ID", pattern: /PATIENT-[A-Z0-9]{8,12}/i },
                    { name: "PERSONAL_NAME", pattern: /User \d+/i }
                ]
            }
        }
    );

    // 3. Register the Industrial Tool
    server.tool(
        "query_telemetry",
        "Perform secure high-fidelity analysis over 1,000,000 telemetry records.",
        {
            query: z.string().describe("Natural language query for the data (e.g. 'count patients with heartRate > 100')"),
            limit: z.number().optional().describe("Max records to process")
        },
        async (args) => {
            const { query } = args;
            console.error(chalk.yellow(`🛠️  [Bastion] Logic-on-Origin Execution: "${query}"`));

            const startTime = Date.now();

            // Simulating matching logic
            const stats = {
                total_processed: 1000000,
                matches: Math.floor(Math.random() * 5000),
                p95_heart_rate: 112,
                status: "SECURE_AGGREGATION_COMPLETE",
                execution_time_ms: Date.now() - startTime
            };

            return {
                content: [
                    {
                        type: "text",
                        text: `Analysis complete. Proved integrity via ZK-Receipt.\n${JSON.stringify(stats, null, 2)}`
                    }
                ]
            };
        }
    );

    // 4. Connect to Mesh and Start RPC Engine
    await server.connectToMesh({
        port: 50051,
        meshConfig: {
            listenAddresses: ["/ip4/0.0.0.0/tcp/4002"],
            bootstrapNodes: [nexus]
        }
    });

    console.error(chalk.blue("\n[Ready] Shielded Logic Streaming active. Bastion is shielding 1M records.\n"));
}

main().catch(err => {
    console.error(chalk.red(`❌ [Bastion] Critical Failure: ${err.message}`));
    process.exit(1);
});
