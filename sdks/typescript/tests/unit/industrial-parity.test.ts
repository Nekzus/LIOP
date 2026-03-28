import { describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LiopServer } from "../../src/server/index.js";
import { LiopMcpBridge } from "../../src/bridge/index.js";

describe("Industrial Parity v1.2.0 (Tier-0)", () => {
	describe("LiopServer Enhancements", () => {
		it("should support workerPool options in constructor", () => {
			const server = new LiopServer({ name: "test", version: "1" }, {
				workerPool: {
					minThreads: 4,
					maxThreads: 12
				}
			});

			// Access private property for verification
			const pool = (server as any).workerPool;
			expect(pool.options.minThreads).toBe(4);
			expect(pool.options.maxThreads).toBe(12);
		});

		it("should support .connect() as an alias for .connectToMesh()", async () => {
			const server = new LiopServer({ name: "test", version: "1" });
			const spy = vi.spyOn(server, "connectToMesh").mockResolvedValue(undefined as any);
			
			await server.connect({ port: 1234 });
			
			expect(spy).toHaveBeenCalledWith({ port: 1234 });
			spy.mockRestore();
		});

		it("should synchronize capabilities to serverInfo automatically", () => {
			const server = new LiopServer({ name: "test", version: "1" }, {
				capabilities: {
					custom_cap: { enabled: true }
				}
			});

			expect(server.getServerInfo().capabilities).toBeDefined();
			expect((server.getServerInfo().capabilities as any).custom_cap.enabled).toBe(true);
		});
	});

	describe("LiopMcpBridge Bi-directionality", () => {
		it("should identify Mode: EXPOSE when given a LiopServer", () => {
			const liop = new LiopServer({ name: "l", version: "1" });
			const bridge = new LiopMcpBridge(liop);
			
			expect((bridge as any).liopServer).toBe(liop);
			expect((bridge as any).legacyMcpServer).toBeNull();
		});

		it("should identify Mode: WRAP when given an McpServer", () => {
			const mcp = new McpServer({ name: "m", version: "1" });
			const bridge = new LiopMcpBridge(mcp);
			
			expect((bridge as any).legacyMcpServer).toBe(mcp);
			expect((bridge as any).liopServer).toBeNull();
		});

		it("should create a dynamic LiopServer in WRAP mode during connect", async () => {
			const mcp = new McpServer({ name: "m", version: "1" });
			const bridge = new LiopMcpBridge(mcp);
			
			await bridge.connect();
			
			expect((bridge as any).liopServer).toBeDefined();
			expect((bridge as any).liopServer.getServerInfo().name).toBe("BridgedLegacyNode");
		});
	});
});
