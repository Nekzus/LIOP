import * as fs from "node:fs/promises";
import { z } from "zod";
import { NmpServer } from "../../src/server/index.js";

async function main() {
	console.log("==================================================");
	console.log("🔮  THE ORACLE: NMP Real-time Data Provider");
	console.log("==================================================");

	const server = new NmpServer({
		name: "the-oracle",
		version: "1.0.0",
		capabilities: { tools: {} },
	});

	server.tool(
		"GetStockPrice",
		"Fetches the real-time stock price for a given ticker symbol.",
		{ ticker: z.string() },
		async (args) => {
			console.log(
				`\n[The Oracle] 📈 Zero-Trust Execution Triggered for GetStockPrice`,
			);
			console.log(`[The Oracle] -> Querying Market Data for: ${args.ticker}`);
			const prices: Record<string, string> = {
				AAPL: "$210.50",
				MSFT: "$415.20",
				GOOGL: "$175.80",
			};
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								ticker: args.ticker.toUpperCase(),
								price: prices[args.ticker.toUpperCase()] || "Unknown Ticker",
								timestamp: new Date().toISOString(),
							},
							null,
							2,
						),
					},
				],
			};
		},
	);

	// Read Nexus Address
	const bootstrapNodes: string[] = [];
	try {
		const addr = await fs.readFile("nexus.multiaddr", "utf-8");
		bootstrapNodes.push(addr.trim());
		console.log(`[The Oracle] Discovered Nexus at ${addr.trim()}`);
	} catch (e) {
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
