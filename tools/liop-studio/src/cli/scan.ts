// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import process from "node:process";
import { createTransport } from "../transports/index.js";
import type { TargetConnectionConfig } from "../transports/transport.interface.js";
import { formatScanTable } from "./table-formatter.js";

/**
 * Autodetects target connection type from raw target string or arguments array
 */
export function resolveTargetConfig(
	target: string | string[],
	options: { token?: string; grpc?: boolean; mesh?: boolean } | string = {},
): TargetConnectionConfig {
	const token = typeof options === "string" ? options : options?.token;
	const isGrpcExplicit = typeof options === "object" && options?.grpc;
	const isMeshExplicit = typeof options === "object" && options?.mesh;

	if (isMeshExplicit) {
		const nodes = Array.isArray(target) ? target : target ? [target] : [];
		return {
			type: "mesh",
			mesh: { bootstrapNodes: nodes },
		};
	}

	const targetStr = Array.isArray(target) ? target.join(" ") : target || "";
	const trimmed = targetStr.trim();

	// If empty string and not explicitly mesh, default to local mesh
	if (!trimmed) {
		return {
			type: "mesh",
			mesh: {},
		};
	}

	// 1. HTTP / HTTPS URL
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return {
			type: "http",
			http: { url: trimmed, authToken: token },
		};
	}

	// 2. Libp2p Multiaddr (starts with /ip4/, /dns4/, etc. or contains /p2p/)
	if (trimmed.startsWith("/") || trimmed.includes("/p2p/")) {
		return {
			type: "mesh",
			mesh: { bootstrapNodes: [trimmed] },
		};
	}

	// 3. gRPC host:port (e.g. 127.0.0.1:50051, localhost:50051, grpc://...)
	if (
		isGrpcExplicit ||
		/^([a-zA-Z0-9.-]+):(\d+)$/.test(trimmed) ||
		trimmed.startsWith("grpc://")
	) {
		return {
			type: "grpc",
			grpc: { target: trimmed, token },
		};
	}

	// 4. Default: treat as local Stdio command (e.g. "node ./dist/index.js")
	const parts = trimmed.split(/\s+/);
	return {
		type: "stdio",
		stdio: {
			command: parts[0],
			args: parts.slice(1),
		},
	};
}

export async function runScan(
	targetStr: string,
	options: { token?: string; json?: boolean },
): Promise<void> {
	const config = resolveTargetConfig(targetStr, options.token);
	const transport = createTransport(config);

	try {
		const report = await transport.scan();
		await transport.disconnect();

		if (options.json) {
			console.log(JSON.stringify(report, null, 2));
		} else {
			console.log(formatScanTable(report));
		}

		if (report.status === "offline") {
			process.exit(1);
		}
	} catch (err: unknown) {
		console.error(
			"[LIOP-Studio Scan Error]:",
			err instanceof Error ? err.message : String(err),
		);
		process.exit(1);
	}
}
