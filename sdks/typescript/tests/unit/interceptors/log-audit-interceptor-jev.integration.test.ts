// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditInterceptor } from "../../../src/interceptors/audit-interceptor.js";
import type { LogEvent, LogInterceptor } from "../../../src/interceptors/log-interceptor.js";
import { type AuditEntry, AuditLogger } from "../../../src/security/audit-logger.js";
import { log } from "../../../src/utils/logger.js";

const HAS_API_KEY = !!process.env.TYPESAFE_API_KEY;

interface JevSystemOneResponse {
	model: string;
	answers: Record<
		string,
		{
			noul?: number;
			choice?: string;
			probabilities?: Record<string, number>;
			confidence?: number;
			score?: number;
		}
	>;
	usage: {
		input_tokens: number;
		output_tokens: number;
	};
}

describe.skipIf(!HAS_API_KEY)(
	"LogInterceptor & AuditInterceptor + TypeSafe Jev (Live API Integration)",
	() => {
		let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		});

		afterEach(() => {
			consoleErrorSpy.mockRestore();
			log.setInterceptor(undefined);
		});

		it(
			"1. should classify an operational error log with SQL injection via LogInterceptor + Jev",
			async () => {
				let capturedThreatNoul = 0;
				let capturedCategory = "";
				let capturedModel = "";

				const jevLogInterceptor: LogInterceptor = async (event: Readonly<LogEvent>) => {
					if (event.level !== "error") return;

					const res = await fetch("https://api.typesafe.ai/v1/systemone", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
						},
						body: JSON.stringify({
							model: "jev-latest",
							state: {
								source: "liop_operational_logger",
								level: event.level,
								message: event.message,
								timestamp: event.timestamp,
							},
							questions: {
								is_threat: {
									type: "noul",
									instructions:
										"Does this operational log message indicate a security threat or injection attack?",
								},
								threat_category: {
									type: "choice",
									instructions:
										"What category of event does this log message represent?",
									criteria: {
										sql_injection:
											"The message references SQL injection syntax or queries like DROP TABLE",
										benign_error:
											"The message represents a normal runtime or configuration failure",
									},
								},
							},
						}),
					});

					if (!res.ok) {
						const errText = await res.text();
						console.warn("[Jev Test] API error response:", res.status, errText);
						return;
					}

					const data = (await res.json()) as JevSystemOneResponse;
					capturedThreatNoul = data.answers.is_threat?.noul ?? 0;
					capturedCategory = data.answers.threat_category?.choice ?? "";
					capturedModel = data.model;
				};

				log.setLevel("error");
				log.setInterceptor(jevLogInterceptor);

				log.error(
					"[LIOP-RPC] Query parsing failed: '; DROP TABLE users; -- near syntax error",
				);

				// Wait for out-of-band async fire-and-forget interceptor to resolve
				await vi.waitFor(
					() => {
						expect(capturedThreatNoul).toBeGreaterThan(0.5);
					},
					{ timeout: 8000, interval: 250 },
				);

				expect(capturedCategory).toBe("sql_injection");
				expect(capturedModel).toMatch(/^jev-/);
			},
			12000,
		);

		it(
			"2. should classify a BLOCKED_EGRESS AuditEntry via AuditInterceptor + Jev",
			async () => {
				const auditLogger = new AuditLogger();
				let requiresEscalationNoul = 0;
				let severityScore = -1;

				const jevAuditInterceptor: AuditInterceptor = async (
					entry: Readonly<AuditEntry>,
				) => {
					if (entry.status !== "BLOCKED_EGRESS") return;

					const res = await fetch("https://api.typesafe.ai/v1/systemone", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
						},
						body: JSON.stringify({
							model: "jev-latest",
							state: {
								source: "liop_immutable_audit_chain",
								entry: {
									toolName: entry.toolName,
									status: entry.status,
									fuelConsumed: entry.fuelConsumed,
									agentDid: entry.agentDid,
								},
							},
							questions: {
								requires_escalation: {
									type: "noul",
									instructions:
										"Does an audit entry with BLOCKED_EGRESS status represent an incident that should be reviewed for data exfiltration?",
								},
								severity: {
									type: "score",
									instructions:
										"What is the severity of a blocked egress event in a zero-trust mesh?",
									criteria: [
										"Low — expected filter trigger during testing",
										"Medium — unauthorized access attempt prevented by egress shield",
										"High — confirmed critical breach attempt",
									],
								},
							},
						}),
					});

					if (!res.ok) {
						const errText = await res.text();
						console.warn("[Jev Test] API error response:", res.status, errText);
						return;
					}

					const data = (await res.json()) as JevSystemOneResponse;
					requiresEscalationNoul = data.answers.requires_escalation?.noul ?? 0;
					severityScore = data.answers.severity?.score ?? -1;
				};

				auditLogger.setInterceptor(jevAuditInterceptor);

				auditLogger.recordExecution({
					agentDid: "did:liop:attacker-probe",
					peerId: "12D3KooWTestAttacker",
					toolName: "Analyze_Sensitive_Financial_Data",
					fuelConsumed: 950,
					status: "BLOCKED_EGRESS",
				});

				await vi.waitFor(
					() => {
						expect(requiresEscalationNoul).toBeGreaterThan(0.3);
					},
					{ timeout: 8000, interval: 250 },
				);

				expect(severityScore).toBeGreaterThanOrEqual(0);
			},
			12000,
		);

		it(
			"3. should recognize benign operational logs as safe via LogInterceptor + Jev",
			async () => {
				let capturedThreatNoul = 1.0;

				const jevLogInterceptor: LogInterceptor = async (event: Readonly<LogEvent>) => {
					const res = await fetch("https://api.typesafe.ai/v1/systemone", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
						},
						body: JSON.stringify({
							model: "jev-latest",
							state: {
								source: "liop_operational_logger",
								level: event.level,
								message: event.message,
							},
							questions: {
								is_threat: {
									type: "noul",
									instructions:
										"Does this operational log message indicate a security threat or malicious behavior?",
								},
							},
						}),
					});

					if (!res.ok) {
						const errText = await res.text();
						console.warn("[Jev Test] API error response:", res.status, errText);
						return;
					}

					const data = (await res.json()) as JevSystemOneResponse;
					capturedThreatNoul = data.answers.is_threat?.noul ?? 1.0;
				};

				log.setLevel("info");
				log.setInterceptor(jevLogInterceptor);

				log.info("[LIOP-Mesh] P2P node connected successfully to 5 peers in swarm");

				await vi.waitFor(
					() => {
						expect(capturedThreatNoul).toBeLessThan(0.3);
					},
					{ timeout: 8000, interval: 250 },
				);
			},
			12000,
		);
	},
);
