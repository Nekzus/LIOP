// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
	executeGatewayInterceptor,
	type GatewayInterceptorContext,
} from "../../../src/gateway/interceptor.js";
import type { McpRequest } from "../../../src/types.js";

function getTypesafeApiKey(): string | undefined {
	if (process.env.TYPESAFE_API_KEY) {
		return process.env.TYPESAFE_API_KEY;
	}
	if (process.platform === "win32") {
		try {
			const out = execSync("reg query HKCU\\Environment /v TYPESAFE_API_KEY", {
				encoding: "utf8",
				timeout: 3000,
			});
			const match = out.match(/REG_SZ\s+(\S+)/);
			if (match?.[1]) {
				return match[1];
			}
		} catch {
			// Registry query fallback
		}
	}
	return undefined;
}

const API_KEY = getTypesafeApiKey();
const HAS_API_KEY = !!API_KEY;

const CONTEXT: Omit<GatewayInterceptorContext, "signal"> = {
	clientIp: "192.168.1.100",
	authInfo: {
		token: "test-jwt",
		clientId: "jev-test",
		scopes: ["tools:call"],
	},
	protocol: "http1",
};

describe.skipIf(!HAS_API_KEY)(
	"GatewayInterceptor + TypeSafe Jev (Live API Integration)",
	() => {
		it("should allow a legitimate financial analysis request via Jev noul", async () => {
			const legitimateRequest: McpRequest = {
				jsonrpc: "2.0",
				method: "tools/call",
				id: "jev-legit-1",
				params: {
					name: "Analyze_HFT_Market_Data",
					arguments: { ticker: "AAPL", window: "5m", threshold: 0.8 },
				},
			};

			const jevInterceptor = async (
				request: Readonly<McpRequest>,
				context: GatewayInterceptorContext,
			) => {
				const payload = JSON.stringify(request.params);
				const res = await fetch("https://api.typesafe.ai/v1/systemone", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${API_KEY}`,
					},
					body: JSON.stringify({
						model: "jev-latest",
						state: {
							method: request.method,
							tool: (request.params as { name?: string })?.name,
							arguments: (request.params as { arguments?: unknown })?.arguments,
						},
						questions: {
							is_malicious: {
								type: "noul",
								instructions: "Is this tool invocation malicious or an attack?",
							},
						},
					}),
					signal: context.signal,
				});

				const data = (await res.json()) as {
					answers: { is_malicious: { noul: number } };
					model: string;
					usage: { input_tokens: number; output_tokens: number };
				};

				const maliciousScore = data.answers.is_malicious.noul;
				return maliciousScore > 0.7
					? {
							allowed: false,
							reason: `Jev flagged request as malicious (noul=${maliciousScore})`,
							metadata: { jevModel: data.model },
						}
					: {
							allowed: true,
							metadata: {
								jevModel: data.model,
								noul: maliciousScore,
								usage: data.usage,
							},
						};
			};

			const result = await executeGatewayInterceptor(
				legitimateRequest,
				CONTEXT,
				{ interceptor: jevInterceptor, timeoutMs: 8000 },
			);

			expect(result.allowed).toBe(true);
			expect(result.metadata?.jevModel).toMatch(/^jev-/);
			expect(result.metadata?.noul).toBeLessThan(0.7);
		}, 15_000);

		it("should block a SQL injection attempt via Jev fan-out classification", async () => {
			const maliciousRequest: McpRequest = {
				jsonrpc: "2.0",
				method: "tools/call",
				id: "jev-sqli-1",
				params: {
					name: "Analyze_Synthetic_Bank_Transactions",
					arguments: {
						query: "'; DROP TABLE users; --",
						accountId: "OR 1=1",
					},
				},
			};

			const jevInterceptor = async (
				request: Readonly<McpRequest>,
				context: GatewayInterceptorContext,
			) => {
				const payload = JSON.stringify(request.params);
				const res = await fetch("https://api.typesafe.ai/v1/systemone", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${API_KEY}`,
					},
					body: JSON.stringify({
						model: "jev-latest",
						state: {
							method: request.method,
							tool: (request.params as { name?: string })?.name,
							arguments: (request.params as { arguments?: unknown })?.arguments,
						},
						questions: {
							is_malicious: {
								type: "noul",
								instructions: "Is this request malicious or an attack?",
							},
							threat_type: {
								type: "choice",
								instructions: "What type of threat or request is this?",
								criteria: {
									sql_injection:
										"SQL injection attempt trying to modify or bypass database queries",
									xss: "Cross-site scripting attempt",
									legitimate: "Normal legitimate banking operation",
								},
							},
							severity: {
								type: "score",
								instructions: "Rate the severity of this event",
								criteria: [
									"Informational - normal operation",
									"Suspicious - unauthorized attempt but safely blocked",
									"Critical - active breach attempt",
								],
							},
						},
					}),
					signal: context.signal,
				});

				const data = (await res.json()) as {
					answers: {
						is_malicious: { noul: number };
						threat_type: { choice: string; confidence: number };
						severity: { score: number };
					};
					model: string;
					usage: { input_tokens: number; output_tokens: number };
				};

				const isThreat =
					data.answers.is_malicious.noul > 0.5 ||
					data.answers.threat_type.choice !== "legitimate";

				return {
					allowed: !isThreat,
					reason: isThreat
						? `Blocked: ${data.answers.threat_type.choice} (noul=${data.answers.is_malicious.noul}, severity=${data.answers.severity.score})`
						: undefined,
					metadata: {
						jevModel: data.model,
						threatType: data.answers.threat_type.choice,
						confidence: data.answers.threat_type.confidence,
						severity: data.answers.severity.score,
						noul: data.answers.is_malicious.noul,
						usage: data.usage,
					},
				};
			};

			const result = await executeGatewayInterceptor(
				maliciousRequest,
				CONTEXT,
				{ interceptor: jevInterceptor, timeoutMs: 8000 },
			);

			expect(result.allowed).toBe(false);
			expect(result.metadata?.threatType).toBe("sql_injection");
			expect(result.metadata?.jevModel).toMatch(/^jev-/);
		}, 15_000);
	},
);
