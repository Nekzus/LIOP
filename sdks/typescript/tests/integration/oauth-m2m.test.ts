import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LiopClient } from "../../src/client/index.js";
import { LiopHybridGateway } from "../../src/gateway/hybrid.js";
import { LiopServer } from "../../src/server/index.js";
import { log } from "../../src/utils/logger.js";
import * as grpc from "@grpc/grpc-js";
import * as net from "node:net";

describe("OAuth 2.1 M2M End-to-End Integration", () => {
	let nexusServer: LiopServer;
	let nexusGateway: LiopHybridGateway;
	let nexusPort: number;

	let nodeServer: LiopServer;
	let nodePort: number;

	const CLIENT_ID = "liop-mesh-agent";
	const CLIENT_SECRET = "dev-secret-change-me";

	beforeEach(async () => {
		// Use a dynamic free port to avoid local environment and Windows EACCES/EADDRINUSE collisions
		nexusPort = await new Promise<number>((resolve, reject) => {
			const server = net.createServer();
			server.unref();
			server.on("error", reject);
			server.listen(0, "127.0.0.1", () => {
				const address = server.address();
				const port = typeof address === "string" ? 0 : address?.port || 0;
				server.close(() => resolve(port));
			});
		});
		const nexusIssuer = `http://localhost:${nexusPort}/oidc`;

		// 1. Start Nexus Node (Authorization Server)
		nexusServer = new LiopServer(
			{
				name: "Test-Nexus-AS",
				version: "1.0.0",
			},
			{
				auth: {
					role: "nexus",
					issuer: nexusIssuer,
					audience: "urn:liop:mesh:api",
					clients: [
						{
							client_id: CLIENT_ID,
							client_secret: CLIENT_SECRET,
							grant_types: ["client_credentials"],
							scope: "liop:tools:call liop:tools:list liop:resources:read liop:schema:read liop:mesh:query",
						},
					],
				},
			},
		);

		nexusGateway = new LiopHybridGateway(nexusServer);
		// Listen on the assigned dynamic port
		await nexusGateway.listen(nexusPort);

		// 2. Start Data Node (Resource Server)
		nodeServer = new LiopServer(
			{
				name: "Test-Data-RS",
				version: "1.0.0",
			},
			{
				auth: {
					role: "node",
					nexusUrl: nexusIssuer,
					audience: "urn:liop:mesh:api",
				},
			},
		);

		// Register a tool on the resource server
		nodeServer.tool(
			"compute_aggregate",
			"Aggregate computation",
			{ data: (await import("zod")).z.string() },
			async (args) => {
				return {
					content: [{ type: "text", text: `Computed: ${args.data}` }],
					isError: false,
				};
			},
		);

		// Listen on dynamic port (0 forces ephemeral port)
		await nodeServer.connectToMesh({ port: 0 });
		nodePort = nodeServer.getBoundPort() || 50051;
	});

	afterEach(async () => {
		if (nodeServer) {
			await nodeServer.close();
		}
		if (nexusGateway) {
			await nexusGateway.stop();
		}
	});

	it("should dynamically acquire token and successfully invoke remote node tool via gRPC", async () => {
		const client = new LiopClient();

		// Connect client directly to the data node using Nexus for M2M authentication
		await client.connect(`localhost:${nodePort}`, {
			auth: {
				clientId: CLIENT_ID,
				clientSecret: CLIENT_SECRET,
				nexusUrl: `http://localhost:${nexusPort}/oidc`,
				audience: "urn:liop:mesh:api",
			},
		});

		const payloadArgs = { data: "hello-world-m2m" };
		const wasmPayload = Buffer.from(
			`return { "__liop_proxy_tool": "compute_aggregate", "__liop_proxy_args": ${JSON.stringify(payloadArgs)} };`,
			"utf-8",
		);

		const result = await client.callTool(
			{
				name: "compute_aggregate",
				arguments: payloadArgs,
			},
			wasmPayload,
		);

		console.log("TEST RESULT DETAILS:", JSON.stringify(result, null, 2));
		expect(result.isError).toBe(false);
		expect(result.content[0].text).toContain("hello-world-m2m");
		await client.close();
	}, 15000);

	it("should fail gRPC execution if Client Credentials are invalid", async () => {
		const client = new LiopClient();

		// Connect client with wrong secret
		await client.connect(`localhost:${nodePort}`, {
			auth: {
				clientId: CLIENT_ID,
				clientSecret: "wrong-secret-value",
				nexusUrl: `http://localhost:${nexusPort}/oidc`,
				audience: "urn:liop:mesh:api",
			},
		});

		// Invoke tool should reject or throw because the token was not acquired
		await expect(
			client.callTool({
				name: "compute_aggregate",
				arguments: {
					payload: "blocked-payload",
				},
			})
		).rejects.toThrow();

		await client.close();
	}, 15000);
});
