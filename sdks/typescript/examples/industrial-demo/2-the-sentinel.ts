import { peerIdFromString } from "@libp2p/peer-id";
import { NmpHybridGateway } from "../../src/gateway/hybrid.js";
import { NmpServer } from "../../src/server/index.js";

async function main() {
	console.log("==================================================");
	console.log("👁️   THE SENTINEL: NMP Hybrid L4/L7 Gateway");
	console.log("==================================================");

	// 1. Initialize an empty Data Server (The Sentinel doesn't hold data)
	const emptyServer = new NmpServer({
		name: "the-sentinel",
		version: "1.0.0",
		capabilities: { tools: {} }, // Intentionally empty local tools
	});

	// 2. We assume we know The Vault's listen address for bootstrap
	// Read the dynamically generated PeerID from The Vault
	const fs = await import("fs/promises");
	let vaultMultiaddr = "";
	try {
		vaultMultiaddr = (await fs.readFile("vault.multiaddr", "utf-8")).trim();
		console.log(
			`[The Sentinel] 📎 Read Vault Bootstrap Address: ${vaultMultiaddr}`,
		);
	} catch (e) {
		console.error("🚨 Error: Start '1-the-vault.ts' first!");
		process.exit(1);
	}

	// Create Gateway with P2P Mesh configuration
	const gateway = new NmpHybridGateway(emptyServer, {
		meshConfig: {
			listenAddresses: ["/ip4/0.0.0.0/tcp/4063", "/ip4/0.0.0.0/tcp/4064/ws"],
			identityPath: "sentinel-identity.json",
			bootstrapNodes: [vaultMultiaddr],
		},
	});

	console.log(
		`[The Sentinel] 🌐 Joining Zero-Trust Mesh targeting Vault Bootstrap...`,
	);

	// 3. Start proxy listening on HTTP port 3000
	await gateway.listen(3000);

	console.log(
		`[The Sentinel] 🚀 Transformer gateway running on http://localhost:3000/mcp`,
	);
	console.log(
		`[The Sentinel] Ready to transcode JSON-RPC (MCP) to PQC gRPC (NMP).`,
	);

	process.on("SIGINT", async () => {
		console.log("\n[The Sentinel] Shutting down...");
		await gateway.stop();
		process.exit(0);
	});
}

main().catch(console.error);
