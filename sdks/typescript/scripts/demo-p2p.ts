import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { MeshNode } from "../src/mesh/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IDENTITY_PATH = path.join(__dirname, "../test-identity.json");

async function runDemo() {
	console.log("--- NMP P2P MESH DEMO ---");

	// Clean up old identity for fresh start
	try {
		await fs.unlink(IDENTITY_PATH);
		console.log("Deleted old identity for fresh demo.\n");
	} catch (e) {}

	// STEP 1: First Start (Generate)
	console.log("Step 1: Starting fresh MeshNode...");
	const node1 = new MeshNode({
		identityPath: IDENTITY_PATH,
		listenAddresses: ["/ip4/127.0.0.1/tcp/0"],
	});

	await node1.start();
	const id1 = node1.getPeerId();
	console.log(`[Node 1] PeerID: ${id1}`);
	console.log(`[Node 1] Addresses: ${node1.getMultiaddrs().join(", ")}`);
	console.log("Stopping Node 1...\n");
	await node1.stop();

	// STEP 2: Second Start (Load)
	console.log("Step 2: Starting new MeshNode with same identity path...");
	const node2 = new MeshNode({
		identityPath: IDENTITY_PATH,
		listenAddresses: ["/ip4/127.0.0.1/tcp/0"],
	});

	await node2.start();
	const id2 = node2.getPeerId();
	console.log(`[Node 2] PeerID: ${id2}`);

	if (id1 === id2) {
		console.log("✅ SUCCESS: Identity is persistent and deterministic!");
	} else {
		console.log("❌ FAILED: Identity mismatch!");
	}

	// STEP 3: Discovery Test (Self)
	console.log("\nStep 3: DHT Self-Discovery Test...");
	const testHash = "sha256:fakesha256hashforcapabilitytest";
	console.log(`Announcing capability: ${testHash}`);
	await node2.announceCapability(testHash);

	console.log("Searching for providers (this might take a few seconds)...");
	// Wait a bit for DHT to settle locally
	await new Promise((resolve) => setTimeout(resolve, 2000));

	const providers = await node2.findProviders(testHash);
	console.log(`Found providers: ${providers.join(", ")}`);

	if (providers.includes(id2)) {
		console.log("✅ SUCCESS: Self-discovery via DHT verified!");
	} else {
		console.log(
			"⚠️  Self-discovery via DHT didn't return self (this is normal in some DHT configs for local lookups, but let's see).",
		);
	}

	console.log("\nStopping Node 2...");
	await node2.stop();
	console.log("--- DEMO COMPLETE ---");
}

runDemo().catch((err) => {
	console.error("Demo failed:", err);
	process.exit(1);
});
