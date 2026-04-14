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
		name: "SIMULATION-the-vault",
		version: "1.0.0"
	}, {
		taxonomy: {
			domain: "🏥 Healthcare (INDUSTRIAL DEMO)",
			clearanceTier: 5,
			executionTypes: ["Blind AST Logic", "Zero-Trust Worker Pool"],
		},
	});

	// Industrial Healthcare Dataset + Elena Rodriguez
	const patients = [
		{ id: "PAT-7721", name: "Evelyn Reed", age: 42, bloodType: "O+", diagnosis: "Hypertension", lastVisit: "2026-01-15", medications: ["Lisinopril", "Amlodipine"] },
		{ id: "PAT-1092", name: "Marcus Thorne", age: 58, bloodType: "A-", diagnosis: "Type 2 Diabetes", lastVisit: "2026-02-20", medications: ["Metformin", "Glipizide"] },
		{ id: "PAT-4432", name: "Sarah Chen", age: 29, bloodType: "B+", diagnosis: "Acute Bronchitis", lastVisit: "2026-03-05", medications: ["Albuterol", "Amoxicillin"] },
		{ id: "PAT-8819", name: "Julian Vane", age: 65, bloodType: "AB+", diagnosis: "Osteoarthritis", lastVisit: "2025-12-10", medications: ["Celecoxib", "Glucosamine"] },
		{ id: "PAT-9901", name: "Elena Rodriguez", age: 35, bloodType: "O-", diagnosis: "Hypertension", lastVisit: "2026-03-25", medications: ["Metoprolol"] }
	];

	// Expose data dictionary for Zero-Trust LLM guidance
	liopServer.dataDictionary(
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

	// Dataset available to Logic-on-Origin runtime as env.records.
	liopServer.setSandboxData(patients as unknown as Record<string, unknown>[]);

	liopServer.tool(
		"Analyze_Synthetic_Medical_Records",
		"Securely analyzes the medical records dataset for protocol demonstration. Requires LIOP envelope payload and runs in Logic-on-Origin sandbox.",
		{ payload: z.string().describe("LIOP v1 envelope payload for sandboxed analysis over env.records") },
		// biome-ignore lint/suspicious/noExplicitAny: Intentional any for demo
		async (params: any) => {
			log.info(`[Vault] Industrial Logic Triggered via LIOP envelope`);
			// The SDK payload middleware executes the envelope in sandbox.
			// Returning a placeholder here keeps type contract explicit.
			return { content: [{ type: "text", text: JSON.stringify({ status: "delegated_to_liop_runtime" }) }] };
		}
	);

	await liopServer.connectToMesh({ port: 50051, meshConfig: { 
		identityPath: path.join(dataDir, "vault-identity.json"),
		listenAddresses: ["/ip4/0.0.0.0/tcp/4000"], 
		bootstrapNodes: ["/ip4/172.20.0.10/tcp/4000"] 
	}});

	const gateway = new LiopHybridGateway(liopServer, liopServer.getMeshNode() || undefined);

	// Active Manifesto Announcement (Fase 100 Requirement)
	const meshNode = liopServer.getMeshNode();
	if (meshNode) {
		await meshNode.announceCapability("liop:manifest");
	}

	const port = await gateway.listen(3000);
	log.info(`[The Vault] Gateway active on port ${port}`);

	// Export Industrial Beacon for Host Discovery (Local Dev Pattern)
	if (meshNode) {
		const peerId = meshNode.getPeerId();
		const p2pAddr = `/ip4/127.0.0.1/tcp/13003/p2p/${peerId}`;
		fs.writeFileSync(path.join(dataDir, "vault.multiaddr"), p2pAddr);
		log.info(`[Vault] 🛡️ Industrial Beacon exported: ${p2pAddr}`);
	}

	const shutdown = async () => {
		log.info("[Vault] Shutdown signal received. Closing servers...");
		await gateway.stop();
		process.exit(0);
	};

	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);
}

main().catch(console.error);
