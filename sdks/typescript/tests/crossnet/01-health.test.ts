import { beforeAll, expect, test, describe } from "vitest";
import { waitForHealthy } from "./_helpers.js";

describe("Cross-Network: Health and Discovery", () => {
	const nexusUrl = process.env.NEXUS_URL || "http://127.0.0.1:13000";
	const vaultUrl = process.env.VAULT_URL || "http://127.0.0.1:13013";
	const agentUrl = process.env.AGENT_URL || "http://127.0.0.1:13000";
	let nexusHealth: any;
	let vaultHealth: any;
	let agentHealth: any;

	beforeAll(async () => {
		nexusHealth = await waitForHealthy(nexusUrl);
		vaultHealth = await waitForHealthy(vaultUrl);
		agentHealth = await waitForHealthy(agentUrl);
	}, 40_000);

	test("Nexus is healthy and exposes identity", async () => {
		expect(nexusHealth.status).toBe("healthy");
		expect(nexusHealth.mesh.peerId).toBeTruthy();
		expect(nexusHealth.mesh.multiaddrs.length).toBeGreaterThan(0);
	});

	test("Vault is healthy and registered tools", async () => {
		expect(vaultHealth.status).toBe("healthy");
		expect(vaultHealth.tools).toContain("Analyze_Synthetic_Medical_Records");
	});

	test("Agent is healthy", async () => {
		expect(agentHealth.status).toBe("healthy");
	});
});
