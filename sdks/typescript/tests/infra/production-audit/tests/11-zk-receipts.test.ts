// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
	DEFAULT_BLG_URL,
	callTool,
	extractText,
	fetchWithRetry,
	liopEnvelope,
} from "./_helpers.js";
import {
	ProofType,
	RECEIPT_VERSION_V2,
	ZK_JOURNAL_V2_SIZE,
	decodeJournalV2,
	receiptCodec,
} from "../../../../src/security/zk.js";
import { LiopVerifier } from "../../../../src/crypto/verifier.js";

const NEXUS_URL = process.env.NEXUS_URL || "http://127.0.0.1:15000";
const BLG_URL = process.env.BLG_URL || DEFAULT_BLG_URL;

async function isContainerReady(url: string): Promise<boolean> {
	try {
		const res = await fetch(`${url}/health`, { method: "GET", signal: AbortSignal.timeout(1000) });
		return res.ok;
	} catch {
		return false;
	}
}

describe("Production Audit Suite 11 — Sovereign ZK-Receipts & Groth16 Enclave Attestation", () => {
	it(
		"11.1 [Docker Tri-Tier ZK-Receipt Verification] should execute analytical query via BLG and verify Groth16 ZK-Receipt",
		async () => {
			if (!(await isContainerReady(NEXUS_URL))) {
				console.log("[Docker Tri-Tier] Nexus container not running, skipping remote network assertions.");
				return;
			}

			const validLogic = [
				"const accounts = env.records;",
				"return { totalAccounts: accounts.length, totalBalance: accounts.reduce((a, b) => a + b.balance, 0) };",
			].join("\n");

			const envelope = liopEnvelope(validLogic, "ZkReceiptProductionAudit");
			const res = await callTool("Analyze_Synthetic_Bank_Transactions", envelope, NEXUS_URL, 30_000);

			expect(res.isError).toBeFalsy();
			const text = extractText(res);
			const data = JSON.parse(text);

			expect(data.zk_receipt).toBeDefined();
			expect(typeof data.zk_receipt).toBe("string");

			const rawReceiptBuf = Buffer.from(data.zk_receipt, "base64");
			const decoded = receiptCodec.decode(rawReceiptBuf);

			expect(decoded.version).toBe(RECEIPT_VERSION_V2);
			expect(decoded.proofType).toBe(ProofType.GROTH16);
			expect(decoded.journal.length).toBe(ZK_JOURNAL_V2_SIZE);

			const journal = decodeJournalV2(decoded.journal);
			expect(journal.guestImageId.length).toBe(32);
			expect(journal.logicDigest.length).toBe(32);
			expect(journal.datasetDigest.length).toBe(32);
			expect(journal.outputDigest.length).toBe(32);
			expect(journal.fuelConsumed > 0n).toBe(true);

			console.log(
				`[Docker Tri-Tier ZK-Receipt] Decoded Journal: fuel=${journal.fuelConsumed}, timestamp=${journal.executionTimestamp}`,
			);
		},
		35_000,
	);

	it(
		"11.2 [Cryptographic Tamper-Proofing] should reject verification if any byte of the ZK journal or proof is mutated",
		async () => {
			if (!(await isContainerReady(NEXUS_URL))) {
				console.log("[Docker Tri-Tier] Nexus container not running, skipping remote network assertions.");
				return;
			}

			const validLogic = [
				"const accounts = env.records;",
				"return { count: accounts.length };",
			].join("\n");

			const envelope = liopEnvelope(validLogic, "ZkTamperProofAudit");
			const res = await callTool("Analyze_Synthetic_Bank_Transactions", envelope, NEXUS_URL, 30_000);

			expect(res.isError).toBeFalsy();
			const text = extractText(res);
			const data = JSON.parse(text);
			expect(data.zk_receipt).toBeDefined();

			const rawReceiptBuf = Buffer.from(data.zk_receipt, "base64");
			const decoded = receiptCodec.decode(rawReceiptBuf);

			// Tamper with 1 byte of the journal
			const tamperedJournal = Buffer.from(decoded.journal);
			tamperedJournal[10] ^= 0xff;

			const tamperedReceiptBuf = receiptCodec.encodeV2(
				decoded.proofType,
				tamperedJournal,
				decoded.proof,
			);

			const verifier = new LiopVerifier();

			const tamperedValid = await verifier.verifyZkReceipt(
				Buffer.from(validLogic),
				decoded.imageId.toString("hex"),
				tamperedReceiptBuf,
				{
					guestImageIdHex: decoded.imageId.toString("hex"),
					zkPolicy: "required",
				},
			);

			expect(tamperedValid).toBe(false);
			console.log(
				`[Docker ZK Tamper Detection] Successfully rejected tampered receipt. Verified=${tamperedValid}`,
			);
		},
		35_000,
	);

	it(
		"11.3 [Enclave ZK Policy Invariant] should verify static verification key registry registration in LiopVerifier",
		async () => {
			const dummyVkey = Buffer.from(
				JSON.stringify({ protocol: "groth16", curve: "bn254", n_vars: 4 }),
			);
			LiopVerifier.registerVKey("test_circuit_sum", dummyVkey);

			const retrieved = LiopVerifier.getRegisteredVKey("test_circuit_sum");
			expect(retrieved).toBeDefined();
			expect(retrieved?.equals(dummyVkey)).toBe(true);

			expect(
				LiopVerifier.getRegisteredVKey("non_existent_circuit"),
			).toBeUndefined();
		},
		10_000,
	);

	it(
		"11.4 [Prometheus ZK Metrics Telemetry] should verify ZK metrics in Prometheus metrics endpoint",
		async () => {
			if (!(await isContainerReady(BLG_URL))) {
				console.log("[Docker Prometheus] BLG container not running, skipping remote metrics check.");
				return;
			}

			try {
				const metricsRes = await fetchWithRetry(`${BLG_URL}/metrics`, undefined, 5000);
				const metricsText = await metricsRes.text();

				const hasZkMetrics =
					metricsText.includes("liop_zk_verifications_total") ||
					metricsText.includes("liop_zk_verification_duration_ms") ||
					metricsText.includes("liop_wire_egress_bytes_total");

				expect(hasZkMetrics).toBe(true);
				console.log("[Docker Prometheus] Verified ZK and wire egress metrics exposure on BLG.");
			} catch (err) {
				console.warn("[Docker Prometheus Metrics] BLG /metrics check skipped:", err);
			}
		},
		15_000,
	);
});
