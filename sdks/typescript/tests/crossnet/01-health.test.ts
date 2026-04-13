import { expect, test, describe } from "vitest";

describe("Cross-Network: Health and Discovery", () => {
	const nexusUrl = process.env.NEXUS_URL || "http://172.20.0.10:3000";
	const vaultUrl = process.env.VAULT_URL || "http://172.20.0.11:3000";
	const agentUrl = process.env.AGENT_URL || "http://172.20.0.12:3000";

	test("Nexus is healthy and exposes identity", async () => {
		const res = await fetch(`${nexusUrl}/health`, {
			headers: { Accept: "application/json" }
		});
		expect(res.ok).toBe(true);
		const data = await res.json();
		expect(data.status).toBe("healthy");
		expect(data.mesh.peerId).toBeTruthy();
		expect(data.mesh.multiaddrs.length).toBeGreaterThan(0);
	});

	test("Vault is healthy and registered tools", async () => {
		const res = await fetch(`${vaultUrl}/health`, {
			headers: { Accept: "application/json" }
		});
		const data = await res.json();
		expect(data.status).toBe("healthy");
		expect(data.tools).toContain("Analyze_Synthetic_Medical_Records");
	});

	test("Agent is healthy", async () => {
		const res = await fetch(`${agentUrl}/health`, {
			headers: { Accept: "application/json" }
		});
		const data = await res.json();
		expect(data.status).toBe("healthy");
	});
});
