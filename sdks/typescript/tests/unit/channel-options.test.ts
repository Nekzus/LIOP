import { describe, expect, it } from "vitest";
import { GRPC_CHANNEL_OPTIONS } from "../../src/rpc/channel-options.js";

describe("GRPC_CHANNEL_OPTIONS", () => {
	it("should define symmetric keepalive options according to gRPC/NIST standards", () => {
		expect(GRPC_CHANNEL_OPTIONS["grpc.keepalive_time_ms"]).toBe(30_000);
		expect(GRPC_CHANNEL_OPTIONS["grpc.keepalive_timeout_ms"]).toBe(10_000);
		expect(GRPC_CHANNEL_OPTIONS["grpc.keepalive_permit_without_calls"]).toBe(1);
		expect(GRPC_CHANNEL_OPTIONS["grpc.max_send_message_length"]).toBe(-1);
		expect(GRPC_CHANNEL_OPTIONS["grpc.max_receive_message_length"]).toBe(-1);
		expect(GRPC_CHANNEL_OPTIONS["grpc.enable_retries"]).toBe(1);
	});
});
