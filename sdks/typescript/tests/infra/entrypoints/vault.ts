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
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { LiopServer } from "../../../src/server/index.js";
import { LiopHybridGateway } from "../../../src/gateway/hybrid.js";
import { log } from "../../../src/utils/logger.js";
import { generateMedicalDataset } from "../utils/datasetGenerator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
	const dataDir = "/app/data";
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	const liopServer = new LiopServer(
		{
			name: "SIMULATION-the-vault",
			version: "1.0.0",
		},
		{
			tokenSlug: "VAULT",
			auth: {
				role: "node",
				revocationPath: path.join(dataDir, "vault-revocations.json"),
				localTestToken: "vault-local-test-token",
			},
			taxonomy: {
				domain: "🏥 Healthcare (INDUSTRIAL DEMO)",
				clearanceTier: 5,
				executionTypes: ["Blind AST Logic", "Zero-Trust Worker Pool"],
			},
			budgetStorePath: path.join(dataDir, "query-budgets.json"),
		},
	);

	// Industrial Healthcare Dataset (Scale-Aware Generator)
	const scaleEnv = process.env.LIOP_DATASET_SCALE;
	const scale = scaleEnv ? Number.parseInt(scaleEnv, 10) : 1;
	const patients = generateMedicalDataset(Number.isNaN(scale) ? 1 : scale);


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
	const medicalAggregatedOutputSchema = z
		.object({
			// Domain-specific keys (may accept strings)
			totalPatients: z.number().optional(),
			hypertensionCount: z.number().optional(),
			percentage: z.union([z.number(), z.string()]).optional(),
			averageAge: z.union([z.number(), z.string()]).optional(),
			avgAge: z.union([z.number(), z.string()]).optional(),
			clientPayload: z.string().optional(),
		})
		// Dynamic aggregation keys (e.g., diagnosis names, age buckets).
		// Security note: .catchall() is a STRUCTURAL choice, not a security boundary.
		// Defense-in-depth: PII Scanner (Layer 3) blocks names/IDs/emails,
		// Aggregation-First (Layer 4) blocks arrays of objects.
		.catchall(z.number());

	liopServer.tool(
		"Analyze_Synthetic_Medical_Records",
		"DISCLAIMER: This is a SIMULATION using SYNTHETIC data. Performs secure Logic-on-Origin processing on the medical records dataset for protocol demonstration.",
		{ payload: z.string() },
		// biome-ignore lint/suspicious/noExplicitAny: Intentional any for demo
		async (_params) => {
			return {
				content: [
					{
						type: "text",
						text: "[LIOP] Security Enforcement: Legacy Plain-Tool execution is BLOCKED on this node. You MUST use the Compact Envelope (@LIOP) to trigger the secure Zero-Trust WASI sandbox for medical record analysis.",
					},
				],
				isError: true,
			};
		},
		{
			enforceAggregationFirst: true,
			outputSchema: medicalAggregatedOutputSchema,
			// Phase 110: HIPAA Expert Determination Privacy Profile
			// Apple Health uses ε=2.0 on millions of records. Using ε<1.0 on
			// a 5-record dataset destroys utility (NIST SP 800-226 §4.3).
			// The engine automatically derives per-field sensitivity
			// (count→1, avg→sensitivity/n, sum→configured value).
			dpEpsilon: 2.0,
			dpSensitivity: 1.0, 
			sensitiveKeys: ["diagnosis", "bloodType"],
		},
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
