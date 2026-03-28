// "The Nexus" - NMP Infrastructure Bootnode
import { MeshNode } from "@nekzus/liop/mesh";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The Nexus acts as a stable entry point for the mesh.
 * It doesn't host data; it only maintains the Kademlia DHT.
 */
async function main() {
    console.error(chalk.cyan("\n🌌 [NMP-NEXUS] Initializing Neural Infrastructure..."));

    // Static identity for the bootnode (In a real scenario, this would be a persistent key)
    const nexusNode = new MeshNode({
        listenAddresses: ["/ip4/0.0.0.0/tcp/4001"],
    });

    await nexusNode.start();

    const peerId = nexusNode.getPeerId().toString();
    const multiaddrs = nexusNode.getMultiaddrs().map(ma => ma.toString());

    // We prefer the tcp address for the manifest if available
    const tcpAddr = multiaddrs.find(a => a.includes("/tcp/") && !a.includes("/ws")) || multiaddrs[0];
    const nexusMultiaddr = `${tcpAddr}/p2p/${peerId}`;

    // Persist manifest for Bastion and Sentinel discovery
    const manifestPath = path.resolve(__dirname, "..", "mesh-manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify({ nexus: nexusMultiaddr }, null, 2));

    console.error(chalk.green("✅ [Nexus] Infrastructure is online."));
    console.error(chalk.cyan(`🔹 PeerID: ${peerId}`));
    console.error(chalk.cyan(`🔹 Manifest saved: ${manifestPath}`));
    console.error(chalk.gray(`🔹 Nexus Address: ${nexusMultiaddr}`));

    console.error(chalk.yellow("\n[Status] Waiting for Bastion and Sentinel nodes to connect...\n"));

    // Keep active
    setInterval(() => { }, 1000 * 60 * 60);
}

main().catch(err => {
    console.error(chalk.red(`❌ [Nexus] Critical Failure: ${err.message}`));
    process.exit(1);
});
