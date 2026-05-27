import * as jose from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LiopHybridGateway } from "../../src/gateway/hybrid.js";
import { JwtValidator } from "../../src/security/jwt-validator.js";
import { LiopServer } from "../../src/server/index.js";

describe("Gateway Authentication Integration", () => {
	const TEST_ISSUER = "https://nexus.liop.io";
	const TEST_AUDIENCE = "urn:liop:mesh:api";
	let privateKey: jose.KeyLike;
	let publicJwk: jose.JWK;
	let kid: string;
	let server: LiopServer;
	let gateway: LiopHybridGateway;
	let port: number;

	beforeEach(async () => {
		// Generate keypair
		const pair = await jose.generateKeyPair("EdDSA", { extractable: true });
		privateKey = pair.privateKey;
		const exported = await jose.exportJWK(pair.publicKey);
		kid = "gateway-test-kid";
		publicJwk = { ...exported, kid, use: "sig", alg: "EdDSA" };

		const jwks: jose.JSONWebKeySet = { keys: [publicJwk] };

		// Create LiopServer with auth node role config
		server = new LiopServer(
			{
				name: "Auth-Test-Server",
				version: "1.0.0",
			},
			{
				auth: {
					role: "node",
					issuer: TEST_ISSUER,
					audience: TEST_AUDIENCE,
				},
			},
		);

		// Overwrite the jwtValidator with our test key-set validator to avoid remote call
		server.jwtValidator = new JwtValidator(TEST_ISSUER, TEST_AUDIENCE, jwks);

		// Register a dummy tool
		server.tool("hello", "Simple greeting", {}, async () => {
			return { content: [{ type: "text", text: "world" }] };
		});

		gateway = new LiopHybridGateway(server);
		// Listen on ephemeral port
		port = await gateway.listen(0);
	});

	afterEach(async () => {
		await gateway.stop();
	});

	async function signToken(claims: Record<string, unknown>): Promise<string> {
		return new jose.SignJWT(claims)
			.setProtectedHeader({ alg: "EdDSA", kid })
			.setIssuedAt()
			.setIssuer(TEST_ISSUER)
			.setAudience(TEST_AUDIENCE)
			.setExpirationTime("1h")
			.sign(privateKey);
	}

	it("should deny requests without Bearer token with 401", async () => {
		const res = await fetch(`http://localhost:${port}/mcp`, {
			method: "POST",
			body: JSON.stringify({
				jsonrpc: "2.0",
				method: "tools/list",
				id: 1,
			}),
		});

		expect(res.status).toBe(401);
		expect(res.headers.get("www-authenticate")).toContain("Bearer");
		const body = await res.json();
		expect(body.error).toBe("Unauthorized");
	});

	it("should deny requests with invalid token with 401", async () => {
		const res = await fetch(`http://localhost:${port}/mcp`, {
			method: "POST",
			headers: {
				Authorization: "Bearer invalid-token-string",
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				method: "tools/list",
				id: 1,
			}),
		});

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe("Invalid token");
	});

	it("should deny access if scopes are insufficient", async () => {
		const token = await signToken({
			sub: "test-client",
			scope: "liop:wrong:scope",
		});

		const res = await fetch(`http://localhost:${port}/mcp`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				method: "tools/list",
				id: 1,
			}),
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.error.code).toBe(-32099);
		expect(body.error.message).toContain("Insufficient scopes");
	});

	it("should allow request if token is valid and has correct scopes", async () => {
		const token = await signToken({
			sub: "test-client",
			scope: "liop:tools:list",
		});

		const res = await fetch(`http://localhost:${port}/mcp`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				method: "tools/list",
				id: 1,
			}),
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.result.tools).toBeDefined();
	});

	it("should serve RFC 9728 Protected Resource Metadata (PRM) endpoint", async () => {
		const res = await fetch(
			`http://localhost:${port}/.well-known/oauth-protected-resource`,
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.authorization_servers).toBeDefined();
		expect(body.authorization_servers[0]).toBe(TEST_ISSUER);
		expect(body.resource).toBe(TEST_AUDIENCE);
	});

	it("should include auth info in health check endpoint", async () => {
		const res = await fetch(`http://localhost:${port}/health`, {
			headers: { Accept: "application/json" },
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.auth).toBeDefined();
		expect(body.auth.issuer).toBe(TEST_ISSUER);
		expect(body.auth.jwks_uri).toBe(`${TEST_ISSUER}/oidc/jwks`);
	});
});
