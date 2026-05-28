import * as fs from "node:fs";
import * as path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LiopClient } from "../../src/client/index.js";
import { LiopServer } from "../../src/server/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Static Token Coexistence and Local Revocation Integration", () => {
	const tempDir = path.resolve(__dirname, "temp-integration-test");
	const bankRevocationPath = path.join(tempDir, "bank-revocations.json");
	const vaultRevocationPath = path.join(tempDir, "vault-revocations.json");

	let bankServer: LiopServer;
	let vaultServer: LiopServer;
	let oracleServer: LiopServer;

	let bankPort: number;
	let vaultPort: number;
	let oraclePort: number;

	beforeEach(async () => {
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}

		// 1. Bank Node (Restricted, revocation list + local test token)
		bankServer = new LiopServer(
			{ name: "test-bank", version: "1.0.0" },
			{
				auth: {
					role: "node",
					revocationPath: bankRevocationPath,
					localTestToken: "bank-local-test-token",
				},
			},
		);
		bankServer.tool(
			"bank_tool",
			"Query bank transactions",
			{ data: (await import("zod")).z.string() },
			async (args) => {
				return {
					content: [{ type: "text", text: `Bank Success: ${args.data}` }],
					isError: false,
				};
			},
		);
		await bankServer.connectToMesh({ port: 0 });
		bankPort = bankServer.getBoundPort() || 0;

		// 2. Vault Node (Restricted, revocation list + local test token)
		vaultServer = new LiopServer(
			{ name: "test-vault", version: "1.0.0" },
			{
				auth: {
					role: "node",
					revocationPath: vaultRevocationPath,
					localTestToken: "vault-local-test-token",
				},
			},
		);
		vaultServer.tool(
			"vault_tool",
			"Query medical records",
			{ data: (await import("zod")).z.string() },
			async (args) => {
				return {
					content: [{ type: "text", text: `Vault Success: ${args.data}` }],
					isError: false,
				};
			},
		);
		await vaultServer.connectToMesh({ port: 0 });
		vaultPort = vaultServer.getBoundPort() || 0;

		// 3. Oracle Node (Unrestricted, role: "none")
		oracleServer = new LiopServer(
			{ name: "test-oracle", version: "1.0.0" },
			{
				auth: {
					role: "none",
				},
			},
		);
		oracleServer.tool(
			"oracle_tool",
			"Query HFT market data",
			{ data: (await import("zod")).z.string() },
			async (args) => {
				return {
					content: [{ type: "text", text: `Oracle Success: ${args.data}` }],
					isError: false,
				};
			},
		);
		await oracleServer.connectToMesh({ port: 0 });
		oraclePort = oracleServer.getBoundPort() || 0;
	});

	afterEach(async () => {
		if (bankServer) await bankServer.close();
		if (vaultServer) await vaultServer.close();
		if (oracleServer) await oracleServer.close();

		if (fs.existsSync(bankRevocationPath)) fs.unlinkSync(bankRevocationPath);
		if (fs.existsSync(vaultRevocationPath)) fs.unlinkSync(vaultRevocationPath);
		if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
	});

	it("should allow access to Bank using bank-local-test-token (Bypass authentication)", async () => {
		const client = new LiopClient();
		await client.connect(`localhost:${bankPort}`, {
			auth: {
				token: "bank-local-test-token",
			},
		});

		const payloadArgs = { data: "test-payload" };
		const wasmPayload = Buffer.from(
			`return { "__liop_proxy_tool": "bank_tool", "__liop_proxy_args": ${JSON.stringify(payloadArgs)} };`,
			"utf-8",
		);

		const result = await client.callTool(
			{ name: "bank_tool", arguments: payloadArgs },
			wasmPayload,
		);

		expect(result.isError).toBe(false);
		expect(result.content[0].text).toContain("Bank Success: test-payload");
		await client.close();
	});

	it("should reject access to Vault using bank-local-test-token (Domain Segregation Violation)", async () => {
		const client = new LiopClient();
		await client.connect(`localhost:${vaultPort}`, {
			auth: {
				token: "bank-local-test-token",
			},
		});

		const payloadArgs = { data: "test-payload" };
		const wasmPayload = Buffer.from(
			`return { "__liop_proxy_tool": "vault_tool", "__liop_proxy_args": ${JSON.stringify(payloadArgs)} };`,
			"utf-8",
		);

		await expect(
			client.callTool(
				{ name: "vault_tool", arguments: payloadArgs },
				wasmPayload,
			),
		).rejects.toThrow(/segregation violation/);

		await client.close();
	});

	it("should allow unrestricted access to Oracle node regardless of the token", async () => {
		const client = new LiopClient();
		// Connect with no token
		await client.connect(`localhost:${oraclePort}`);

		const payloadArgs = { data: "market-data" };
		const wasmPayload = Buffer.from(
			`return { "__liop_proxy_tool": "oracle_tool", "__liop_proxy_args": ${JSON.stringify(payloadArgs)} };`,
			"utf-8",
		);

		const result = await client.callTool(
			{ name: "oracle_tool", arguments: payloadArgs },
			wasmPayload,
		);

		expect(result.isError).toBe(false);
		expect(result.content[0].text).toContain("Oracle Success: market-data");
		await client.close();
	});

	it("should immediately deny access after token hot-revocation and allow back after restoration", async () => {
		const client = new LiopClient();
		await client.connect(`localhost:${bankPort}`, {
			auth: {
				token: "bank-local-test-token",
			},
		});

		const payloadArgs = { data: "authorized-run" };
		const wasmPayload = Buffer.from(
			`return { "__liop_proxy_tool": "bank_tool", "__liop_proxy_args": ${JSON.stringify(payloadArgs)} };`,
			"utf-8",
		);

		// First call succeeds
		const result1 = await client.callTool(
			{ name: "bank_tool", arguments: payloadArgs },
			wasmPayload,
		);
		expect(result1.isError).toBe(false);

		// Revoke the token using direct API (which triggers hot reload via mtime simulation/write)
		bankServer.revokeToken("bank-local-test-token");

		// Second call must fail
		await expect(
			client.callTool(
				{ name: "bank_tool", arguments: payloadArgs },
				wasmPayload,
			),
		).rejects.toThrow(/revoked/);

		// Restore the access by cleaning the file
		fs.writeFileSync(bankRevocationPath, JSON.stringify([], null, 2), "utf-8");
		// Update mtime to force reload
		const futureTime = Date.now() / 1000 + 10;
		fs.utimesSync(bankRevocationPath, futureTime, futureTime);

		// Third call succeeds again
		const result3 = await client.callTool(
			{ name: "bank_tool", arguments: payloadArgs },
			wasmPayload,
		);
		expect(result3.isError).toBe(false);
		expect(result3.content[0].text).toContain("Bank Success: authorized-run");

		await client.close();
	});
});
