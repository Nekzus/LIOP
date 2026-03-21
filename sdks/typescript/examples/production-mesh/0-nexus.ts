import { MeshNode } from "@nekzus/neural-mesh";

/**
 * THE NEXUS (Bootstrap Node)
 * 
 * Este nodo actúa como el punto de encuentro descentralizado para la malla Alpha.
 * No provee datos, solo facilita el descubrimiento DHT (Kademlia).
 */
async function startNexus() {
	console.log("🌌 [Nexus] Iniciando Punto de Encuentro Ancestral...");

	const nexus = new MeshNode({
		identityPath: "./nexus-identity.json",
		listenAddresses: ["/ip4/0.0.0.0/tcp/4001"],
	});

	await nexus.start();

	console.log("✅ [Nexus] Malla activa y escuchando en puerto 4001.");
	const multiaddr = `/ip4/127.0.0.1/tcp/4001/p2p/${nexus.getPeerId()}`;
	console.log(`🔗 [Nexus] PeerID: ${nexus.getPeerId()}`);
	console.log(`🔗 [Nexus] Multiaddr: ${multiaddr}`);

	// Escribir el Multiaddr al archivo local para Auto-Descubrimiento
	const fs = await import("node:fs/promises");
	await fs.writeFile("nexus.multiaddr", multiaddr, "utf-8");
	console.log("📄 [Nexus] Multiaddr guardado en 'nexus.multiaddr' para el Agente.");
}

startNexus().catch(console.error);
