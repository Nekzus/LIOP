import { z } from "zod";
import { NmpHybridGateway } from "../src/gateway/hybrid.js";
import { NmpServer } from "../src/server/index.js";

async function main() {
	const theVaultServer = new NmpServer(
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
		"nmp_audit_sandbox",
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

	const hybridGateway = new NmpHybridGateway(theVaultServer, {
		rpcPort: RPC_PORT,
	});
	await hybridGateway.listen(3000, "0.0.0.0");
	console.log(
		`[VAULT-SERVER] NMP Unified Mock Server READY (forbiddenKeys: id, name).`,
	);
}

main().catch(console.error);
