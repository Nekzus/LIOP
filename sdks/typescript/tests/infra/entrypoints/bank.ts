/**
 * LIOP Bank Node — Financial Data Provider
 *
 * Simulates a sovereign bank in the mesh.
 * Provides tools to query account balances with PII shielding.
 *
 * Network: 172.20.0.12 | Ports: gRPC 50051, HTTP 3000
 * Bootstrap: Nexus at 172.20.0.10:4001
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { LiopServer } from "../../../src/server/index.js";
import { LiopHybridGateway } from "../../../src/gateway/hybrid.js";
import { log } from "../../../src/utils/logger.js";

async function main() {
	const dataDir = "/app/data";
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	const liopServer = new LiopServer({
		name: "SIMULATION-the-bank",
		version: "1.0.0"
	}, {
		taxonomy: {
			domain: "🏦 Banking & Finance (INDUSTRIAL DEMO)",
			clearanceTier: 3,
			executionTypes: ["Read-Only Queries", "Transactional Verification"],
		},
	});

	// Industrial Financial Dataset (Official Demo Data)
	const accounts = [
		{ id: "ACC-9901", accountHolder: "Elena Rodriguez", accountType: "Checking", balance: 12450.75, currency: "USD", transactions: [{ date: "2026-03-10", amount: -150.00, description: "ATM Withdrawal" }, { date: "2026-03-15", amount: 2500.00, description: "Payroll Deposit" }] },
		{ id: "ACC-2210", accountHolder: "Jameson Sterling", accountType: "Savings", balance: 85600.20, currency: "USD", transactions: [{ date: "2026-02-01", amount: 500.00, description: "Interest Credit" }] },
		{ id: "ACC-5541", accountHolder: "Aiko Tanaka", accountType: "Investment", balance: 342100.00, currency: "JPY", transactions: [{ date: "2026-03-20", amount: -50000.00, description: "Stock Purchase - NVDA" }] }
	];

	// Expose data dictionary for Zero-Trust LLM guidance
	liopServer.dataDictionary(
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
		"LIOP://schema/banking-ledger-synthetic",
	);
	liopServer.setSandboxData(accounts as unknown as Record<string, unknown>[]);
	const bankAggregatedOutputSchema = z
		.object({
			// Domain-specific keys
			totalAccounts: z.number().optional(),
			total_records: z.number().optional(),
			byType: z.record(z.union([z.number(), z.string()])).optional(),
			totalBalance: z.union([z.number(), z.string()]).optional(),
			balanceByCurrency: z.record(z.union([z.number(), z.string()])).optional(),
			columns: z.array(z.string()).optional(),
			accounts: z.array(z.string()).optional(),
			balances: z.array(z.union([z.number(), z.string()])).optional(),
			clientPayload: z.string().optional(),
			// Generic aggregation keys (LLMs generate these naturally)
			total: z.number().optional(),
			count: z.number().optional(),
			avg: z.union([z.number(), z.string()]).optional(),
			avgBalance: z.union([z.number(), z.string()]).optional(),
			sum: z.number().optional(),
			min: z.number().optional(),
			max: z.number().optional(),
			result: z.union([z.number(), z.string()]).optional(),
		})
		.strict();

	liopServer.tool(
		"Analyze_Synthetic_Bank_Transactions",
		"DISCLAIMER: This is a SIMULATION using SYNTHETIC data. Securely analyzes financial transactions and account balances via LIOP Logic-on-Origin for protocol demonstration.",
		{ payload: z.string() },
		// biome-ignore lint/suspicious/noExplicitAny: Intentional for demo
		async (_params) => {
			return {
				content: [
					{
						type: "text",
						text: "[LIOP] Security Enforcement: Legacy Plain-Tool execution is BLOCKED. Banking data requires secure Logic-on-Origin processing. Wrap your JS logic in the LIOPv1 Envelope to continue.",
					},
				],
				isError: true,
			};
		},
		{
			enforceAggregationFirst: true,
			outputSchema: bankAggregatedOutputSchema,
		},
	);

	await liopServer.connectToMesh({ port: 50051, meshConfig: { 
		identityPath: path.join(dataDir, "bank-identity.json"),
		listenAddresses: ["/ip4/0.0.0.0/tcp/4000"], 
		bootstrapNodes: ["/ip4/172.20.0.10/tcp/4000"] 
	}});

	const meshNode = liopServer.getMeshNode();
	if (!meshNode) throw new Error("Failed to initialize MeshNode");

	// Active Manifesto Announcement (Fase 100 Requirement)
	if (meshNode) {
		await meshNode.announceCapability("liop:manifest");
	}

	const gateway = new LiopHybridGateway(liopServer, meshNode, 50051);

	const port = await gateway.listen(3000);
	log.info(`[The Bank] Gateway active on port ${port}`);

	// Export Industrial Beacon for Host Discovery (Local Dev Pattern)
	if (meshNode) {
		const peerId = meshNode.getPeerId();
		const p2pAddr = `/ip4/127.0.0.1/tcp/13004/p2p/${peerId}`;
		fs.writeFileSync(path.join(dataDir, "bank.multiaddr"), p2pAddr);
		log.info(`[Bank] 🏦 Industrial Beacon exported: ${p2pAddr}`);
	}

	const shutdown = async () => {
		log.info("[Bank] Shutdown signal received. Closing servers...");
		await gateway.stop();
		process.exit(0);
	};

	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);

	// Periodic Manifest Refresh
	setInterval(async () => {
		try {
			await gateway.getRouter().refreshManifestCache(true);
		} catch (e) {
			/* ignore */
		}
	}, 15000);
}

main().catch(console.error);
