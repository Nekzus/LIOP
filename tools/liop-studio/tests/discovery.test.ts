// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { NetworkDiscoveryEngine } from "../src/discovery/network-scanner.js";

describe("LIOP Studio: Dynamic Network Discovery Engine", () => {
	it("should provide a singleton instance", () => {
		const instance1 = NetworkDiscoveryEngine.getInstance();
		const instance2 = NetworkDiscoveryEngine.getInstance();
		expect(instance1).toBe(instance2);
	});

	it("should resolve candidate profiles by gRPC target port", async () => {
		const discovery = NetworkDiscoveryEngine.getInstance();
		const resolved = await discovery.resolveNodeForGrpcTarget(
			"127.0.0.1:15021",
			15,
			"online",
		);

		expect(resolved.node).toBeDefined();
		expect(resolved.node.id).toBe("bank");
		expect(resolved.node.tier).toBe(1);
		expect(resolved.node.ports?.grpc).toBe(15021);
		expect(resolved.tools.length).toBeGreaterThan(0);
	});

	it("should resolve custom gRPC target addresses gracefully with fallback", async () => {
		const discovery = NetworkDiscoveryEngine.getInstance();
		const resolved = await discovery.resolveNodeForGrpcTarget(
			"192.168.1.100:50055",
			45,
			"online",
		);

		expect(resolved.node.id).toBe("grpc-50055");
		expect(resolved.node.ports?.grpc).toBe(50055);
		expect(resolved.tools[0].name).toBe("Execute_WASI_Logic");
		expect(resolved.node.status).toBe("online");
	});

	it("should register and scan custom agnostic target nodes dynamically", async () => {
		const discovery = NetworkDiscoveryEngine.getInstance();
		discovery.registerCustomTarget({
			id: "custom-linux-node",
			name: "Remote Linux Microservice",
			host: "10.0.0.5",
			status: "online",
			rttMs: 12,
			tools: ["Custom_Log_Analytics"],
			version: "1.0.0",
			role: "Standalone gRPC Analytics Node",
			isolation: "WASI Sandbox",
			transportType: "grpc",
		});

		const customTargets = discovery.getCustomTargets();
		expect(customTargets.some((t) => t.id === "custom-linux-node")).toBe(true);

		const allNodes = await discovery.scanNetwork("127.0.0.1");
		const found = allNodes.find((n) => n.id === "custom-linux-node");
		expect(found).toBeDefined();
		expect(found?.status).toBe("online");
		expect(found?.tier).toBeUndefined();
		expect(found?.tools).toContain("Custom_Log_Analytics");
	});
});
