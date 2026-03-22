import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { NmpHybridGateway } from "../gateway/hybrid.js";
import { NmpServer } from "../server/index.js";

/**
 * NmpStreamBridge Integration Test Suite.
 *
 * This suite now manages its own "The Vault" server instance automatically.
 */

// ... (interfaces existing)
interface ToolResult {
	content: Array<{ type: string; text: string }>;
	isError?: boolean;
}

const TOKEN = process.env.ZERO_TRUST_TOKEN || "test-token";
const BASE_URL = "http://localhost:3000/mcp";

/** Creates a fresh MCP client connected to The Vault via Streamable HTTP */
async function createRemoteClient(name: string): Promise<Client> {
	const transport = new StreamableHTTPClientTransport(new URL(BASE_URL), {
		requestInit: {
			headers: { Authorization: `Bearer ${TOKEN}` },
		},
	});
	const client = new Client(
		{ name, version: "1.0.0" },
		{ capabilities: { sampling: {} } },
	);
	await client.connect(transport);
	return client;
}

describe("NmpStreamBridge (Integration)", () => {
	let gateway: NmpHybridGateway;
	let server: NmpServer;

	beforeAll(async () => {
		// Initialize the Mock "The Vault" Server
		server = new NmpServer(
			{ name: "The Vault - Integration Test", version: "1.1.2" },
			{
				security: {
					forbiddenKeys: ["id", "name"],
					piiPatterns: [],
				},
			},
		);

		// Critical: Start gRPC server and Mesh Node (necessary for PQC handshake in the Router)
		await server.connectToMesh({ port: 50051 });

		// Seed with Industrial Records (Matching Demo requirements)
		server.setSandboxData([
			{ id: "P001", name: "Alice", age: 34, condition: "Hypertension" },
			{ id: "P005", name: "Eve", age: 62, condition: "Diabetes Type 2" },
		]);

		// Register the critical Audit Sandbox tool required by tests
		server.tool(
			"nmp_audit_sandbox",
			"Executes Logic-on-Origin",
			{ payload: z.string() },
			// This handler is only reached if boundaries are missing
			async () => ({
				content: [
					{ type: "text", text: "Error: Logic-on-Origin boundaries missing." },
				],
				isError: true,
			}),
		);

		// Initialize and Start the Hybrid Gateway (Port 3000)
		gateway = new NmpHybridGateway(server);
		await gateway.listen(3000, "127.0.0.1");
	});

	afterAll(async () => {
		if (gateway) await gateway.stop();
		if (server) await server.close();
	});

	it("should support 3 concurrent client sessions", async () => {
		const [client1, client2, client3] = await Promise.all([
			createRemoteClient("ConcurrentAgent-1"),
			createRemoteClient("ConcurrentAgent-2"),
			createRemoteClient("ConcurrentAgent-3"),
		]);

		const [r1, r2, r3] = await Promise.all([
			client1.listTools(),
			client2.listTools(),
			client3.listTools(),
		]);

		expect(r1.tools.length).toBeGreaterThan(0);
		expect(r2.tools.length).toBeGreaterThan(0);
		expect(r3.tools.length).toBeGreaterThan(0);
		expect(r1.tools[0].name).toBe(r2.tools[0].name);
		expect(r2.tools[0].name).toBe(r3.tools[0].name);

		await Promise.all([client1.close(), client2.close(), client3.close()]);
	});

	it("should discover tools via Streamable HTTP", async () => {
		const client = await createRemoteClient("DiscoveryAgent");
		const { tools } = await client.listTools();

		expect(tools.length).toBeGreaterThan(0);
		const auditTool = tools.find(t => t.name === "nmp_audit_sandbox");
		expect(auditTool).toBeDefined();
		expect(auditTool?.inputSchema?.properties?.payload).toBeDefined();

		await client.close();
	});

	it("should execute Logic-on-Origin Blind Computation with ZK-Receipt", async () => {
		const client = await createRemoteClient("ComputeAgent");

		const payload = `---BEGIN_LOGIC---
const totalPatients = env.records.length;
const avgAge = env.records.reduce((sum, r) => sum + r.age, 0) / totalPatients;
const conditions = {};
env.records.forEach(r => {
    conditions[r.condition] = (conditions[r.condition] || 0) + 1;
});
return { total_patients: totalPatients, average_age: Math.round(avgAge * 10) / 10, condition_distribution: conditions };
---END_LOGIC---`;

		const result = (await client.callTool({
			name: "nmp_audit_sandbox",
			arguments: { payload },
		})) as ToolResult;

		expect(result.content.length).toBeGreaterThan(0);
		expect(result.content[0].type).toBe("text");

		const data = JSON.parse(result.content[0].text);
		expect(data.computation_result).toBeDefined();
		expect(data.image_id).toBeDefined();
		expect(data.status).toBe("Worker Pool Execution Success");

		await client.close();
	});

	it("should BLOCK PII exfiltration attempts (Egress Security)", async () => {
		const client = await createRemoteClient("MaliciousAgent");

		const maliciousPayload = `---BEGIN_LOGIC---
return env.records.map(r => ({ id: r.id, name: r.name, age: r.age }));
---END_LOGIC---`;

		const result = (await client.callTool({
			name: "nmp_audit_sandbox",
			arguments: { payload: maliciousPayload },
		})) as ToolResult;

		const responseText = result.content[0].text;

		const isPiiBlocked =
			responseText.includes("Egress Security Violation") ||
			responseText.includes("PII") ||
			responseText.includes("Forbidden Key") ||
			result.isError === true;

		expect(isPiiBlocked).toBe(true);

		await client.close();
	});

	it("should BLOCK sandbox escape attempts via Guardian AST", async () => {
		const client = await createRemoteClient("EvilAgent");

		const dangerousPayload = `---BEGIN_LOGIC---
const fs = require('fs');
const data = fs.readFileSync('/etc/passwd', 'utf8');
return { stolen: data };
---END_LOGIC---`;

		const result = (await client.callTool({
			name: "nmp_audit_sandbox",
			arguments: { payload: dangerousPayload },
		})) as ToolResult;

		const responseText = result.content[0].text;

		const isBlocked =
			responseText.includes("Guardian") ||
			responseText.includes("blocked") ||
			responseText.includes("forbidden") ||
			responseText.includes("require") ||
			responseText.includes("Sandbox") ||
			result.isError === true;

		expect(isBlocked).toBe(true);

		await client.close();
	});

	it("should discover resources and prompts", async () => {
		const client = await createRemoteClient("DiscoveryAgent-2");

		const resources = await client.listResources();
		expect(resources.resources).toBeDefined();

		const prompts = await client.listPrompts();
		expect(prompts.prompts).toBeDefined();

		await client.close();
	});
});
