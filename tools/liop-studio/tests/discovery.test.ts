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

	it("should scan network profiles and sort online nodes by tier and RTT", async () => {
		const discovery = NetworkDiscoveryEngine.getInstance();
		const nodes = await discovery.scanNetwork("127.0.0.1");

		expect(Array.isArray(nodes)).toBe(true);
		// If test docker containers are online, verify structured properties
		for (const node of nodes) {
			expect(node.status).toBe("online");
			expect(node.tier).toBeGreaterThanOrEqual(1);
			expect(node.tier).toBeLessThanOrEqual(3);
			expect(node.rttMs).toBeGreaterThanOrEqual(0);
		}
	});
});
