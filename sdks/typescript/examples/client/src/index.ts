import { type CallToolRequest, LiopClient } from "@nekzus/liop";

/**
 * LIOP Advanced Client Example
 *
 * Demonstrates an Agent dispatching complex logic payloads, handling
 * Zod validation failures correctly, and discovering capabilities dynamically.
 */

async function main() {
	console.log("=== Logic-Injection-on-Origin Protocol: Advanced Client ===");

	const args = process.argv.slice(2);
	const bootstrapIndex = args.indexOf("--bootstrap");
	let bootstrapNode: string | undefined;

	if (bootstrapIndex !== -1 && args.length > bootstrapIndex + 1) {
		bootstrapNode = args[bootstrapIndex + 1];
	}

	const client = new LiopClient({ name: "EnterpriseAgent", version: "1.0.0" });

	// 1. Connect & Discover (Zero Trust Mesh)
	console.log("\n[Client] Initializing Kademlia DHT Agent...");
	await client.connect(undefined, {
		meshConfig: {
			bootstrapNodes: bootstrapNode ? [bootstrapNode] : [],
		},
	});

	if (bootstrapNode) {
		console.log(
			`[Client] Bootstrapped successfully using The Nexus: ${bootstrapNode}`,
		);
	} else {
		console.warn(
			`[Client] No Bootstrap Node provided. Searching in isolated local DHT...`,
		);
	}
	// 2. Discover Capabilities
	// Note: We bypass `client.getServerInfo()` since we don't have a static host!
	console.log(`\nFetching Graph Capabilities over P2P Swarm...`);

	const tools = await client.discoverTools();
	console.log("Discovered APIs available for execution:");
	console.table(tools);

	console.log(
		"\n[Client] Waiting 3 seconds for Kademlia DHT Swarm propagation...",
	);
	await new Promise((r) => setTimeout(r, 3000));

	// 2. Dispatch an invalid payload to test Server-Side Zod Rejection
	console.log(
		"\nDispatching INVALID telemetry to test Zero-Trust Sandboxing...",
	);
	const invalidRequest: CallToolRequest = {
		name: "process_telemetry",
		arguments: {
			batchId: "not-a-real-uuid", // Will trigger Zod error on the server
			records: [{ timestamp: "2026-02-25" }],
		},
	};

	try {
		const invalidResult = await client.callTool(invalidRequest);

		if (invalidResult.isError) {
			console.warn("\n[Client] Server gracefully rejected the execution:");
			console.warn(invalidResult.content[0].text);
		}
	} catch (e) {
		console.error(
			"\n[Client Error] Invalid Request failed structurally or DHT resolution timed out:",
			e,
		);
	}

	// 3. Dispatch a valid payload
	console.log("\nDispatching VALID telemetry payload...");
	const validRequest: CallToolRequest = {
		name: "process_telemetry",
		arguments: {
			batchId: "550e8400-e29b-41d4-a716-446655440000",
			records: [
				{
					timestamp: new Date().toISOString(),
					value: 99.9,
					tags: ["critical"],
				},
			],
		},
	};

	try {
		const validResult = await client.callTool(validRequest);
		console.log("\n[Origin Execution Output]:");
		console.log(validResult.content[0].text);
	} catch (e) {
		console.error(
			"\n[Client Error] Valid Request failed structurally or DHT resolution timed out:",
			e,
		);
	}

	console.log("\n[Client] Shutting down P2P Mesh...");
	await client.close();
}

main().catch(console.error);
