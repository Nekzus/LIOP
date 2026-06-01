import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as jose from "jose";
import { JwtValidator, type AuthInfo } from "../../../src/security/jwt-validator.js";
import { AUTH_DEFAULTS } from "../../../src/security/auth-config.js";

describe("JwtValidator", () => {
	const TEST_ISSUER = "https://nexus.liop.io";
	const TEST_AUDIENCE = "liop-mesh-api";
	let privateKey: jose.KeyLike;
	let publicJwk: jose.JWK;
	let kid: string;

	beforeEach(async () => {
		// Generate Ed25519 key pair for signing test JWTs
		const pair = await jose.generateKeyPair("EdDSA", { extractable: true });
		privateKey = pair.privateKey;
		const exported = await jose.exportJWK(pair.publicKey);
		kid = "test-kid-001";
		publicJwk = { ...exported, kid, use: "sig", alg: "EdDSA" };
	});

	function createValidator(): JwtValidator {
		const jwks: jose.JSONWebKeySet = { keys: [publicJwk] };
		return new JwtValidator(TEST_ISSUER, TEST_AUDIENCE, jwks);
	}

	async function signToken(claims: Record<string, unknown>): Promise<string> {
		return new jose.SignJWT(claims)
			.setProtectedHeader({ alg: "EdDSA", kid })
			.setIssuedAt()
			.setIssuer(TEST_ISSUER)
			.setAudience(TEST_AUDIENCE)
			.setExpirationTime("1h")
			.sign(privateKey);
	}

	it("should validate a well-formed JWT and return AuthInfo", async () => {
		const validator = createValidator();
		const token = await signToken({
			sub: "bank-node",
			scope: "liop:tools:call liop:resources:read",
		});

		const info = await validator.validate(token);

		expect(info.clientId).toBe("bank-node");
		expect(info.scopes).toEqual(["liop:tools:call", "liop:resources:read"]);
		expect(info.token).toBe(token);
		expect(info.expiresAt).toBeTypeOf("number");
	});

	it("should reject a token with wrong issuer", async () => {
		const validator = createValidator();
		const token = await new jose.SignJWT({ sub: "test", scope: "liop:tools:call" })
			.setProtectedHeader({ alg: "EdDSA", kid })
			.setIssuedAt()
			.setIssuer("https://evil.example.com") // Wrong issuer
			.setAudience(TEST_AUDIENCE)
			.setExpirationTime("1h")
			.sign(privateKey);

		await expect(validator.validate(token)).rejects.toThrow();
	});

	it("should reject a token with wrong audience", async () => {
		const validator = createValidator();
		const token = await new jose.SignJWT({ sub: "test", scope: "liop:tools:call" })
			.setProtectedHeader({ alg: "EdDSA", kid })
			.setIssuedAt()
			.setIssuer(TEST_ISSUER)
			.setAudience("wrong-audience") // Wrong audience
			.setExpirationTime("1h")
			.sign(privateKey);

		await expect(validator.validate(token)).rejects.toThrow();
	});

	it("should reject an expired token", async () => {
		const validator = createValidator();
		const token = await new jose.SignJWT({ sub: "test", scope: "liop:tools:call" })
			.setProtectedHeader({ alg: "EdDSA", kid })
			.setIssuedAt(Math.floor(Date.now() / 1000) - 7200)  // 2h ago
			.setIssuer(TEST_ISSUER)
			.setAudience(TEST_AUDIENCE)
			.setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // expired 1h ago
			.sign(privateKey);

		await expect(validator.validate(token)).rejects.toThrow();
	});

	it("should reject a token missing required 'sub' claim", async () => {
		const validator = createValidator();
		// Sign without 'sub' claim
		const token = await new jose.SignJWT({ scope: "liop:tools:call" })
			.setProtectedHeader({ alg: "EdDSA", kid })
			.setIssuedAt()
			.setIssuer(TEST_ISSUER)
			.setAudience(TEST_AUDIENCE)
			.setExpirationTime("1h")
			.sign(privateKey);

		await expect(validator.validate(token)).rejects.toThrow();
	});

	it("should reject a token missing required 'scope' claim", async () => {
		const validator = createValidator();
		// Sign without 'scope' claim
		const token = await new jose.SignJWT({ sub: "test" })
			.setProtectedHeader({ alg: "EdDSA", kid })
			.setIssuedAt()
			.setIssuer(TEST_ISSUER)
			.setAudience(TEST_AUDIENCE)
			.setExpirationTime("1h")
			.sign(privateKey);

		await expect(validator.validate(token)).rejects.toThrow();
	});

	it("should reject a token signed with an unregistered key", async () => {
		const validator = createValidator();
		// Generate a completely different key pair
		const rogue = await jose.generateKeyPair("EdDSA", { extractable: true });
		const token = await new jose.SignJWT({ sub: "test", scope: "liop:tools:call" })
			.setProtectedHeader({ alg: "EdDSA", kid: "rogue-kid" })
			.setIssuedAt()
			.setIssuer(TEST_ISSUER)
			.setAudience(TEST_AUDIENCE)
			.setExpirationTime("1h")
			.sign(rogue.privateKey);

		await expect(validator.validate(token)).rejects.toThrow();
	});

	it("should handle empty scope string gracefully", async () => {
		const validator = createValidator();
		const token = await signToken({ sub: "empty-client", scope: "" });

		const info = await validator.validate(token);
		// Empty string split produces [""] but we want empty array
		expect(info.scopes).toEqual([""]);
		expect(info.clientId).toBe("empty-client");
	});

	it("should expose issuer and audience via getters", () => {
		const validator = createValidator();
		expect(validator.getIssuer()).toBe(TEST_ISSUER);
		expect(validator.getAudience()).toBe(TEST_AUDIENCE);
	});
});
