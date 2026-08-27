import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
	AuditLogger,
	GENESIS_HASH,
	computeEntryHash,
} from "../../../src/security/audit-logger.js";

describe("Immutable Audit Logger — SOC 2 & HIPAA (Phase Beta-3)", () => {
	it("should initialize with GENESIS_HASH and record chain correctly", () => {
		const logger = new AuditLogger();
		expect(logger.getEntryCount()).toBe(0);

		const entry1 = logger.recordExecution({
			agentDid: "did:key:z6Mku",
			peerId: "12D3KooWtest",
			toolName: "Analyze_HFT_Market_Data",
			fuelConsumed: 1500,
			status: "SUCCESS",
			zkReceiptSig: "sig123",
		});

		expect(entry1.prevEntryHash).toBe(GENESIS_HASH);
		expect(entry1.entryHash).toBeDefined();
		expect(entry1.entryHash.length).toBe(64);

		const entry2 = logger.recordExecution({
			agentDid: "did:key:z6Mku",
			peerId: "12D3KooWtest",
			toolName: "Analyze_Synthetic_Bank_Transactions",
			fuelConsumed: 2500,
			status: "SUCCESS",
			zkReceiptSig: "sig456",
		});

		expect(entry2.prevEntryHash).toBe(entry1.entryHash);
		expect(logger.getEntryCount()).toBe(2);

		const integrity = logger.verifyIntegrity();
		expect(integrity.valid).toBe(true);
		expect(integrity.totalEntries).toBe(2);
	});

	it("should detect tampering if an entry field is modified", () => {
		const logger = new AuditLogger();
		logger.recordExecution({
			agentDid: "did:key:z1",
			peerId: "peer1",
			toolName: "tool1",
			fuelConsumed: 100,
			status: "SUCCESS",
		});
		logger.recordExecution({
			agentDid: "did:key:z2",
			peerId: "peer2",
			toolName: "tool2",
			fuelConsumed: 200,
			status: "SUCCESS",
		});

		// Tamper with the internal entries
		// biome-ignore lint/suspicious/noExplicitAny: Intentional tampering test
		const entries = (logger as any).entries;
		entries[0].fuelConsumed = 999999; // Maliciously altered

		const integrity = logger.verifyIntegrity();
		expect(integrity.valid).toBe(false);
		expect(integrity.brokenIndex).toBe(0);
		expect(integrity.reason).toContain("Tampered entry at index 0");
	});

	it("should detect tampering if an entry is deleted or reordered (broken chain)", () => {
		const logger = new AuditLogger();
		logger.recordExecution({
			agentDid: "did:key:z1",
			peerId: "peer1",
			toolName: "tool1",
			fuelConsumed: 100,
			status: "SUCCESS",
		});
		logger.recordExecution({
			agentDid: "did:key:z2",
			peerId: "peer2",
			toolName: "tool2",
			fuelConsumed: 200,
			status: "SUCCESS",
		});
		logger.recordExecution({
			agentDid: "did:key:z3",
			peerId: "peer3",
			toolName: "tool3",
			fuelConsumed: 300,
			status: "SUCCESS",
		});

		// Remove middle entry
		// biome-ignore lint/suspicious/noExplicitAny: Intentional chain deletion test
		const entries = (logger as any).entries;
		entries.splice(1, 1);

		const integrity = logger.verifyIntegrity();
		expect(integrity.valid).toBe(false);
		expect(integrity.brokenIndex).toBe(1);
		expect(integrity.reason).toContain("Broken hash chain at index 1");
	});

	it("should support file persistence in JSONL format", () => {
		const tmpFile = path.join(os.tmpdir(), `audit_test_${Date.now()}.jsonl`);

		try {
			const logger1 = new AuditLogger(tmpFile);
			logger1.recordExecution({
				agentDid: "did:key:z1",
				peerId: "peer1",
				toolName: "persist_test",
				fuelConsumed: 500,
				status: "SUCCESS",
			});

			// Re-open in a second logger instance
			const logger2 = new AuditLogger(tmpFile);
			expect(logger2.getEntryCount()).toBe(1);
			expect(logger2.verifyIntegrity().valid).toBe(true);

			const secondEntry = logger2.recordExecution({
				agentDid: "did:key:z2",
				peerId: "peer2",
				toolName: "persist_test_2",
				fuelConsumed: 750,
				status: "SUCCESS",
			});

			expect(logger2.getEntryCount()).toBe(2);
			expect(logger2.verifyIntegrity().valid).toBe(true);
			expect(secondEntry.prevEntryHash).toBe(logger1.getEntries()[0].entryHash);
		} finally {
			if (fs.existsSync(tmpFile)) {
				fs.unlinkSync(tmpFile);
			}
		}
	});
});
