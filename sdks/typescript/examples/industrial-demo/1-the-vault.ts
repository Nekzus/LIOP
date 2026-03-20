import { z } from "zod";
import { NmpServer } from "../../src/server/index.js";

async function main() {
	console.log("==================================================");
	console.log("🛡️  THE VAULT: NMP Secure Data Server");
	console.log("==================================================");

	// 1. Initialize NMP Server with the Data Capability
	const server = new NmpServer({
		name: "the-vault",
		version: "1.0.0",
		capabilities: { tools: {} },
	});

	server.tool(
		"ProcessMedicalRecord",
		"Processes sensitive medical data blinded securely via NMP Zero-Trust WASM",
		{ patientId: z.string() },
		async (args) => {
			console.log(`\n[The Vault] ⚠️ Authorized Zero-Trust Execution Triggered`);
			console.log(
				`[The Vault] -> Processing DB Record for Patient: ${args.patientId}`,
			);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								status: "success",
								patientId: args.patientId,
								diagnoses: ["Hypertension", "Type 2 Diabetes"],
								lastVisit: "2026-03-01T10:00:00Z",
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
		const fs = await import("node:fs/promises");
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
	const fs = await import("node:fs/promises");
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
