import { z } from "zod";
import { LiopHybridGateway } from "../src/gateway/hybrid.js";
import { LiopServer } from "../src/server/index.js";

async function main() {
	const theVaultServer = new LiopServer(
		{
			name: "The Vault",
			version: "1.1.0",
		},
		{
			// Enable PII egress protection — the PiiScanner will block these keys in output
			security: {
				forbiddenKeys: ["id", "name"],
			},
		},
	);

	theVaultServer.setSandboxData([
		{ id: "P001", name: "Alice", age: 65, condition: "Hypertension" },
		{ id: "P002", name: "Bob", age: 55, condition: "Hypertension" },
		{ id: "P003", name: "Charlie", age: 40, condition: "Healthy" },
		{ id: "P004", name: "Dave", age: 80, condition: "Hypertension" },
		{ id: "P005", name: "Eve", age: 99, condition: "Hypertension" },
	]);

	const RPC_PORT = 50051;
	await theVaultServer.connectToMesh({ port: RPC_PORT });

	// Primary tool for stream.test.ts
	theVaultServer.tool(
		"LIOP_audit_sandbox",
		"Audits the sandbox environment",
		{ payload: z.string() },
		async (_args) => {
			return {
				content: [
					{
						type: "text",
						text: "Computation successful. Records processed: 5",
					},
				],
			};
		},
	);

	// Secondary tool for client/index.test.ts
	theVaultServer.tool(
		"read_logs",
		"Reads system logs",
		{ payload: z.string() },
		async (_args) => {
			return { content: [{ type: "text", text: "Log data summary" }] };
		},
	);

	const hybridGateway = new LiopHybridGateway(theVaultServer, null, RPC_PORT);
	await hybridGateway.listen(3000, "0.0.0.0");
	console.log(
		`\n[VAULT-SERVER] 🚀 LIOP Industrial Mesh Server is ONLINE.`,
	);
	console.log(
		`[VAULT-SERVER] --> gRPC Mesh Node: http://localhost:${RPC_PORT}`,
	);
	console.log(
		`[VAULT-SERVER] --> Hybrid Gateway (MCP): http://localhost:3000/mcp\n`,
	);
}

main().catch((err) => {
	console.error(`[VAULT-SERVER] FATAL ERROR during startup: ${err.message}`);
	process.exit(1);
});
