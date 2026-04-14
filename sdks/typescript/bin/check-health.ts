import * as net from "node:net";
import { LiopClient } from "../src/client/index.js";

async function checkTcp(host: string, port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = new net.Socket();
		socket.setTimeout(2000);
		socket.on("connect", () => {
			socket.destroy();
			resolve(true);
		});
		socket.on("error", () => {
			socket.destroy();
			resolve(false);
		});
		socket.on("timeout", () => {
			socket.destroy();
			resolve(false);
		});
		socket.connect(port, host);
	});
}

async function runDiagnostics(): Promise<void> {
	console.log("==================================================");
	console.log("LIOP MESH PROTOCOL - NODE HEALTH CHECK");
	console.log("==================================================");

	const nodes: Array<{
		name: string;
		host: string;
		ports: number[];
		grpc?: number;
	}> = [
		{ name: "Nexus (DHT Boot)", host: "127.0.0.1", ports: [13000, 13001] },
		{
			name: "Vault (Provider)",
			host: "127.0.0.1",
			ports: [13013, 13003, 13011],
			grpc: 13011,
		},
		{
			name: "Bank (Provider)",
			host: "127.0.0.1",
			ports: [13014, 13004, 13021],
			grpc: 13021,
		},
		{
			name: "Oracle (Provider)",
			host: "127.0.0.1",
			ports: [13015, 13005, 13031],
			grpc: 13031,
		},
	];

	for (const node of nodes) {
		console.log(`\nChecking Node: ${node.name}`);
		for (const port of node.ports) {
			const isUp = await checkTcp(node.host, port);
			const label = port === node.grpc ? "(gRPC Endpoint)" : "(P2P/HTTP)";
			console.log(`  - Port ${port} ${label}: ${isUp ? "OPEN" : "CLOSED"}`);
		}

		if (node.grpc) {
			try {
				console.log(`  - Testing LIOP Protocol Handshake on :${node.grpc}...`);
				const client = new LiopClient();

				// We use a static connection for diagnostic bypass
				await client.connect(`localhost:${node.grpc}`);

				// Note: We don't call a real tool here to avoid side effects;
				// connect/init is enough for L7 health.
				console.log("  - Protocol L7 Status: RESPONDING");
				await client.close();
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
				console.log(`  - Protocol L7 Status: FAILED (${message})`);
			}
		}
	}
	console.log("\n==================================================");
	console.log("Diagnostics complete.");
}

runDiagnostics().catch(console.error);
