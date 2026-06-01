import * as http from "node:http";
import { describe, expect, it } from "vitest";
import { JwtValidator } from "../../../src/security/jwt-validator.js";
import { createOAuthServer } from "../../../src/security/oauth-server.js";

describe("Embedded OAuth 2.1 Server", () => {
	const TEST_ISSUER = "http://localhost:3000";
	const TEST_AUDIENCE = "urn:liop:mesh:api";

	it("should initialize the OIDC provider and return public JWKS", () => {
		const { provider, jwks } = createOAuthServer({
			issuer: TEST_ISSUER,
			clients: [
				{
					client_id: "test-client",
					client_secret: "test-secret",
					grant_types: ["client_credentials"],
					scope: "liop:tools:call",
				},
			],
		});

		expect(provider).toBeDefined();
		expect(jwks).toBeDefined();
		expect(jwks.keys.length).toBe(1);

		const key = jwks.keys[0];
		expect(key.kid).toBeDefined();
		expect(key.use).toBe("sig");
		expect(key.alg).toBe("EdDSA");
		expect(key.kty).toBe("OKP");
		expect(key.crv).toBe("Ed25519");
		// Ensure private key 'd' is NOT leaked in the public JWKS
		// biome-ignore lint/suspicious/noExplicitAny: test runtime check
		expect((key as any).d).toBeUndefined();
	});

	it("should allow M2M client credentials token request, return JWT, and validate it", async () => {
		const client_id = "agent-x";
		const client_secret = "secret-123";
		const scope = "liop:tools:call liop:tools:list";

		// Create an empty HTTP server to bind a dynamic ephemeral port
		const server = http.createServer();

		await new Promise<void>((resolve) => {
			server.listen(0, resolve);
		});

		const addr = server.address();
		const port = typeof addr === "string" ? 0 : addr?.port || 0;
		const dynamicIssuer = `http://localhost:${port}`;

		// Instantiate OAuth Server with the exact dynamic issuer containing the ephemeral port
		const { provider, jwks } = createOAuthServer({
			issuer: dynamicIssuer,
			clients: [
				{
					client_id,
					client_secret,
					grant_types: ["client_credentials"],
					scope,
				},
			],
		});

		// Attach the OIDC provider's callback to our running HTTP server
		server.on("request", provider.callback());

		try {
			// Request token via Client Credentials Grant (RFC 6749)
			const res = await fetch(`${dynamicIssuer}/token`, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "client_credentials",
					client_id,
					client_secret,
					scope,
					resource: TEST_AUDIENCE,
				}),
			});

			if (res.status !== 200) {
				const errText = await res.text();
				console.error("OAuth Error Response:", errText);
			}

			expect(res.status).toBe(200);
			const tokenResponse = await res.json();

			expect(tokenResponse.access_token).toBeDefined();
			expect(tokenResponse.token_type).toBe("Bearer");
			expect(tokenResponse.expires_in).toBe(3600);

			// Validate the generated JWT Access Token using our local JwtValidator!
			const validator = new JwtValidator(dynamicIssuer, TEST_AUDIENCE, jwks);
			const authInfo = await validator.validate(tokenResponse.access_token);

			expect(authInfo.clientId).toBe(client_id);
			expect(authInfo.scopes).toEqual(["liop:tools:call", "liop:tools:list"]);
			expect(authInfo.token).toBe(tokenResponse.access_token);
		} finally {
			await new Promise<void>((resolve) => {
				server.close(() => resolve());
			});
		}
	});
});
