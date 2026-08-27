import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LiopHybridGateway } from "../../../src/gateway/hybrid.js";
import { LiopServer } from "../../../src/server/index.js";

describe("Kubernetes Probes & Graceful Draining (Phase Beta-3)", () => {
	let server: LiopServer;
	let gateway: LiopHybridGateway;
	let port: number;

	beforeAll(async () => {
		server = new LiopServer({
			name: "k8s-test-node",
			version: "1.0.0",
			capabilities: { tools: {} },
		});
		gateway = new LiopHybridGateway(server, null, 50099);
		port = await gateway.listen(0, "127.0.0.1");
	});

	afterAll(async () => {
		if (!gateway.isDrained()) {
			await gateway.stop();
		}
	});

	it("should return 200 on /healthz liveness probe", async () => {
		const res = await fetch(`http://127.0.0.1:${port}/healthz`);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.status).toBe("ok");
		expect(typeof data.uptime).toBe("number");
		expect(data.timestamp).toBeDefined();
	});

	it("should return 200 on /readyz readiness probe", async () => {
		const res = await fetch(`http://127.0.0.1:${port}/readyz`);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.status).toBe("ready");
		expect(data.meshStarted).toBe(true);
	});

	it("should return Prometheus metrics format on /metrics", async () => {
		const res = await fetch(`http://127.0.0.1:${port}/metrics`);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toContain("text/plain");
		const text = await res.text();
		expect(text).toContain("# HELP liop_tool_calls_total");
		expect(text).toContain("# TYPE liop_tool_calls_total counter");
		expect(text).toContain("liop_process_uptime_seconds");
	});

	it("should switch probes to 503 during graceful draining", async () => {
		expect(gateway.isDrained()).toBe(false);

		// Initiate drain in the background
		const drainPromise = gateway.drain(1000);
		expect(gateway.isDrained()).toBe(true);

		// Probes should immediately return 503 draining
		const healthzRes = await fetch(`http://127.0.0.1:${port}/healthz`);
		expect(healthzRes.status).toBe(503);
		const healthzData = await healthzRes.json();
		expect(healthzData.status).toBe("draining");

		const readyzRes = await fetch(`http://127.0.0.1:${port}/readyz`);
		expect(readyzRes.status).toBe(503);
		const readyzData = await readyzRes.json();
		expect(readyzData.status).toBe("draining");

		await drainPromise;
	});
});
