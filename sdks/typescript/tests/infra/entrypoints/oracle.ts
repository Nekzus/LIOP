/**
 * LIOP HFT Oracle Node — Real-time High-Frequency Trading Simulator
 *
 * Industrial-grade HFT simulation powered by:
 * - Heston Stochastic Volatility + Merton Jump Diffusion pricing engine
 * - Level 2 Order Book with Price-Time Priority matching engine
 * - Algorithmic strategies: Market Maker, VWAP, TWAP, Noise Trader
 * - Ring Buffer Audit Trail (MiFID II RTS 25 / FINRA CAT compliance)
 * - SEC Rule 15c3-5 Kill Switch
 *
 * Network: 172.20.0.13 | Ports: gRPC 50051, HTTP 3000
 * Bootstrap: Nexus at 172.20.0.10:4001
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { LiopServer } from "../../../src/server/index.js";
import { LiopHybridGateway } from "../../../src/gateway/hybrid.js";
import { log } from "../../../src/utils/logger.js";
import { TickEngine, generateHftSnapshot, generateStaticHftDataset } from "../hft/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
	const dataDir = "/app/data";
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	const server = new LiopServer(
		{
			name: "SIMULATION-the-oracle",
			version: "2.0.0",
			capabilities: { tools: {} },
		},
		{
			tokenSlug: "ORACLE",
			auth: {
				role: "none",
			},
			taxonomy: {
				domain: "📈 HFT Market Data (INDUSTRIAL DEMO)",
				clearanceTier: 1,
				executionTypes: ["Open Endpoints"],
			},
			budgetStorePath: path.join(dataDir, "oracle-query-budgets.json"),
		},
	);

	// ── HFT Engine Configuration ────────────────────────────────────
	const tickIntervalMs = process.env.LIOP_HFT_TICK_INTERVAL_MS
		? Number.parseInt(process.env.LIOP_HFT_TICK_INTERVAL_MS, 10)
		: 50;
	const instrumentCount = process.env.LIOP_HFT_INSTRUMENTS
		? Number.parseInt(process.env.LIOP_HFT_INSTRUMENTS, 10)
		: 8;

	const tickEngine = new TickEngine({
		tickIntervalMs: Number.isNaN(tickIntervalMs) ? 50 : tickIntervalMs,
		instrumentCount: Number.isNaN(instrumentCount) ? 8 : instrumentCount,
		auditBufferSize: 50000,
		burnInTicks: 40,
		snapshotRefreshInterval: 5,
	});

	// Initialize with static data, will be replaced after burn-in
	const initialData = generateStaticHftDataset();
	server.setSandboxData(initialData as unknown as Record<string, unknown>[]);

	// ── Data Dictionary (HFT Extended Schema) ───────────────────────
	server.dataDictionary(
		{
			type: "array",
			items: {
				type: "object",
				properties: {
					ticker: { type: "string", description: "Instrument symbol (e.g. AAPL)" },
					price: { type: "number", description: "Last traded price (USD)" },
					change: { type: "string", description: "% change from session open" },
					volume: { type: "string", description: "Cumulative volume (formatted)" },
					peRatio: { type: "number", nullable: true, description: "Price-to-Earnings ratio" },
					marketCap: { type: "string", description: "Market capitalization" },
					bestBid: { type: "number", description: "Best bid price (L2)" },
					bestAsk: { type: "number", description: "Best ask price (L2)" },
					spread: { type: "number", description: "Bid-ask spread (USD)" },
					spreadBps: { type: "number", description: "Spread in basis points" },
					bidDepth: { type: "number", description: "Total bid depth (top 5 levels)" },
					askDepth: { type: "number", description: "Total ask depth (top 5 levels)" },
					imbalance: { type: "number", description: "Order book imbalance [-1, 1]" },
					lastTradePrice: { type: "number", description: "Price of the last trade" },
					lastTradeQty: { type: "number", description: "Quantity of the last trade" },
					ticksPerSecond: { type: "number", description: "Engine throughput (ticks/s)" },
					volatility30s: { type: "number", description: "Rolling 30s log-return volatility" },
					vwap: { type: "number", description: "Session VWAP" },
				},
			},
		},
		"HFT Market Data Schema (SYNTHETIC — Heston + Jump Diffusion)",
		"LIOP://schema/hft-market-data-synthetic",
	);

	// ── Output Schema ───────────────────────────────────────────────
	const hftAggregatedOutputSchema = z
		.object({
			total: z.number().optional(),
			total_records: z.number().optional(),
			avgPrice: z.union([z.number(), z.string()]).optional(),
			avgSpread: z.union([z.number(), z.string()]).optional(),
			avgVolatility: z.union([z.number(), z.string()]).optional(),
			avgImbalance: z.union([z.number(), z.string()]).optional(),
			positives: z.number().optional(),
			negatives: z.number().optional(),
			maxPrice: z.number().optional(),
			minPrice: z.number().optional(),
			maxSpread: z.number().optional(),
			minSpread: z.number().optional(),
			totalVolume: z.union([z.number(), z.string()]).optional(),
			avgVwap: z.union([z.number(), z.string()]).optional(),
			columns: z.array(z.string()).optional(),
			clientPayload: z.string().optional(),
		})
		.catchall(z.number());

	// ── Primary Tool: HFT Market Analysis ───────────────────────────
	server.tool(
		"Analyze_HFT_Market_Data",
		"DISCLAIMER: SIMULATION with SYNTHETIC data. Securely analyzes real-time HFT market ticks (Heston + Jump Diffusion model, 8 instruments, L2 order book) via LIOP Logic-on-Origin.",
		{ payload: z.string() },
		async (_params) => {
			return {
				content: [
					{
						type: "text",
						text: "[LIOP] Security Enforcement: Legacy Plain-Tool execution is BLOCKED. HFT market data analysis requires secure Logic-on-Origin (LIOPv1 Envelope).",
					},
				],
				isError: true,
			};
		},
		{
			enforceAggregationFirst: true,
			outputSchema: hftAggregatedOutputSchema,
			dpEpsilon: 4.0,
			dpSensitivity: 5.0,
			sensitiveKeys: ["ticker", "companyName"],
		},
	);

	// ── Start HFT Engine ────────────────────────────────────────────
	log.info(`[The Oracle] Starting HFT engine: ${instrumentCount} instruments @ ${tickIntervalMs}ms interval`);
	await tickEngine.start();
	log.info("[The Oracle] HFT engine started — burn-in complete");

	// Update sandbox data with live HFT snapshot
	const hftData = generateHftSnapshot(tickEngine);
	if (hftData.length > 0) {
		server.setSandboxData(hftData as unknown as Record<string, unknown>[]);
	}

	// Periodic dataset refresh from live engine
	const dataRefreshInterval = setInterval(() => {
		const snapshot = generateHftSnapshot(tickEngine);
		if (snapshot.length > 0) {
			server.setSandboxData(snapshot as unknown as Record<string, unknown>[]);
		}
	}, 1000); // Refresh every 1s

	// ── Connect to Mesh ─────────────────────────────────────────────
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

	if (meshNode) {
		await meshNode.announceCapability("liop:manifest");
	}

	const gateway = new LiopHybridGateway(server, meshNode, 50051);
	const port = await gateway.listen(3000);

	log.info(`[The Oracle] Gateway active on port ${port}`);
	log.info(`[The Oracle] 🆔 PeerID: ${meshNode.getPeerId()}`);

	// Log HFT metrics
	const latency = tickEngine.getLatencyHistogram();
	log.info(
		`[The Oracle] 📊 HFT Metrics — p50: ${latency.p50}ns, p95: ${latency.p95}ns, p99: ${latency.p99}ns, ticks: ${tickEngine.getTickIndex()}`,
	);

	// Export Industrial Beacon
	if (meshNode) {
		const peerId = meshNode.getPeerId();
		const p2pAddr = `/ip4/127.0.0.1/tcp/13005/p2p/${peerId}`;
		fs.writeFileSync(path.join(dataDir, "oracle.multiaddr"), p2pAddr);
		log.info(`[Oracle] 📈 Industrial Beacon exported: ${p2pAddr}`);
	}

	// ── Shutdown ────────────────────────────────────────────────────
	const shutdown = async () => {
		log.info("[The Oracle] Shutting down...");
		tickEngine.halt();
		tickEngine.stop();
		clearInterval(dataRefreshInterval);
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
