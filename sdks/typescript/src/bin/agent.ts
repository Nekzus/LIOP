#!/usr/bin/env node
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { NmpMcpRouter } from "../gateway/router.js";
import { MeshNode } from "../mesh/index.js";
import { NmpServer } from "../server/index.js";

/**
 * NMP Agent (Zero-Config CLI)
 *
 * Secure Logic-on-Origin gateway for Claude Desktop.
 * Communicates via STDIO / JSON-RPC.
 */
async function main() {
	const nmpDir = path.join(os.homedir(), ".nmp");
	const identityPath = path.join(nmpDir, "identity.json");

	if (!fs.existsSync(nmpDir)) {
		fs.mkdirSync(nmpDir, { recursive: true });
	}

	// 1. Determine Bootstrap Nodes
	let bootstrapNodes: string[] = [];

	// Command line arguments take precedence
	const args = process.argv.slice(2);
	if (args.length > 0) {
		bootstrapNodes = args.filter((a) => a.startsWith("/"));
	}

	// Convenience: Try to read nexus.multiaddr if in workspace
	if (bootstrapNodes.length === 0) {
		try {
			const nexusPath = path.join(process.cwd(), "nexus.multiaddr");
			if (fs.existsSync(nexusPath)) {
				const addr = fs.readFileSync(nexusPath, "utf8").trim();
				if (addr) bootstrapNodes.push(addr);
			}
		} catch (_e) {
			/* ignore */
		}
	}

	// Default Fallback (Industrial Demo Nexus)
	if (bootstrapNodes.length === 0) {
		bootstrapNodes.push(
			"/ip4/127.0.0.1/tcp/4001/p2p/12D3KooWEZ3Jy2tu65g5ZGVq1t3TrzKnrqhbvfCmMgdA9cNAEiKY",
		);
	}

	// Initialize local server node
	const nmpServer = new NmpServer({
		name: "@nekzus/nmp-agent",
		version: "1.1.2",
	});

	// 2. Mesh Node Configuration
	const meshNode = new MeshNode({
		identityPath: identityPath,
		bootstrapNodes: bootstrapNodes,
	});

	// Start P2P Mesh
	await meshNode.start();

	// Initialize the shared Router
	// For Alpha Demo, we explicitly expose the industrial capabilities we expect in the mesh
	const router = new NmpMcpRouter(nmpServer, meshNode, 50051, [
		{
			name: "ProcessMedicalRecord",
			description:
				"Processes sensitive medical data blinded securely via NMP Zero-Trust WASM (Hosted on The Vault)",
			inputSchema: {
				type: "object",
				properties: {
					patientId: {
						type: "string",
						description: "The ID of the patient (e.g., NMP-99)",
					},
				},
				required: ["patientId"],
			},
		},
		{
			name: "CheckBalance",
			description:
				"Securely checks the bank account balance without exposing PII (Hosted on The Bank)",
			inputSchema: {
				type: "object",
				properties: { accountId: { type: "string" } },
				required: ["accountId"],
			},
		},
		{
			name: "GetStockPrice",
			description:
				"Fetches the real-time stock price for a given ticker symbol (Hosted on The Oracle)",
			inputSchema: {
				type: "object",
				properties: { ticker: { type: "string" } },
				required: ["ticker"],
			},
		},
	]);

	// 3. STDIO Transport implementation
	process.stdin.on("data", async (data) => {
		const payload = data.toString().trim();
		if (!payload) return;

		const messages = payload.split("\n");

		for (const msg of messages) {
			try {
				const request = JSON.parse(msg);
				if (request.method) {
					const response = await router.dispatch(request);
					if (response) {
						process.stdout.write(`${JSON.stringify(response)}\n`);
					}
				}
			} catch (_err) {
				// Silent catch for binary noise
			}
		}
	});

	// Status directed only to stderr
	console.error(`[NMP-Agent] 🛡️ Guarding Claude Desktop via STDIO.`);
	console.error(
		`[NMP-Agent] 🌐 P2P Mesh: Joined (${bootstrapNodes.length} bootstraps)`,
	);

	process.on("SIGINT", async () => {
		await meshNode.stop();
		process.exit(0);
	});
}

main().catch((err) => {
	console.error(`[NMP-Agent] 🚨 Fatal Error: ${err.message}`);
	process.exit(1);
});
