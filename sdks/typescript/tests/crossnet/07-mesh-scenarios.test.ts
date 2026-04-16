import { describe, it, expect } from "vitest";
import { listTools, findToolByBaseName } from "./_helpers.js";

describe("07-mesh-scenarios: Dynamic Topology", () => {
	it("should converge discovery and expose all expected remote analysis tools", async () => {
		// Retry window for dynamic convergence in real mesh.
		const deadline = Date.now() + 20_000;
		const expected = [
			"Analyze_Synthetic_Medical_Records",
			"Analyze_Synthetic_Bank_Transactions",
			"Analyze_Synthetic_Market_Data",
		];

		let lastTools: string[] = [];
		while (Date.now() < deadline) {
			lastTools = (await listTools()).map((t) => t.name);
			const ok = expected.every((name) =>
				lastTools.some((tool) => tool === name || tool.startsWith(`${name}_`)),
			);
			if (ok) break;
			await new Promise((r) => setTimeout(r, 1000));
		}

		for (const name of expected) {
			await expect(findToolByBaseName(name)).resolves.toBeTruthy();
		}
	});
});
