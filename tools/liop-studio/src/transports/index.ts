// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { GrpcTransport } from "./grpc.transport.js";
import { HttpTransport } from "./http.transport.js";
import { MeshTransport } from "./mesh.transport.js";
import { StdioTransport } from "./stdio.transport.js";
import type {
	StudioTransport,
	TargetConnectionConfig,
} from "./transport.interface.js";

export * from "./grpc.transport.js";
export * from "./http.transport.js";
export * from "./mesh.transport.js";
export * from "./stdio.transport.js";
export * from "./transport.interface.js";

export function createTransport(
	config: TargetConnectionConfig,
): StudioTransport {
	switch (config.type) {
		case "stdio": {
			if (!config.stdio?.command) {
				throw new Error("Stdio transport requires 'command' configuration.");
			}
			return new StdioTransport(config.stdio);
		}
		case "http": {
			if (!config.http?.url) {
				throw new Error("HTTP transport requires 'url' configuration.");
			}
			return new HttpTransport(config.http);
		}
		case "grpc": {
			if (!config.grpc?.target) {
				throw new Error("gRPC transport requires 'target' configuration.");
			}
			return new GrpcTransport(config.grpc);
		}
		case "mesh": {
			const bootstrap = config.mesh?.bootstrapNodes?.length
				? config.mesh.bootstrapNodes
				: [
						"/ip4/127.0.0.1/tcp/13000/ws/p2p/12D3KooWRv8p6s5eQhP1pD6E9vG9T1N6L2E7Z5D8S2D9L5K4F1A2",
					];
			return new MeshTransport({
				bootstrapNodes: bootstrap,
				swarmKey: config.mesh?.swarmKey,
				nexusUrl: config.mesh?.nexusUrl,
				clientId: config.mesh?.clientId,
				clientSecret: config.mesh?.clientSecret,
			});
		}
		default:
			throw new Error(
				`Unsupported transport type: ${(config as { type: string }).type}`,
			);
	}
}
