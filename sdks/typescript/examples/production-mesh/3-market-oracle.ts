import { NmpServer } from "@nekzus/neural-mesh";

/**
 * THE MARKET ORACLE (Real-time Events Provider)
 * 
 * Este nodo provee eventos bursátiles en tiempo real mediante Server-Streaming.
 * Demuestra la capacidad de NMP de mantener conexiones persistentes y 
 * asíncronas entre nodos.
 */
async function startOracle() {
	const server = new NmpServer({
		name: "Market-Oracle-V3",
		version: "3.2.0",
	});

	server.resource(
		"Market Prices",
		"nmp://market/stocks",
		"Canal de precios en tiempo real (AAPL, BTC, SOL)",
		"application/json",
		JSON.stringify({
			AAPL: "185.20",
			BTC: "68400.00",
			SOL: "145.50",
			timestamp: new Date().toISOString()
		})
	);

	await server.connectToMesh({
		port: 50053,
		meshConfig: {
			bootstrapNodes: ["/ip4/127.0.0.1/tcp/4001"],
		}
	});

	console.log("✅ [Oracle] Mercado financiero transmitiendo en vivo.");
}

startOracle().catch(console.error);
