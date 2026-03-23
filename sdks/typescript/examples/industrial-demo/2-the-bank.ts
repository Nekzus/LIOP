import * as fs from "node:fs/promises";
import { z } from "zod";
import { NmpServer } from "../../src/server/index.js";

async function main() {
	console.log("==================================================");
	console.log("🏦  THE BANK: NMP Secure Financial Server");
	console.log("==================================================");

	const server = new NmpServer(
		{
			name: "SIMULATION-the-bank",
			version: "1.0.0",
			capabilities: { tools: {} },
		},
		{
			taxonomy: {
				domain: "🏦 Banking & Finance (SIMULATED)",
				clearanceTier: 3,
				executionTypes: ["Read-Only Queries", "Transactional Verification"],
			},
		},
	);

	// Load realistic data
	const bankData = await fs.readFile(
		new URL("./data/bank_transactions.json", import.meta.url),
		"utf-8",
	);
	const accounts = JSON.parse(bankData);
	server.setSandboxData(accounts);

	// Expose data dictionary for Zero-Trust LLM guidance
	server.dataDictionary(
		{
			type: "array",
			items: {
				type: "object",
				properties: {
					id: { type: "string", description: "Account Unique ID (ACC-XXXX)" },
					accountHolder: { type: "string" },
					accountType: { type: "string" },
					balance: { type: "number" },
					currency: { type: "string" },
					transactions: {
						type: "array",
						items: {
							type: "object",
							properties: {
								date: { type: "string", format: "date" },
								amount: { type: "number" },
								description: { type: "string" },
							},
						},
					},
				},
			},
		},
		"Banking Ledger Schema (SYNTHETIC)",
		"nmp://schema/banking-ledger-synthetic",
	);

	server.tool(
		"Analyze_Synthetic_Bank_Transactions",
		"DISCLAIMER: This is a SIMULATION using SYNTHETIC data. Securely analyzes financial transactions and account balances via NMP Logic-on-Origin for protocol demonstration.",
		{ payload: z.string() },
		async (args) => {
			console.log(
				`\n[The Bank] 💸 Zero-Trust Execution Triggered for AnalyzeTransactions`,
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
		console.log(`[The Bank] Discovered Nexus at ${addr.trim()}`);
	} catch (_e) {
		console.warn("[The Bank] No nexus.multiaddr found. Starting isolated.");
	}

	await server.connectToMesh({
		port: 50052,
		meshConfig: {
			listenAddresses: ["/ip4/0.0.0.0/tcp/4063", "/ip4/0.0.0.0/tcp/4064/ws"],
			identityPath: "bank-identity.json",
			bootstrapNodes,
		},
	});

	const meshNode = server.getMeshNode();
	console.log(`[The Bank] 🌐 Connected to Zero-Trust Mesh`);
	console.log(`[The Bank] 🆔 PeerID: ${meshNode?.getPeerId()}`);
	console.log(`[The Bank] 🚀 Ready and protecting Financial Data...`);

	process.on("SIGINT", async () => {
		console.log("\n[The Bank] Shutting down...");
		await server.close();
		process.exit(0);
	});
}

main().catch(console.error);
