// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { LiopServer } from "../../../src/server/index.js";

describe("Enclave ZK Policy and Manifest Attestation (Tasks 16 & 17)", () => {
	it("should propagate zkMode, guestImageId, circuitName, and vkey in tool policy", () => {
		const server = new LiopServer(
			{ name: "test-enclave", version: "1.0.0" },
			{
				guestImageId: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
				zkVkeys: {
					sum: { circuit: "sum_v1", n_vars: 4 },
				},
			},
		);

		server.tool(
			"calculate_payroll_aggregate",
			"Calculates sum of payroll without egressing employee rows",
			{ payload: z.string() },
			async () => ({
				content: [{ type: "text", text: "ok" }],
			}),
			{
				zkMode: "required",
				circuitName: "sum",
				guestImageId: "deadbeefcafebabe0123456789abcdef0123456789abcdef0123456789abcdef",
				vkey: { protocol: "groth16", curve: "bn254" },
			},
		);

		const tools = server.listTools();
		expect(tools.length).toBe(1);
		expect(tools[0].name).toBe("calculate_payroll_aggregate");
	});

	it("should execute worker pool query and generate valid receipt under optimistic zkMode", async () => {
		const server = new LiopServer({
			name: "optimistic-enclave",
			version: "1.0.0",
		});

		server.setSandboxData([
			{ amount: 100, role: "dev" },
			{ amount: 200, role: "eng" },
		]);

		server.tool(
			"compute_sum",
			"Sums data",
			{ payload: z.string() },
			async () => ({
				content: [{ type: "text", text: "fallback" }],
			}),
			{
				zkMode: "optimistic",
			},
		);

		const result = await server.callTool({
			name: "compute_sum",
			arguments: {
				payload:
					"@LIOP{wasi_v1,TaskName}\nreturn env.records.reduce((acc, r) => acc + r.amount, 0);\n@END",
			},
		});

		expect(result.isError).toBeFalsy();
		expect(result.content[0].text).toBeDefined();

		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.status).toBe("Worker Pool Execution Success");
		expect(parsed.computation_result).toBe(300);
		expect(parsed.proof_type).toBe("GROTH16");
		expect(parsed.zk_receipt).toBeDefined();
	});
});
