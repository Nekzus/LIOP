/**
 * LIOP TLS Configuration
 *
 * Provides conditional TLS credential factories for gRPC connections.
 * When TLS options are provided, connections are secured with mutual TLS.
 * Otherwise, falls back to insecure credentials (alpha/development mode).
 */

import * as fs from "node:fs";
import * as grpc from "@grpc/grpc-js";

export interface LiopTlsOptions {
	/** Path to the root CA certificate (PEM format) */
	rootCert?: string;
	/** Path to the server/client certificate (PEM format) */
	certChain?: string;
	/** Path to the private key (PEM format) */
	privateKey?: string;
}

/**
 * Creates gRPC server credentials from TLS options.
 * Falls back to insecure if no options are provided.
 */
export function createServerCredentials(
	tls?: LiopTlsOptions,
): grpc.ServerCredentials {
	if (!tls?.certChain || !tls?.privateKey) {
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
		console.error(
			`[LIOP-TLS] Failed to load certificates, falling back to insecure: ${error}`,
		);
		return grpc.ServerCredentials.createInsecure();
	}
}

/**
 * Creates gRPC channel credentials from TLS options.
 * Falls back to insecure if no options are provided.
 */
export function createChannelCredentials(
	tls?: LiopTlsOptions,
): grpc.ChannelCredentials {
	if (!tls?.rootCert) {
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
		console.error(
			`[LIOP-TLS] Failed to load certificates, falling back to insecure: ${error}`,
		);
		return grpc.credentials.createInsecure();
	}
}
