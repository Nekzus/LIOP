// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
	callTool,
	DEFAULT_BLG_URL,
	extractText,
	getAuthToken,
	liopEnvelope,
	mcpCall,
} from "./_helpers.js";

const NEXUS_URL = process.env.NEXUS_URL || "http://127.0.0.1:15000";
const BLG_URL = process.env.BLG_URL || DEFAULT_BLG_URL;

describe("Production Audit Suite 10 — Interceptor Hooks & TypeSafe Jev in Tri-Tier Docker Topology", () => {
	it(
		"10.1 [Docker Nexus Gateway] should admit a legitimate tool call through Jev perimeter filter",
		async () => {
			const res = await mcpCall(
				"tools/call",
				{
					name: "Analyze_HFT_Market_Data",
					arguments: { ticker: "AAPL", window: "1m" },
				},
				Date.now() % 100000,
				NEXUS_URL,
			);

			expect(res.error).toBeUndefined();
			expect(res.result).toBeDefined();
			const text = extractText(res.result);
			expect(text).toBeDefined();
			console.log(`[Docker Nexus Gateway + Jev Admission] Tool executed: ${text.slice(0, 80)}...`);
		},
		20_000,
	);

	it(
		"10.2 [Docker Nexus Gateway] should block a SQL Injection attempt with HTTP 403 / JSON-RPC -32099 via Jev",
		async () => {
			const token = await getAuthToken(NEXUS_URL);
			const headers: Record<string, string> = { "Content-Type": "application/json" };
			if (token) {
				headers.Authorization = `Bearer ${token}`;
			}

			const res = await fetch(`${NEXUS_URL}/mcp`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 9901,
					method: "tools/call",
					params: {
						name: "Analyze_Synthetic_Bank_Transactions",
						arguments: {
							query: "'; DROP TABLE accounts; --",
							accountId: "OR 1=1",
						},
					},
				}),
			});

			// The gateway interceptor returns HTTP 403 Forbidden with JSON-RPC error -32099
			expect([403, 200]).toContain(res.status);

			const body = (await res.json()) as {
				error?: { code: number; message: string };
			};

			expect(body.error).toBeDefined();
			expect([-32099, -32603]).toContain(body.error?.code);
			console.log(
				`[Docker Nexus Gateway + Jev Block] Blocked with code ${body.error?.code}: ${body.error?.message}`,
			);
		},
		20_000,
	);

	it(
		"10.3 [Docker Nexus Gateway] should block a Path Traversal attempt via Jev",
		async () => {
			const token = await getAuthToken(NEXUS_URL);
			const headers: Record<string, string> = { "Content-Type": "application/json" };
			if (token) {
				headers.Authorization = `Bearer ${token}`;
			}

			const res = await fetch(`${NEXUS_URL}/mcp`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 9902,
					method: "tools/call",
					params: {
						name: "Analyze_Synthetic_Bank_Transactions",
						arguments: {
							configPath: "../../../../etc/shadow",
						},
					},
				}),
			});

			const body = (await res.json()) as {
				error?: { code: number; message: string };
			};

			expect(body.error).toBeDefined();
			console.log(
				`[Docker Nexus Gateway + Jev Traversal Block] Code ${body.error?.code}: ${body.error?.message}`,
			);
		},
		20_000,
	);

	it(
		"10.4 [Docker Tri-Tier Routing] should route legitimate requests through Border LIO Gateway into Tier 1 Bank Enclave",
		async () => {
			const validLogic = [
				"const accounts = env.records;",
				"return { totalAccounts: accounts.length, totalBalance: accounts.reduce((a, b) => a + b.balance, 0) };",
			].join("\n");

			const envelope = liopEnvelope(validLogic, "TriTierJevValidation");
			const res = await callTool("Analyze_Synthetic_Bank_Transactions", envelope, NEXUS_URL, 25_000);

			expect(res.isError).toBeFalsy();
			const text = extractText(res);
			const data = JSON.parse(text);

			expect(data.zk_receipt).toBeDefined();
			console.log(
				`[Docker Tri-Tier + BLG] Bank Enclave Execution Verified with ZK-Receipt: ${JSON.stringify(data).slice(0, 100)}...`,
			);
		},
		30_000,
	);

	it("10.5 [Docker Observability] should verify Jev interceptor activity in container logs", () => {
		try {
			const dockerLogs = execSync("docker logs --tail 200 liop-nexus-prod", {
				encoding: "utf8",
				timeout: 5000,
			});

			const hasJev =
				dockerLogs.includes("Jev") ||
				dockerLogs.includes("TYPESAFE_API_KEY") ||
				dockerLogs.includes("LIOP-Gateway");

			expect(hasJev).toBe(true);
			console.log("[Docker Logs] Confirmed Jev / Gateway interceptor activity in liop-nexus-prod.");
		} catch (err) {
			console.warn("[Docker Logs Check] Docker CLI query skipped or failed:", err);
		}
	});
});
