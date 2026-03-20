import * as fs from "node:fs/promises";
import { z } from "zod";
import { NmpServer } from "../../src/server/index.js";

async function main() {
	console.log("==================================================");
	console.log("🏦  THE BANK: NMP Secure Financial Server");
	console.log("==================================================");

	const server = new NmpServer({
		name: "the-bank",
		version: "1.0.0",
		capabilities: { tools: {} },
	});

	server.tool(
		"CheckBalance",
		"Securely checks the bank account balance without exposing PII.",
		{ accountId: z.string() },
		async (args) => {
			console.log(
				`\n[The Bank] 💸 Zero-Trust Execution Triggered for CheckBalance`,
			);
			console.log(
				`[The Bank] -> Processing Ledger for Account: ${args.accountId}`,
			);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								status: "success",
								accountId: args.accountId,
								balance: "$14,500.00",
								currency: "USD",
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
		console.log(`[The Bank] Discovered Nexus at ${addr.trim()}`);
	} catch (e) {
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
