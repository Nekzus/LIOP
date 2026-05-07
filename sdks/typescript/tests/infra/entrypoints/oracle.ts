/**
 * LIOP Oracle Node — Real-time Market Data Provider
 *
 * Simulates a high-frequency financial data oracle.
 * Part of the LIOP Industrial Demo replication.
 *
 * Network: 172.20.0.13 | Ports: gRPC 50051, HTTP 3000
 * Bootstrap: Nexus at 172.20.0.10:4001
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { LiopServer } from "../../../src/server/index.js";
import { LiopHybridGateway } from "../../../src/gateway/hybrid.js";
import { log } from "../../../src/utils/logger.js";

async function main() {
	const dataDir = "/app/data";
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	const server = new LiopServer(
		{
			name: "SIMULATION-the-oracle",
			version: "1.0.0",
			capabilities: { tools: {} },
		},
		{
			taxonomy: {
				domain: "📈 Market Data (INDUSTRIAL DEMO)",
				clearanceTier: 1,
				executionTypes: ["Open Endpoints"],
			},
		},
	);

	// Industrial Market Dataset (Synthetic Ticks)
	const marketTicks = [
		{ ticker: "NXS", companyName: "Nekzus Digital", price: 442.10, change: "+1.2%", volume: "1.2M", peRatio: 28.5, marketCap: "$42B" },
		{ ticker: "LIOP", companyName: "Protocol Foundries", price: 89.45, change: "+5.7%", volume: "850K", peRatio: null, marketCap: "$8.9B" },
		{ ticker: "WASM", companyName: "Sandbox Systems", price: 156.20, change: "-0.4%", volume: "2.1M", peRatio: 12.3, marketCap: "$15B" }
	];

	// Expose data dictionary for Zero-Trust LLM guidance
	server.dataDictionary(
		{
			type: "array",
			items: {
				type: "object",
				properties: {
					ticker: { type: "string" },
					companyName: { type: "string" },
					price: { type: "number" },
					change: { type: "string" },
					volume: { type: "string" },
					peRatio: { type: "number", nullable: true },
					marketCap: { type: "string" },
				},
			},
		},
		"Market Data Schema (SYNTHETIC)",
		"LIOP://schema/market-data-synthetic",
	);
	server.setSandboxData(marketTicks as unknown as Record<string, unknown>[]);
	const marketAggregatedOutputSchema = z
		.object({
			// Domain-specific keys
			total: z.number().optional(),
			total_records: z.number().optional(),
			avgPrice: z.union([z.number(), z.string()]).optional(),
			positives: z.number().optional(),
			negatives: z.number().optional(),
			maxPrice: z.number().optional(),
			minPrice: z.number().optional(),
			columns: z.array(z.string()).optional(),
			prices: z.array(z.number()).optional(),
			volumes: z.array(z.union([z.number(), z.string()])).optional(),
			changes: z.array(z.string()).optional(),
			clientPayload: z.string().optional(),
			// Generic aggregation keys (LLMs generate these naturally)
			count: z.number().optional(),
			avg: z.union([z.number(), z.string()]).optional(),
			avgPE: z.union([z.number(), z.string()]).optional(),
			sum: z.number().optional(),
			min: z.number().optional(),
			max: z.number().optional(),
			result: z.union([z.number(), z.string()]).optional(),
		})
		.strict();

	server.tool(
		"Analyze_Synthetic_Market_Data",
		"DISCLAIMER: This is a SIMULATION using SYNTHETIC data. Securely analyzes real-time market ticks via LIOP Logic-on-Origin for protocol demonstration.",
		{ payload: z.string() },
		async (_params) => {
			return {
				content: [
					{
						type: "text",
						text: "[LIOP] Security Enforcement: Legacy Plain-Tool execution is BLOCKED. Market data analysis requires secure Logic-on-Origin (LIOPv1 Envelope).",
					},
				],
				isError: true,
			};
		},
		{
			enforceAggregationFirst: true,
			outputSchema: marketAggregatedOutputSchema,
		},
	);

	// Connect to Mesh (Simulating Parity with Industrial Discovery)
	await server.connectToMesh({
		port: 50051,
		meshConfig: {
			listenAddresses: ["/ip4/0.0.0.0/tcp/4000"], 
			identityPath: path.join(dataDir, "oracle-identity.json"),
			bootstrapNodes: ["/ip4/172.20.0.10/tcp/4000"],
		},
	});

	const meshNode = server.getMeshNode();
	if (!meshNode) throw new Error("Mesh node failed to initialize");

	// Active Manifesto Announcement (Fase 100 Requirement)
	if (meshNode) {
		await meshNode.announceCapability("liop:manifest");
	}

	const gateway = new LiopHybridGateway(server, meshNode, 50051);
	const port = await gateway.listen(3000);
	
	log.info(`[The Oracle] Gateway active on port ${port}`);
	log.info(`[The Oracle] 🆔 PeerID: ${meshNode.getPeerId()}`);

	// Export Industrial Beacon for Host Discovery (Local Dev Pattern)
	if (meshNode) {
		const peerId = meshNode.getPeerId();
		const p2pAddr = `/ip4/127.0.0.1/tcp/13005/p2p/${peerId}`;
		fs.writeFileSync(path.join(dataDir, "oracle.multiaddr"), p2pAddr);
		log.info(`[Oracle] 📈 Industrial Beacon exported: ${p2pAddr}`);
	}

	const shutdown = async () => {
		log.info("[The Oracle] Shutting down...");
		await gateway.stop();
		process.exit(0);
	};

	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);

	// Periodic Manifest Refresh
	setInterval(() => {
		gateway.getRouter().refreshManifestCache(true).catch(() => {});
	}, 15000);
}

main().catch(console.error);
