import * as fs from "node:fs/promises";
import { z } from "zod";
import { LiopServer } from "../../src/server/index.js";

async function main() {
	console.log("==================================================");
	console.log("🔮  THE ORACLE: LIOP Real-time Data Provider");
	console.log("==================================================");

	const server = new LiopServer(
		{
			name: "SIMULATION-the-oracle",
			version: "1.0.0",
			capabilities: { tools: {} },
		},
		{
			taxonomy: {
				domain: "📈 Market Data (SIMULATED)",
				clearanceTier: 1,
				executionTypes: ["Open Endpoints"],
			},
		},
	);

	// Load realistic data
	const marketData = await fs.readFile(
		new URL("./data/market_ticks.json", import.meta.url),
		"utf-8",
	);
	const ticks = JSON.parse(marketData);
	server.setSandboxData(ticks);

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
					peRatio: { type: "number" },
					marketCap: { type: "string" },
				},
			},
		},
		"Market Data Schema (SYNTHETIC)",
		"LIOP://schema/market-data-synthetic",
	);

	server.tool(
		"Analyze_Synthetic_Market_Data",
		"DISCLAIMER: This is a SIMULATION using SYNTHETIC data. Securely analyzes real-time market ticks via LIOP Logic-on-Origin for protocol demonstration.",
		{ payload: z.string() },
		async (args) => {
			console.log(
				`\n[The Oracle] 📈 Zero-Trust Execution Triggered for AnalyzeMarketData`,
			);
			return {
				content: [{ type: "text", text: args.payload }],
			};
		},
	);

	// Read Nexus Address
	const bootstrapNodes: string[] = [];
	try {
		const addr = await fs.readFile("nexus.multiaddr", "utf-8");
		bootstrapNodes.push(addr.trim());
		console.log(`[The Oracle] Discovered Nexus at ${addr.trim()}`);
	} catch (_e) {
		console.warn("[The Oracle] No nexus.multiaddr found. Starting isolated.");
	}

	await server.connectToMesh({
		port: 50053,
		meshConfig: {
			listenAddresses: ["/ip4/0.0.0.0/tcp/4065", "/ip4/0.0.0.0/tcp/4066/ws"],
			identityPath: "oracle-identity.json",
			bootstrapNodes,
		},
	});

	const meshNode = server.getMeshNode();
	console.log(`[The Oracle] 🌐 Connected to Zero-Trust Mesh`);
	console.log(`[The Oracle] 🆔 PeerID: ${meshNode?.getPeerId()}`);
	console.log(`[The Oracle] 🚀 Ready and serving Market Data...`);

	process.on("SIGINT", async () => {
		console.log("\n[The Oracle] Shutting down...");
		await server.close();
		process.exit(0);
	});
}

main().catch(console.error);
