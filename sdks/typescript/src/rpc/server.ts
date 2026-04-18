import * as grpc from "@grpc/grpc-js";
import { log } from "../utils/logger.js";
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

/** Production-grade gRPC channel options per official grpc-node recommendations */
const GRPC_CHANNEL_OPTIONS = {
	"grpc.keepalive_time_ms": 30_000,
	"grpc.keepalive_timeout_ms": 10_000,
	"grpc.keepalive_permit_without_calls": 1,
	"grpc.max_send_message_length": -1,
	"grpc.max_receive_message_length": -1,
	"grpc.enable_retries": 1,
};

export class LiopRpcServer {
	private server: grpc.Server;

	constructor() {
		this.server = new grpc.Server(GRPC_CHANNEL_OPTIONS);
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
	): Promise<number> {
		const credentials = createServerCredentials(tls);
		return new Promise((resolve, reject) => {
			this.server.bindAsync(
				`0.0.0.0:${port}`,
				credentials,
				(error, assignedPort) => {
					if (error) {
						reject(error);
						return;
					}
					log.info(`[LIOP-RPC] Server listening on port ${assignedPort}`);
					resolve(assignedPort);
				},
			);
		});
	}

	public async stop(): Promise<void> {
		return new Promise((resolve) => {
			this.server.tryShutdown(() => {
				log.info("[LIOP-RPC] Server shut down");
				resolve();
			});
		});
	}
}
