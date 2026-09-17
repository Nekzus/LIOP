// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

/// <reference types="node" />

import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenTelemetryEngine } from "../economy/telemetry.js";
import { LiopClient } from "./index.js";

describe("LiopClient", () => {
	beforeEach(() => {
		TokenTelemetryEngine.destroy();
	});
	it("should throw an error if attempting to execute without connection", async () => {
		const client = new LiopClient();

		const _mockServerPublicKey = new Uint8Array(1184);
		const mockWasmPayload = Buffer.from("mock");

		await expect(
			client.callTool({ name: "any" }, mockWasmPayload),
		).rejects.toThrow("Client must be connected before calling tools.");
		await expect(client.discoverTools()).rejects.toThrow(
			"Client must be connected before discovering tools.",
		);
	});

	it("should successfully connect and mock capability discovery", async () => {
		const client = new LiopClient();
		await client.connect();

		const serverInfo = client.getServerInfo();
		expect(serverInfo).toBeDefined();
		expect(serverInfo?.name).toContain("LiopServer");

		const tools = await client.discoverTools();
		expect(tools).toBeInstanceOf(Array);
	});

	it("should reject callTool when no gRPC server is reachable", async () => {
		const client = new LiopClient();
		await client.connect();

		// Mock a 1184-byte Kyber768 array and a dummy WASM Buffer
		const mockWasmPayload = Buffer.from("mock-wasm-binary-data");

		// callTool should reject because there is no gRPC server running at localhost:50051
		await expect(
			client.callTool({ name: "read_logs", arguments: {} }, mockWasmPayload),
		).rejects.toThrow();
	});

	it("should return resource contents via dynamic DHT discovery", async () => {
		const client = new LiopClient();
		await client.connect();

		// Access the private meshNode instance for mocking
		// biome-ignore lint/suspicious/noExplicitAny: testing internals
		const meshNode = (client as any).meshNode;

		vi.spyOn(meshNode, "findProviders").mockResolvedValue(["peer-123"]);
		vi.spyOn(meshNode, "queryManifest").mockResolvedValue({
			peerId: "peer-123",
			grpcPort: 3000,
			tools: [],
			serverInfo: { name: "test", version: "1" },
			resources: [
				{
					uri: "liop://test/resource",
					name: "test-res",
					mimeType: "application/json",
					text: "null",
				},
			],
		});

		const result = await client.readResource("liop://test/resource");
		expect(result).toBeDefined();
		expect(result.contents[0].uri).toBe("liop://test/resource");
		expect(result.contents[0].mimeType).toBe("application/json");
		expect(result.contents[0].text).toContain("liop://test/resource");
	});

	it("should record token telemetry on discoverTools", async () => {
		const client = new LiopClient();
		await client.connect();

		const telemetry = TokenTelemetryEngine.getInstance();
		const initialOps = telemetry.getReport().operations.length;

		await client.discoverTools();

		const report = telemetry.getReport();
		expect(report.operations.length).toBeGreaterThan(initialOps);

		const discoverOp = report.operations.find(
			(op) => op.method === "discoverTools",
		);
		expect(discoverOp).toBeDefined();
		expect(discoverOp?.type).toBe("tools_list");
		expect(discoverOp?.estimatedInputTokens).toBeGreaterThanOrEqual(0);
		expect(discoverOp?.estimatedOutputTokens).toBeGreaterThan(0);
		expect(discoverOp?.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("should record token telemetry on readResource", async () => {
		const client = new LiopClient();
		await client.connect();

		// Access private meshNode instance for mocking
		// biome-ignore lint/suspicious/noExplicitAny: testing internals
		const meshNode = (client as any).meshNode;

		vi.spyOn(meshNode, "findProviders").mockResolvedValue(["peer-tel-1"]);
		vi.spyOn(meshNode, "queryManifest").mockResolvedValue({
			peerId: "peer-tel-1",
			grpcPort: 3000,
			tools: [],
			serverInfo: { name: "test-server", version: "1.0.0" },
			resources: [
				{
					uri: "liop://telemetry/data",
					name: "telemetry-data",
					mimeType: "application/json",
					text: '{"status":"ok"}',
				},
			],
		});

		const telemetry = TokenTelemetryEngine.getInstance();
		await client.readResource("liop://telemetry/data");

		const report = telemetry.getReport();
		const readOp = report.operations.find((op) => op.method === "readResource");
		expect(readOp).toBeDefined();
		expect(readOp?.type).toBe("resource_read");
		expect(readOp?.toolName).toBe("liop://telemetry/data");
		expect(readOp?.peerId).toBe("peer-tel-1");
		expect(readOp?.estimatedInputTokens).toBeGreaterThan(0);
		expect(readOp?.estimatedOutputTokens).toBeGreaterThan(0);
		expect(readOp?.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("should provide safe public mesh introspection getters", async () => {
		const client = new LiopClient();

		// Pre-connect: getters return safe defaults
		expect(client.peerId).toBeNull();
		expect(client.isMeshActive).toBe(false);
		expect(client.connectionCount).toBe(0);

		// Connect dynamic mesh
		await client.connect();

		// Post-connect: getters return active state
		expect(client.peerId).toBeDefined();
		expect(typeof client.peerId).toBe("string");
		expect(client.peerId?.length).toBeGreaterThan(0);
		expect(client.isMeshActive).toBe(true);
		expect(client.connectionCount).toBeGreaterThanOrEqual(0);

		// Post-close: isMeshActive reflects stopped state
		await client.close();
		expect(client.isMeshActive).toBe(false);
	});
});
