import * as fs from "node:fs/promises";
import { z } from "zod";
import { LiopServer } from "../../src/server/index.js";

async function main() {
	console.log("==================================================");
	console.log("🛡️  THE VAULT: LIOP Secure Data Server");
	console.log("==================================================");

	// 1. Initialize LIOP Server with the Data Capability
	const server = new LiopServer(
		{
			name: "SIMULATION-the-vault",
			version: "1.0.0",
			capabilities: { tools: {} },
		},
		{
			taxonomy: {
				domain: "🏥 Healthcare (SIMULATED)",
				clearanceTier: 5,
				executionTypes: ["Blind AST Logic", "Zero-Trust Worker Pool"],
			},
		},
	);

	// Load realistic data
	const recordsData = await fs.readFile(
		new URL("./data/vault_records.json", import.meta.url),
		"utf-8",
	);
	const records = JSON.parse(recordsData);
	server.setSandboxData(records);

	// Expose data dictionary for Zero-Trust LLM guidance
	server.dataDictionary(
		{
			type: "array",
			items: {
				type: "object",
				properties: {
					id: { type: "string", description: "Patient Unique ID (PAT-XXXX)" },
					name: { type: "string" },
					age: { type: "number" },
					bloodType: { type: "string" },
					diagnosis: { type: "string" },
					lastVisit: { type: "string", format: "date" },
					medications: { type: "array", items: { type: "string" } },
				},
			},
		},
		"Medical Records Schema (SYNTHETIC)",
		"LIOP://schema/medical-records-synthetic",
	);

	server.tool(
		"Analyze_Synthetic_Medical_Records",
		"DISCLAIMER: This is a SIMULATION using SYNTHETIC data. Performs secure Logic-on-Origin processing on the medical records dataset for protocol demonstration.",
		{ payload: z.string() },
		async (args) => {
			console.log(`\n[The Vault] ⚠️ Authorized Zero-Trust Execution Triggered`);
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
		console.log(`[The Vault] Discovered Nexus at ${addr.trim()}`);
	} catch (_e) {
		console.warn("[The Vault] No nexus.multiaddr found. Starting isolated.");
	}

	// 2. Connect to the P2P Mesh and start the gRPC Server
	await server.connectToMesh({
		port: 50051,
		meshConfig: {
			listenAddresses: ["/ip4/0.0.0.0/tcp/4061", "/ip4/0.0.0.0/tcp/4062/ws"],
			identityPath: "vault-identity.json",
			bootstrapNodes,
		},
	});

	const meshNode = server.getMeshNode();
	if (!meshNode) throw new Error("Mesh node failed to initialize");

	console.log(`[The Vault] 🌐 Connected to Zero-Trust Mesh`);
	console.log(`[The Vault] 🆔 PeerID: ${meshNode.getPeerId()}`);

	// Tools are auto-announced to DHT by connectToMesh()

	// 5. Write the actual multiaddr to a file for Sentinel/Agent to bootstrap
	const multiaddrs = meshNode.getMultiaddrs();
	// Prefer IPv4 TCP / 127.0.0.1 for local testing
	const p2pAddr =
		multiaddrs.find((a) => a.includes("/ip4/127.0.0.1/tcp/")) || multiaddrs[0];
	await fs.writeFile("vault.multiaddr", p2pAddr);

	console.log(
		`[The Vault] 🚀 Ready and protecting Data. Waiting for Sentinel requests...`,
	);

	process.on("SIGINT", async () => {
		console.log("\n[The Vault] Shutting down...");
		await fs.unlink("vault.multiaddr").catch(() => {});
		await server.close();
		process.exit(0);
	});
}

main().catch(console.error);
