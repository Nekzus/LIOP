import { describe, expect, it, vi } from "vitest";
import type { MeshNode } from "../mesh/index.js";
import type { NmpServer } from "../server/index.js";
import { NmpMcpRouter } from "./router.js";

describe("NmpMcpRouter", () => {
	it("should return remote resource from manifest cache on resources/read fallback", async () => {
		const mockServer = {
			getServerInfo: () => ({ name: "test", version: "1" }),
			listTools: () => [],
			listResources: () => [],
			readResource: () => {
				throw new Error("Resource not found locally");
			},
		} as unknown as NmpServer;

		const mockMeshNode = {
			registerManifestHandler: vi.fn(),
			announceManifest: vi.fn().mockResolvedValue(true),
			getPeerId: () => "local-peer",
		} as unknown as MeshNode;

		const router = new NmpMcpRouter(mockServer, mockMeshNode);

		// Inject mock data into manifestCache using any cast to access private field
		// biome-ignore lint/suspicious/noExplicitAny: testing private field
		(router as any).manifestCache = new Map([
			[
				"remote-peer-id",
				{
					cachedAt: Date.now(),
					manifest: {
						peerId: "remote-peer-id",
						grpcPort: 1234,
						tools: [],
						resources: [
							{
								name: "Remote Schema",
								uri: "nmp://remote/schema",
								description: "A remote test schema",
								mimeType: "application/json",
								text: '{"foo": "bar"}',
							},
						],
						serverInfo: { name: "Remote", version: "1" },
					},
				},
			],
		]);

		const response = await router.dispatch({
			method: "resources/read",
			params: { uri: "nmp://remote/schema" },
			id: 1,
		});

		expect(response.error).toBeUndefined();
		expect(response.result.contents[0].uri).toBe("nmp://remote/schema");
		expect(response.result.contents[0].text).toBe('{"foo": "bar"}');
		expect(response.result.contents[0].mimeType).toBe("application/json");
	});
});
