/**
 * LIOP TLS Configuration
 *
 * Provides conditional TLS credential factories for gRPC connections.
 * When TLS options are provided, connections are secured with mutual TLS.
 * Otherwise, falls back to insecure credentials (alpha/development mode).
 *
 * Production Hardening (Phase 128):
 * - When NODE_ENV=production and TLS is configured but certificate loading
 *   fails, the system throws a fatal error instead of silently degrading
 *   to insecure credentials. This prevents MITM/eavesdropping attacks
 *   caused by misconfigured certificate paths going unnoticed.
 * - Reference: gRPC-node official docs — "Using insecure credentials in
 *   production poses significant security risks including eavesdropping,
 *   MITM attacks, and lack of authentication."
 */

import * as fs from "node:fs";
import * as grpc from "@grpc/grpc-js";
import { log } from "../utils/logger.js";

export interface LiopTlsOptions {
	/** Path to the root CA certificate (PEM format) */
	rootCert?: string;
	/** Path to the server/client certificate (PEM format) */
	certChain?: string;
	/** Path to the private key (PEM format) */
	privateKey?: string;
}

const isProduction = () => process.env.NODE_ENV === "production";

/**
 * Creates gRPC server credentials from TLS options.
 * In production, refuses to fall back to insecure if TLS loading fails.
 */
export function createServerCredentials(
	tls?: LiopTlsOptions,
): grpc.ServerCredentials {
	if (!tls?.certChain || !tls?.privateKey) {
		log.warn(
			"[LIOP-TLS] No TLS certificates configured — using insecure server credentials",
		);
		return grpc.ServerCredentials.createInsecure();
	}

	try {
		const rootCert = tls.rootCert ? fs.readFileSync(tls.rootCert) : null;
		const certChain = fs.readFileSync(tls.certChain);
		const privateKey = fs.readFileSync(tls.privateKey);

		return grpc.ServerCredentials.createSsl(rootCert, [
			{ cert_chain: certChain, private_key: privateKey },
		]);
	} catch (error) {
		if (isProduction()) {
			throw new Error(
				`[LIOP-TLS] FATAL: Server certificate loading failed in production mode. ` +
					`Refusing insecure fallback to prevent MITM/eavesdropping: ${error}`,
			);
		}
		log.warn(
			`[LIOP-TLS] Server certificate loading failed, falling back to insecure (dev mode): ${error}`,
		);
		return grpc.ServerCredentials.createInsecure();
	}
}

/**
 * Creates gRPC channel credentials from TLS options.
 * In production, refuses to fall back to insecure if TLS loading fails.
 */
export function createChannelCredentials(
	tls?: LiopTlsOptions,
): grpc.ChannelCredentials {
	if (!tls?.rootCert) {
		log.warn(
			"[LIOP-TLS] No TLS root certificate configured — using insecure channel credentials",
		);
		return grpc.credentials.createInsecure();
	}

	try {
		const rootCert = fs.readFileSync(tls.rootCert);
		const certChain = tls.certChain
			? fs.readFileSync(tls.certChain)
			: undefined;
		const privateKey = tls.privateKey
			? fs.readFileSync(tls.privateKey)
			: undefined;

		return grpc.credentials.createSsl(rootCert, privateKey, certChain);
	} catch (error) {
		if (isProduction()) {
			throw new Error(
				`[LIOP-TLS] FATAL: Channel certificate loading failed in production mode. ` +
					`Refusing insecure fallback to prevent MITM/eavesdropping: ${error}`,
			);
		}
		log.warn(
			`[LIOP-TLS] Channel certificate loading failed, falling back to insecure (dev mode): ${error}`,
		);
		return grpc.credentials.createInsecure();
	}
}
