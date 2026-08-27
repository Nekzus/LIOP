import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { LiopMcpRouter } from "../../src/gateway/router.js";
import { LiopServer } from "../../src/server/index.js";
import { MeshNode } from "../../src/mesh/index.js";
import { InMemoryRateLimiter } from "../../src/gateway/rate-limiter.js";
import { GRPC_CHANNEL_OPTIONS } from "../../src/rpc/channel-options.js";
import { Dilithium65Wrapper } from "../../src/rpc/crypto/dilithium.js";
import { decodeFrames, encodeDataFrame } from "../../src/gateway/grpc-web.js";

describe("Live Docker Mesh Integration (Global Distributed Hardening)", () => {
	let router: LiopMcpRouter;
	let meshNode: MeshNode;
	let localServer: LiopServer;
	let dockerOnline = false;

	beforeAll(async () => {
		try {
			const res = await fetch("http://127.0.0.1:13000/health", { signal: AbortSignal.timeout(1500) });
			dockerOnline = res.ok;
		} catch {
			dockerOnline = false;
		}

		if (!dockerOnline) {
			return;
		}

		process.env.LIOP_NEXUS_URL = "http://127.0.0.1:13000";
		process.env.LIOP_DOCKER_MAP = "true";
		process.env.LIOP_TOKEN_VAULT = "vault-local-test-token";
		process.env.LIOP_TOKEN_BANK = "bank-local-test-token";
		process.env.LIOP_TOKEN_ORACLE = "oracle-local-test-token";

		localServer = new LiopServer({
			name: "docker-mesh-test-agent",
			version: "1.0.0",
			capabilities: { tools: {} },
		});

		meshNode = new MeshNode({
			listenAddresses: ["/ip4/0.0.0.0/tcp/0"],
			bootstrapNodes: [
				"/ip4/127.0.0.1/tcp/13001/p2p/12D3KooWD8FUFdnLQzzLFNdicsaTknM5cpD7os9sK9NWVSVABJMD",
				"/ip4/127.0.0.1/tcp/13003/p2p/12D3KooWNWGunBEf4711xZ7gubmkVFzm5Z5UJkZsNru9T7fMZ2Uy",
				"/ip4/127.0.0.1/tcp/13004/p2p/12D3KooWQ1byTRQrf6Xx6PYjkeQ8hBGADarVf8rk4YRsjUcxKaSE",
				"/ip4/127.0.0.1/tcp/13005/p2p/12D3KooWDe8qtDnkFe69AWyUo9a7LhGKNiubzgsQin3gr9gap4vt",
			],
			enableWAN: false,
			enableAutoNAT: true,
			enableRelay: true,
			enableDcutr: true,
		});

		await meshNode.start();
		router = new LiopMcpRouter(localServer, meshNode);

		// Synchronize routing table and cache
		await new Promise((r) => setTimeout(r, 2000));
		await router.refreshManifestCache();
	}, 60000);

	afterAll(async () => {
		if (meshNode) {
			await meshNode.stop();
		}
	});

	it("should enforce rate limiting policies", () => {
		const rateLimiter = new InMemoryRateLimiter({ windowMs: 1000, maxRequests: 3 });
		expect(rateLimiter.check("client-a").allowed).toBe(true);
		expect(rateLimiter.check("client-a").allowed).toBe(true);
		expect(rateLimiter.check("client-a").allowed).toBe(true);
		expect(rateLimiter.check("client-a").allowed).toBe(false);
	});

	it("should verify gRPC channel symmetric keepalive options", () => {
		expect(GRPC_CHANNEL_OPTIONS["grpc.keepalive_time_ms"]).toBe(30000);
		expect(GRPC_CHANNEL_OPTIONS["grpc.keepalive_timeout_ms"]).toBe(10000);
		expect(GRPC_CHANNEL_OPTIONS["grpc.keepalive_permit_without_calls"]).toBe(1);
	});

	it("should verify P2P NAT Traversal and Relay services are active on the live mesh node", (ctx) => {
		if (!dockerOnline) {
			ctx.skip();
			return;
		}
		// biome-ignore lint/suspicious/noExplicitAny: internal libp2p service inspection
		const services = (meshNode as any).node?.services;
		expect(services).toBeDefined();
		expect(services.autoNAT).toBeDefined();
		expect(services.relay).toBeDefined();
		expect(services.dcutr).toBeDefined();
		expect(services.dht).toBeDefined();
	});

	it("should discover all 4 Docker mesh tools via Kademlia DHT", async (ctx) => {
		if (!dockerOnline) {
			ctx.skip();
			return;
		}
		const res = await router.dispatch({
			jsonrpc: "2.0",
			id: 1,
			method: "tools/list",
			params: {},
		});

		expect(res?.result).toBeDefined();
		// biome-ignore lint/suspicious/noExplicitAny: test assertion
		const tools = ((res?.result as any)?.tools || []).map((t: { name: string }) => t.name);
		expect(tools).toContain("Analyze_HFT_Market_Data");
		expect(tools).toContain("Analyze_Synthetic_Bank_Transactions");
		expect(tools).toContain("Analyze_Synthetic_Medical_Records");
		expect(tools).toContain("LiopMeshStatus");
	});

	it("should execute in-situ logic on Oracle (Analyze_HFT_Market_Data) via PQC & WASI", async (ctx) => {
		if (!dockerOnline) {
			ctx.skip();
			return;
		}
		const hftEnvelope = [
			"@LIOP{wasi_v1,HftAggregation}",
			"const records = env.records;",
			"return { tickCount: records.length, avgPrice: records.reduce((a, b) => a + b.price, 0) / records.length };",
			"@END",
		].join("\n");

		const res = await router.dispatch({
			jsonrpc: "2.0",
			id: 2,
			method: "tools/call",
			params: {
				name: "Analyze_HFT_Market_Data",
				arguments: { payload: hftEnvelope },
			},
		});

		// biome-ignore lint/suspicious/noExplicitAny: test assertion
		const callResult = res?.result as any;
		expect(callResult?.isError).toBeFalsy();
		const text = callResult?.content?.[0]?.text;
		expect(text).toBeDefined();
		const data = JSON.parse(text);
		const result = data.computation_result ?? data;
		expect(result.tickCount).toBeGreaterThan(0);
		expect(result.avgPrice).toBeGreaterThan(0);
		expect(data.zk_receipt).toBeDefined();
	}, 15000);

	it("should execute in-situ logic on Bank (Analyze_Synthetic_Bank_Transactions)", async (ctx) => {
		if (!dockerOnline) {
			ctx.skip();
			return;
		}
		const bankEnvelope = [
			"@LIOP{wasi_v1,BankAggregation}",
			"const records = env.records;",
			"return { accountCount: records.length, totalBalance: records.reduce((a, b) => a + b.balance, 0) };",
			"@END",
		].join("\n");

		const res = await router.dispatch({
			jsonrpc: "2.0",
			id: 3,
			method: "tools/call",
			params: {
				name: "Analyze_Synthetic_Bank_Transactions",
				arguments: { payload: bankEnvelope },
			},
		});

		// biome-ignore lint/suspicious/noExplicitAny: test assertion
		const callResult = res?.result as any;
		expect(callResult?.isError).toBeFalsy();
		const text = callResult?.content?.[0]?.text;
		expect(text).toBeDefined();
		const data = JSON.parse(text);
		const result = data.computation_result ?? data;
		expect(result.accountCount).toBeGreaterThan(0);
		expect(result.totalBalance).toBeGreaterThan(0);
		expect(data.zk_receipt).toBeDefined();
	}, 15000);

	it("should execute in-situ logic on Vault (Analyze_Synthetic_Medical_Records)", async (ctx) => {
		if (!dockerOnline) {
			ctx.skip();
			return;
		}
		const vaultEnvelope = [
			"@LIOP{wasi_v1,VaultAggregation}",
			"const records = env.records;",
			"return { patientCount: records.length, avgAge: records.reduce((a, b) => a + b.age, 0) / records.length };",
			"@END",
		].join("\n");

		const res = await router.dispatch({
			jsonrpc: "2.0",
			id: 4,
			method: "tools/call",
			params: {
				name: "Analyze_Synthetic_Medical_Records",
				arguments: { payload: vaultEnvelope },
			},
		});

		// biome-ignore lint/suspicious/noExplicitAny: test assertion
		const callResult = res?.result as any;
		expect(callResult?.isError).toBeFalsy();
		const text = callResult?.content?.[0]?.text;
		expect(text).toBeDefined();
		const data = JSON.parse(text);
		const result = data.computation_result ?? data;
		expect(result.patientCount).toBeGreaterThan(0);
		expect(result.avgAge).toBeGreaterThan(0);
		expect(data.zk_receipt).toBeDefined();
	}, 15000);

	it("should return healthy diagnostics from LiopMeshStatus", async (ctx) => {
		if (!dockerOnline) {
			ctx.skip();
			return;
		}
		const res = await router.dispatch({
			jsonrpc: "2.0",
			id: 5,
			method: "tools/call",
			params: {
				name: "LiopMeshStatus",
				arguments: {},
			},
		});

		// biome-ignore lint/suspicious/noExplicitAny: test assertion
		const text = (res?.result as any)?.content?.[0]?.text;
		expect(text).toContain("LIOP Mesh Status: Active");
		expect(text).toMatch(/\d+ Conns/);
		expect(text).toContain("Analyze_Synthetic_Bank_Transactions");
		expect(text).toContain("Analyze_HFT_Market_Data");
		expect(text).toContain("Analyze_Synthetic_Medical_Records");
	});

	it("should verify ML-DSA-65 (FIPS 204) post-quantum signatures on live manifests", async (ctx) => {
		if (!dockerOnline) {
			ctx.skip();
			return;
		}
		// biome-ignore lint/suspicious/noExplicitAny: internal manifest inspection
		const manifestCache = (router as any).manifestCache as Map<
			string,
			// biome-ignore lint/suspicious/noExplicitAny: test assertion
			{ manifest: any }
		>;
		expect(manifestCache.size).toBeGreaterThan(0);

		for (const [peerId, { manifest }] of manifestCache.entries()) {
			if (manifest.pqcSignature && manifest.pqcPublicKey) {
				const verified = Dilithium65Wrapper.verifyManifest(
					manifest,
					manifest.pqcSignature,
					manifest.pqcPublicKey,
				);
				expect(verified).toBe(true);
			}
		}
	});

	it("should support gRPC-Web HTTP/1.1 framing fallback on Nexus Gateway", async (ctx) => {
		if (!dockerOnline) {
			ctx.skip();
			return;
		}
		const requestPayload = encodeDataFrame(Buffer.from("grpc-web-ping"));
		const res = await fetch("http://127.0.0.1:13000/liop.LiopService/Intent", {
			method: "POST",
			headers: {
				"content-type": "application/grpc-web+proto",
			},
			body: requestPayload,
		});

		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toContain("application/grpc-web");
		const arrayBuf = await res.arrayBuffer();
		const responseBuf = Buffer.from(arrayBuf);
		const frames = decodeFrames(responseBuf);
		expect(frames.length).toBeGreaterThan(0);
		const trailer = frames.find((f) => f.isTrailer);
		expect(trailer).toBeDefined();
		expect(trailer?.payload.toString("utf-8")).toContain("grpc-status:0");
	});
});
