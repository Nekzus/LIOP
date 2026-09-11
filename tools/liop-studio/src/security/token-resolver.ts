// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * Nexus OIDC Token Resolver for LIOP Studio.
 *
 * Implements RFC 6749 / RFC 8707 client credentials acquisition for multi-tier
 * enclave access (e.g. Border LIO Gateway BLG and Edge nodes).
 *
 * Adheres to Agent Rule 23: Gateway Bearer OAuth 2.1 Propagation with
 * in-memory caching and safety margin before expiration.
 */

interface CachedToken {
	token: string;
	expiresAt: number;
}

let memoryTokenCache: CachedToken | null = null;

export interface TokenResolverOptions {
	nexusUrl?: string;
	clientId?: string;
	clientSecret?: string;
	scope?: string;
	resource?: string;
	forceRefresh?: boolean;
}

/**
 * Resolves an active OAuth 2.1 access token from Nexus OIDC server.
 * Returns cached token if valid, otherwise negotiates a new one.
 */
export async function resolveOidcToken(
	options: TokenResolverOptions = {},
): Promise<string | undefined> {
	const now = Date.now();
	// Keep 30-second safety margin before token expiry (Rule 23)
	if (
		!options.forceRefresh &&
		memoryTokenCache &&
		memoryTokenCache.expiresAt > now + 30_000
	) {
		return memoryTokenCache.token;
	}

	const nexusUrl =
		options.nexusUrl ||
		process.env.LIOP_NEXUS_URL ||
		process.env.NEXUS_URL ||
		"http://127.0.0.1:15000";

	const clientId =
		options.clientId || process.env.LIOP_CLIENT_ID || "liop-mesh-agent";
	const clientSecret =
		options.clientSecret ||
		process.env.LIOP_CLIENT_SECRET ||
		"dev-secret-change-me";
	const resource = options.resource || "urn:liop:mesh:api";
	const scope =
		options.scope ||
		"liop:tools:call liop:tools:list liop:resources:read liop:schema:read liop:mesh:query";

	const tokenEndpoint = `${nexusUrl.replace(/\/$/, "")}/oidc/token`;

	try {
		const res = await fetch(tokenEndpoint, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "client_credentials",
				client_id: clientId,
				client_secret: clientSecret,
				resource,
				scope,
			}).toString(),
		});

		if (!res.ok) {
			return undefined;
		}

		const data = (await res.json()) as {
			access_token?: string;
			expires_in?: number;
		};

		if (!data.access_token) {
			return undefined;
		}

		const expiresInSec = data.expires_in ?? 3600;
		memoryTokenCache = {
			token: data.access_token,
			expiresAt: now + expiresInSec * 1000,
		};

		return data.access_token;
	} catch {
		// Non-blocking fallback if Nexus is unreachable or in standalone mode
		return undefined;
	}
}

/**
 * Creates a TokenProvider callback compatible with LiopRpcClient in @nekzus/liop.
 */
export function createStudioTokenProvider(
	options: TokenResolverOptions = {},
): () => Promise<string | undefined> {
	return async () => {
		return resolveOidcToken(options);
	};
}

/**
 * Clears the memory token cache (useful during tests and disconnects).
 */
export function clearTokenCache(): void {
	memoryTokenCache = null;
}
