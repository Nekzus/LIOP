import { LiopServer } from "@nekzus/liop";

/**
 * THE MARKET ORACLE (Real-time Events Provider)
 *
 * This node provides real-time stock events via Server-Streaming.
 * Demonstrates LIOP's capability to maintain persistent and asynchronous
 * connections between nodes.
 */
async function startOracle() {
	const server = new LiopServer({
		name: "Market-Oracle-V3",
		version: "3.2.0",
	});

	server.resource(
		"Market Prices",
		"LIOP://market/stocks",
		"Real-time price channel (AAPL, BTC, SOL)",
		"application/json",
		JSON.stringify({
			AAPL: "185.20",
			BTC: "68400.00",
			SOL: "145.50",
			timestamp: new Date().toISOString(),
		}),
	);

	await server.connectToMesh({
		port: 50053,
		meshConfig: {
			bootstrapNodes: ["/ip4/127.0.0.1/tcp/4001"],
		},
	});

	console.log("✅ [Oracle] Financial market streaming live.");
}

startOracle().catch(console.error);
