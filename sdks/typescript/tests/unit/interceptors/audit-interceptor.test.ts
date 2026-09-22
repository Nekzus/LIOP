// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { AuditInterceptor } from "../../../src/interceptors/audit-interceptor.js";
import {
	type AuditEntry,
	AuditLogger,
	GENESIS_HASH,
} from "../../../src/security/audit-logger.js";

describe("AuditInterceptor - AuditLogger integration", () => {
	it("1. should record execution normally with zero overhead when no interceptor is registered", () => {
		const logger = new AuditLogger();
		const entry = logger.recordExecution({
			agentDid: "did:liop:test-1",
			peerId: "peer-1",
			toolName: "TestTool",
			fuelConsumed: 100,
			status: "SUCCESS",
		});

		expect(entry.id).toBeDefined();
		expect(entry.entryHash).toBeDefined();
		expect(entry.prevEntryHash).toBe(GENESIS_HASH);
		expect(logger.verifyIntegrity().valid).toBe(true);
	});

	it("2. should invoke synchronous interceptor with fully sealed AuditEntry", () => {
		const logger = new AuditLogger();
		const intercepted: AuditEntry[] = [];
		const interceptor: AuditInterceptor = (entry) => {
			intercepted.push(entry);
		};

		logger.setInterceptor(interceptor);
		const entry = logger.recordExecution({
			agentDid: "did:liop:agent-2",
			peerId: "peer-2",
			toolName: "FinancialQuery",
			fuelConsumed: 250,
			status: "SUCCESS",
		});

		expect(intercepted).toHaveLength(1);
		expect(intercepted[0].id).toBe(entry.id);
		expect(intercepted[0].entryHash).toBe(entry.entryHash);
		expect(intercepted[0].toolName).toBe("FinancialQuery");
		expect(intercepted[0].status).toBe("SUCCESS");
	});

	it("3. should deliver an immutable deep-clone that cannot tamper with hash chain", () => {
		const logger = new AuditLogger();
		logger.setInterceptor((entry) => {
			expect(Object.isFrozen(entry)).toBe(true);
			try {
				// biome-ignore lint/suspicious/noExplicitAny: testing immutability
				(entry as any).status = "TAMPERED";
			} catch {
				// Expected in strict mode
			}
		});

		const entry = logger.recordExecution({
			agentDid: "did:liop:agent-3",
			peerId: "peer-3",
			toolName: "SecureAudit",
			fuelConsumed: 150,
			status: "SUCCESS",
		});

		expect(entry.status).toBe("SUCCESS");
		expect(logger.verifyIntegrity().valid).toBe(true);
	});

	it("4. should fire after hash computation (timing invariant)", () => {
		const logger = new AuditLogger();
		let observedHash = "";

		logger.setInterceptor((entry) => {
			observedHash = entry.entryHash;
		});

		const entry = logger.recordExecution({
			agentDid: "did:liop:agent-4",
			peerId: "peer-4",
			toolName: "TimingCheck",
			fuelConsumed: 50,
			status: "SUCCESS",
		});

		expect(observedHash).toBe(entry.entryHash);
		expect(observedHash).toHaveLength(64); // SHA-256 hex
	});

	it("5. should maintain cryptographic hash chain integrity across multiple intercepted entries", () => {
		const logger = new AuditLogger();
		const intercepted: AuditEntry[] = [];

		logger.setInterceptor((entry) => {
			intercepted.push(entry);
		});

		const entry1 = logger.recordExecution({
			agentDid: "did:liop:agent-5",
			peerId: "peer-5",
			toolName: "Step1",
			fuelConsumed: 10,
			status: "SUCCESS",
		});

		const entry2 = logger.recordExecution({
			agentDid: "did:liop:agent-5",
			peerId: "peer-5",
			toolName: "Step2",
			fuelConsumed: 20,
			status: "BLOCKED_EGRESS",
		});

		expect(intercepted).toHaveLength(2);
		expect(entry2.prevEntryHash).toBe(entry1.entryHash);
		expect(logger.verifyIntegrity()).toEqual({
			valid: true,
			totalEntries: 2,
		});
	});

	it("6. should silently handle synchronous interceptor exceptions without breaking audit logging", () => {
		const logger = new AuditLogger();
		logger.setInterceptor(() => {
			throw new Error("SIEM pipeline offline");
		});

		let entry: AuditEntry | null = null;
		expect(() => {
			entry = logger.recordExecution({
				agentDid: "did:liop:agent-6",
				peerId: "peer-6",
				toolName: "ResilientExecution",
				fuelConsumed: 80,
				status: "ERROR",
			});
		}).not.toThrow();

		expect(entry).not.toBeNull();
		expect(logger.verifyIntegrity().valid).toBe(true);
	});

	it("7. should silently handle asynchronous interceptor rejections without unhandled rejection", async () => {
		const logger = new AuditLogger();
		logger.setInterceptor(async () => {
			throw new Error("Async SIEM timeout");
		});

		expect(() => {
			logger.recordExecution({
				agentDid: "did:liop:agent-7",
				peerId: "peer-7",
				toolName: "AsyncResilience",
				fuelConsumed: 90,
				status: "POLICY_VIOLATION",
			});
		}).not.toThrow();

		await new Promise((r) => setTimeout(r, 10));
		expect(logger.verifyIntegrity().valid).toBe(true);
	});

	it("8. should cleanly disable interception when set to undefined", () => {
		const logger = new AuditLogger();
		let count = 0;
		logger.setInterceptor(() => {
			count++;
		});

		logger.recordExecution({
			agentDid: "did:liop:agent-8",
			peerId: "peer-8",
			toolName: "StepA",
			fuelConsumed: 10,
			status: "SUCCESS",
		});
		expect(count).toBe(1);

		logger.setInterceptor(undefined);
		logger.recordExecution({
			agentDid: "did:liop:agent-8",
			peerId: "peer-8",
			toolName: "StepB",
			fuelConsumed: 10,
			status: "SUCCESS",
		});
		expect(count).toBe(1);
	});
});
