// MCP Bridge for "The Vault" - Execution from Cursor/Claude Desktop
import { NmpMcpBridge } from "@nekzus/liop/bridge";
import { LiopHybridGateway } from "@nekzus/liop/gateway";
import { theVaultServer } from "./server-node.js";

async function main() {
	console.error("==================================================");
	console.error(">>> NMP HYBRID TRANSFORMER GATEWAY (Alpha) <<<");
	console.error("==================================================");
	console.error("The Vault is ready via Protocol Transcoding (JSON <-> gRPC).");

	// NmpMcpBridge wraps The Vault and brings up the JSON-RPC protocol over stdio for local IDEs
	const stdioBridge = new NmpMcpBridge(theVaultServer);

	// LiopHybridGateway provides the single-port multiplexer for HTTP/MCP and gRPC/NMP
	const hybridGateway = new LiopHybridGateway(theVaultServer);

	// Start Hybrid Gateway (Network)
	const serverPromise = hybridGateway.listen(3000, '::');

	// Start Stdio Bridge (Local IDEs)
	const stdioPromise = stdioBridge.connect().catch(err => {
		console.error("[NMP-Bridge] Stdio Bridge error:", err);
	});

	await serverPromise; // Wait for the gateway to be ready
	console.error(
		">>> HYBRID GATEWAY ACTIVE. Serving JSON-RPC and gRPC with PQC-Shielding...",
	);
}

main().catch((err) => {
	console.error("Fatal Error in MCP Bridge:", err);
	process.exit(1);
});
