/**
 * LIOP JWT Validator — Token Verification Engine
 *
 * Validates JWT Access Tokens using the `jose` library.
 * Supports two modes:
 *   - Local JWKS (Nexus role): Keys in memory, zero network latency.
 *   - Remote JWKS (Node role): Fetched from Nexus /oidc/jwks with 10min cache.
 *
 * Standards: NIST SP 800-207 (continuous verification), OWASP API-A01
 * Source: panva/jose DeepWiki — createRemoteJWKSet, jwtVerify
 */

import * as jose from "jose";
import { AUTH_DEFAULTS } from "./auth-config.js";

/**
 * Authorization context extracted from a validated JWT.
 * Compatible with MCP TypeScript SDK AuthInfo interface.
 */
export interface AuthInfo {
	/** Raw JWT string. */
	token: string;
	/** Subject claim (client_id for M2M flows). */
	clientId: string;
	/** Space-delimited scopes parsed into an array. */
	scopes: string[];
	/** Token expiration timestamp (Unix seconds). */
	expiresAt?: number;
}

/**
 * JWT Validator with dual-mode JWKS resolution.
 *
 * - Nexus role: `new JwtValidator(issuer, audience, localJwks)` (createLocalJWKSet)
 * - Node role: `new JwtValidator(issuer, audience, new URL(jwksUri))` (createRemoteJWKSet)
 */
export class JwtValidator {
	private readonly jwksResolver: ReturnType<
		typeof jose.createRemoteJWKSet | typeof jose.createLocalJWKSet
	>;
	private readonly issuer: string;
	private readonly audience: string;

	constructor(
		issuer: string,
		audience: string,
		jwksSource: URL | jose.JSONWebKeySet,
	) {
		this.issuer = issuer;
		this.audience = audience;

		if (jwksSource instanceof URL) {
			// Remote JWKS (node role): fetch from Nexus with intelligent caching.
			// jose docs: cacheMaxAge defaults to 10min, cooldownDuration to 30s.
			// These prevent JWKS endpoint abuse while keeping key rotation responsive.
			this.jwksResolver = jose.createRemoteJWKSet(jwksSource, {
				cacheMaxAge: AUTH_DEFAULTS.jwksCacheTtlMs,
				cooldownDuration: AUTH_DEFAULTS.jwksCooldownMs,
			});
		} else {
			// Local JWKS (nexus role): keys already loaded in memory.
			// Zero network latency for token validation on the issuing node.
			this.jwksResolver = jose.createLocalJWKSet(jwksSource);
		}
	}

	/**
	 * Validates a JWT access token and extracts authorization context.
	 *
	 * Checks performed (jose.jwtVerify):
	 * - Cryptographic signature verification (EdDSA or ES256)
	 * - Issuer claim matches configured issuer
	 * - Audience claim matches configured audience
	 * - Token is not expired (with clock tolerance for mesh skew)
	 * - Required claims (sub, scope) are present
	 *
	 * @throws JOSEError if validation fails (expired, wrong issuer, bad signature, etc.)
	 */
	async validate(token: string): Promise<AuthInfo> {
		const { payload } = await jose.jwtVerify(token, this.jwksResolver, {
			issuer: this.issuer,
			audience: this.audience,
			// Algorithm whitelist: only accept EdDSA (Ed25519) or ES256.
			// Prevents algorithm confusion attacks (OWASP API-A01).
			algorithms: [AUTH_DEFAULTS.signingAlgorithm, "ES256"],
			// Clock tolerance for P2P mesh nodes with slight time drift.
			clockTolerance: AUTH_DEFAULTS.clockToleranceSec,
			// Enforce required claims to prevent malformed tokens.
			requiredClaims: ["sub", "scope"],
		});

		return {
			token,
			clientId: payload.sub ?? "unknown",
			scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
			expiresAt: payload.exp,
		};
	}

	/**
	 * Returns the configured issuer URL for PRM (RFC 9728) metadata.
	 */
	getIssuer(): string {
		return this.issuer;
	}

	/**
	 * Returns the configured audience for PRM metadata.
	 */
	getAudience(): string {
		return this.audience;
	}
}
