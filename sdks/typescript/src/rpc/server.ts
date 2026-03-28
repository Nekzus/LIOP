import * as grpc from "@grpc/grpc-js";
import { liopV1 } from "./proto.js";
import { createServerCredentials, type LiopTlsOptions } from "./tls.js";
import type {
	IntentRequest,
	IntentResponse,
	LogicRequest,
	LogicResponse,
} from "./types.js";

/**
 * LIOP gRPC Service Implementation
 * Handles intent negotiation and secure logic execution.
 */
export class LiopRpcServer {
	private server: grpc.Server;

	constructor() {
		this.server = new grpc.Server();
	}

	public addService(handlers: {
		negotiateIntent: (
			call: grpc.ServerUnaryCall<IntentRequest, IntentResponse>,
			callback: grpc.sendUnaryData<IntentResponse>,
		) => void;
		executeLogic: (
			call: grpc.ServerWritableStream<LogicRequest, LogicResponse>,
		) => void;
	}): void {
		this.server.addService(liopV1.LogicMesh.service, {
			NegotiateIntent: handlers.negotiateIntent,
			ExecuteLogic: handlers.executeLogic,
		});
	}

	public async listen(
		port: number = 50051,
		tls?: LiopTlsOptions,
	): Promise<void> {
		const credentials = createServerCredentials(tls);
		return new Promise((resolve, reject) => {
			this.server.bindAsync(
				`127.0.0.1:${port}`,
				credentials,
				(error, assignedPort) => {
					if (error) {
						reject(error);
						return;
					}
					this.server.start();
					console.error(`[LIOP-RPC] Server listening on port ${assignedPort}`);
					resolve();
				},
			);
		});
	}

	public async stop(): Promise<void> {
		return new Promise((resolve) => {
			this.server.tryShutdown(() => {
				console.error("[LIOP-RPC] Server shut down");
				resolve();
			});
		});
	}
}
