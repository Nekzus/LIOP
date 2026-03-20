import type * as grpc from "@grpc/grpc-js";
import { nmpV1 } from "./proto.js";
import type { IntentRequest, IntentResponse, LogicRequest, LogicResponse } from "./types.js";
import { createChannelCredentials, type NmpTlsOptions } from "./tls.js";

/**
 * NMP gRPC Client Implementation
 * Provides a high-level interface for secure intent negotiation and logic execution.
 */
export class NmpRpcClient {
	private client: any;

	constructor(address: string, tls?: NmpTlsOptions) {
		const credentials = createChannelCredentials(tls);
		this.client = new nmpV1.NeuralMesh(address, credentials);
	}

	/**
	 * Negotiates intent with the remote host.
	 * Returns the ephemeral Kyber public key for payload encryption.
	 */
	public async negotiateIntent(request: IntentRequest): Promise<IntentResponse> {
		return new Promise((resolve, reject) => {
			this.client.NegotiateIntent(
				request,
				(error: grpc.ServiceError | null, response: IntentResponse) => {
					if (error) {
						reject(error);
					} else {
						resolve(response);
					}
				}
			);
		});
	}

	/**
	 * Pushes the encrypted Logic-on-Origin payload to the origin.
	 * Returns a stream of semantic responses and ZK proofs.
	 */
	public executeLogic(request: LogicRequest): grpc.ClientReadableStream<LogicResponse> {
		return this.client.ExecuteLogic(request);
	}

	public close(): void {
		this.client.close();
	}
}
