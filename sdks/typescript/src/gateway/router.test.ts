import { describe, expect, it, vi } from "vitest";
import type { MeshNode } from "../mesh/index.js";
import type { LiopServer } from "../server/index.js";
import { LiopMcpRouter } from "./router.js";

describe("LiopMcpRouter", () => {
	it("should return remote resource from manifest cache on resources/read fallback", async () => {
		const mockServer = {
			getServerInfo: () => ({ name: "test", version: "1" }),
			listTools: () => [],
			listResources: () => [],
			readResource: () => {
				throw new Error("Resource not found locally");
			},
		} as unknown as LiopServer;

		const mockMeshNode = {
			registerManifestHandler: vi.fn(),
			announceManifest: vi.fn().mockResolvedValue(true),
			getPeerId: () => "local-peer",
		} as unknown as MeshNode;

		const router = new LiopMcpRouter(mockServer, mockMeshNode);

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
								uri: "liop://remote/schema",
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
			params: { uri: "liop://remote/schema" },
			id: 1,
		});

		expect(response).not.toBeNull();
		// biome-ignore lint/suspicious/noExplicitAny: test payload verification
		const result = response?.result as any;
		expect(response?.error).toBeUndefined();
		expect(result.contents[0].uri).toBe("liop://remote/schema");
		expect(result.contents[0].text).toBe('{"foo": "bar"}');
		expect(result.contents[0].mimeType).toBe("application/json");
	});
});
