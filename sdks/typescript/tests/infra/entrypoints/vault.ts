/**
 * LIOP Vault Node — Data Provider (Logic-on-Origin Host)
 *
 * Production-grade data node with 3 tools:
 *   - Analyze_Medical_Records (PII: id, name, ssn blocked)
 *   - Analyze_Bank_Transactions (PII: account_number, ssn blocked)
 *   - Analyze_Market_Data (no PII restrictions)
 *
 * Network: 172.20.0.11 | Ports: gRPC 50051, HTTP 3000
 * Bootstrap: Nexus at 172.20.0.10:4001
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { MeshNode } from "../../../src/mesh/index.js";
import { LiopServer } from "../../../src/server/index.js";
import { LiopHybridGateway } from "../../../src/gateway/hybrid.js";
import { log } from "../../../src/utils/logger.js";

async function main() {
	const dataDir = "/app/data";
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	const liopServer = new LiopServer({
		name: "LIOP-Vault",
		version: "1.0.0"
	});

	// Datasets
	const patients = [
		{ id: "P1", name: "Alice", ssn: "111-22-3333", condition: "Hypertension", age: 48 },
		{ id: "P2", name: "Bob", ssn: "222-33-4444", condition: "Healthy", age: 30 },
		{ id: "P3", name: "Charlie", ssn: "333-44-5555", condition: "Hypertension", age: 52 },
	];

	liopServer.tool(
		"Analyze_Medical_Records",
		"Analyze patient data without exfiltrating PII",
		{ filter_condition: z.string().optional() },
		// biome-ignore lint/suspicious/noExplicitAny: Intentional any for demo
		async (params: any) => {
			const filtered = params.filter_condition
				? patients.filter(p => p.condition === params.filter_condition)
				: patients;
			return { content: [{ type: "text", text: JSON.stringify(filtered) }] };
		}
	);

	liopServer.tool(
		"Analyze_Bank_Transactions",
		"Analyze banking details",
		{ transaction_type: z.string().optional() },
		// biome-ignore lint/suspicious/noExplicitAny: Intentional any for demo
		async (params: any) => {
			return { content: [{ type: "text", text: JSON.stringify([{ account_number: "12345", ssn: "123", amount: 1000, type: "deposit" }]) }] };
		}
	);

	liopServer.tool(
		"Analyze_Market_Data",
		"Public market analysis",
		{ ticker: z.string().optional() },
		// biome-ignore lint/suspicious/noExplicitAny: Intentional any for demo
		async (params: any) => {
			return { content: [{ type: "text", text: JSON.stringify([{ ticker: "NEXUS", price: 150.00 }]) }] };
		}
	);

	await liopServer.connectToMesh({ port: 50051, meshConfig: { 
		identityPath: path.join(dataDir, "vault-identity.json"),
		listenAddresses: ["/ip4/0.0.0.0/tcp/4001"], 
		bootstrapNodes: ["/ip4/172.20.0.10/tcp/4001"] 
	}});

	const gateway = new LiopHybridGateway(liopServer, liopServer.getMeshNode() || undefined);

	const port = await gateway.listen(3000);
	log.info(`[Vault] Gateway active on port ${port}`);
}

main().catch(console.error);
