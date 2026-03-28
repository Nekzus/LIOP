import { LIOPMcpBridge, LiopServer } from "@nekzus/liop";
import { z } from "zod";

/**
 * LIOP Advanced Server Example
 *
 * Demonstrates an enterprise-ready implementation showcasing:
 * 1. Strict Zod schema validations
 * 2. Dynamic Resources
 * 3. Legacy MCP Bridge Wrapping
 */

async function main() {
	console.log("=== Logic-Injection-on-Origin Protocol: Advanced Server ===");

	const server = new LiopServer({ name: "GlobalDataHub", version: "2.1.0" });

	// --- 1. Complex Tools with Zod Enforcement ---
	server.tool(
		"process_telemetry",
		"Processes a batch of raw telemetry mapping objects",
		{
			batchId: z.string().uuid(),
			records: z.array(
				z.object({
					timestamp: z.string().datetime(),
					value: z.number(),
					tags: z.array(z.string()).default([]),
				}),
			),
			strictMode: z.boolean().default(false),
		},
		async ({
			batchId,
			records,
			strictMode,
		}: {
			batchId: string;
			records: unknown[];
			strictMode: boolean;
		}) => {
			console.log(`\n[Execution Sandbox] Processing Batch UUID: ${batchId}`);
			console.log(`[Execution Sandbox] Strict Mode: ${strictMode}`);
			console.log(`[Execution Sandbox] Ingress Records: ${records.length}`);

			return {
				content: [
					{
						type: "text",
						text: `Successfully processed telemetry batch ${batchId}`,
					},
				],
			};
		},
	);

	// --- 2. Dynamic Resources ---
	server.resource(
		"Syslog Stream",
		"file:///var/log/syslog",
		"A live stream of the agent's internal kernel operations",
		"text/plain",
	);

	console.log(
		"\n[Server Info] Registered advanced tools and dynamic resources.",
	);

	// --- 3. Legacy MCP Bridge Integration ---
	console.log(
		"\n[Server Info] Wrapping server with Legacy MCP Bridge adapter.",
	);
	const bridge = new LIOPMcpBridge(server);

	// Mock an incoming legacy JSON-RPC payload
	const incomingCallCommand = {
		jsonrpc: "2.0",
		id: "req_xyz987",
		method: "tools/call",
		params: {
			name: "process_telemetry",
			arguments: {
				batchId: "123e4567-e89b-12d3-a456-426614174000",
				records: [{ timestamp: new Date().toISOString(), value: 404.2 }],
			},
		},
	};

	console.log("\nSimulating incoming legacy MCP Request:");
	const response = await bridge.handleJsonRpcRequest(incomingCallCommand);
	console.log(JSON.stringify(response, null, 2));

	// --- 4. Launch Mesh Node & Tonic gRPC ---
	console.log("\n[Server Info] Booting Neural Mesh Node (DHT)...");
	await server.connectToMesh({
		port: 50051,
		meshConfig: {
			listenAddresses: ["/ip4/127.0.0.1/tcp/4061/ws"],
		},
	});

	console.log(
		`\n✅ Server is live! Run the client pointing to this P2P Multiaddr:`,
	);
	console.log(
		`pnpm demo:client --bootstrap /ip4/127.0.0.1/tcp/4061/ws/p2p/${server.getMeshNode()?.getPeerId()}`,
	);
}

main().catch(console.error);
