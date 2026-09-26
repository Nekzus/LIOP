// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { LiopVerifier } from "../../../src/crypto/verifier.js";

describe("Hardware TEE Attestation Pre-Flight (Brecha 3 / AMD SEV-SNP & AWS Nitro)", () => {
	const verifier = new LiopVerifier();

	const mockPublicKey = crypto.randomBytes(1184); // e.g. ML-KEM-768 public key
	const mockNonce = crypto.randomBytes(32);
	const expectedBinding = crypto
		.createHash("sha256")
		.update(Buffer.concat([mockPublicKey, mockNonce]))
		.digest();

	it("should verify a legitimate AMD SEV-SNP attestation report with matching REPORT_DATA", async () => {
		// AMD SEV-SNP standard report is 1184 bytes
		const sevReport = Buffer.alloc(1184, 0);
		// Set version
		sevReport.writeUInt32LE(1, 0);
		// Set VMPL = 0
		sevReport.writeUInt32LE(0, 0x40);
		// Embed expected binding hash in REPORT_DATA (offset 0x50, 64 bytes total)
		expectedBinding.copy(sevReport, 0x50);
		// Set launch measurement (offset 0x90, 48 bytes)
		const mockMeasurement = crypto.randomBytes(48);
		mockMeasurement.copy(sevReport, 0x90);

		const result = await verifier.verifyTeeAttestationDetailed(sevReport, {
			policy: "required",
			expectedPublicKey: mockPublicKey,
			expectedNonce: mockNonce,
		});

		expect(result.verified).toBe(true);
		expect(result.platform).toBe("amd-sev-snp");
		expect(result.measurements?.measurementHex).toBe(
			mockMeasurement.toString("hex"),
		);
	});

	it("should reject an AMD SEV-SNP report if the REPORT_DATA binding does not match", async () => {
		const sevReport = Buffer.alloc(1184, 0);
		sevReport.writeUInt32LE(1, 0);
		// Tamper with REPORT_DATA
		const tamperedBinding = crypto.randomBytes(32);
		tamperedBinding.copy(sevReport, 0x50);

		const result = await verifier.verifyTeeAttestationDetailed(sevReport, {
			policy: "required",
			expectedPublicKey: mockPublicKey,
			expectedNonce: mockNonce,
		});

		expect(result.verified).toBe(false);
		expect(result.platform).toBe("amd-sev-snp");
		expect(result.message).toContain("REPORT_DATA binding mismatch");
	});

	it("should verify an AWS Nitro Enclave attestation document with valid PCRs and user_data", async () => {
		const mockPcr0 = crypto.randomBytes(48).toString("hex");
		const nitroReport = Buffer.concat([
			Buffer.from([0xd2, 0x84]), // COSE_Sign1 header
			Buffer.from("pcrs:"),
			Buffer.from(mockPcr0, "hex"),
			Buffer.from("user_data:"),
			expectedBinding,
		]);

		const result = await verifier.verifyTeeAttestationDetailed(nitroReport, {
			policy: "required",
			expectedPublicKey: mockPublicKey,
			expectedNonce: mockNonce,
			expectedPcrs: { 0: mockPcr0 },
		});

		expect(result.verified).toBe(true);
		expect(result.platform).toBe("aws-nitro");
		expect(result.message).toContain("AWS Nitro Enclave Hardware TEE Attestation Certified");
	});

	it("should reject an AWS Nitro Enclave document if PCR measurements do not match golden PCRs", async () => {
		const nitroReport = Buffer.concat([
			Buffer.from([0xd2, 0x84]),
			Buffer.from("pcrs:dummy_pcr_data"),
			expectedBinding,
		]);

		const result = await verifier.verifyTeeAttestationDetailed(nitroReport, {
			policy: "required",
			expectedPublicKey: mockPublicKey,
			expectedNonce: mockNonce,
			expectedPcrs: { 0: "deadbeef0000111122223333444455556666777788889999aaaabbbbccccdddd" },
		});

		expect(result.verified).toBe(false);
		expect(result.platform).toBe("aws-nitro");
		expect(result.message).toContain("PCR0 measurement mismatch");
	});

	it("should accept synthetic mesh TEE reports in preferred mode, but reject in required mode", async () => {
		const syntheticReport = Buffer.concat([
			Buffer.from([0x54, 0x45, 0x45, 0x53]), // "TEES"
			crypto.randomBytes(32),
		]);

		// Preferred mode accepts synthetic
		const prefResult = await verifier.verifyTeeAttestationDetailed(syntheticReport, {
			policy: "preferred",
		});
		expect(prefResult.verified).toBe(true);
		expect(prefResult.platform).toBe("synthetic");

		// Required mode strictly rejects synthetic without allowSynthetic flag
		const reqResult = await verifier.verifyTeeAttestationDetailed(syntheticReport, {
			policy: "required",
			allowSynthetic: false,
		});
		expect(reqResult.verified).toBe(false);
		expect(reqResult.message).toContain("Hardware TEE attestation required, but received synthetic");
	});

	it("should strictly reject empty reports when policy is required", async () => {
		const emptyReport = Buffer.alloc(0);

		const result = await verifier.verifyTeeAttestationDetailed(emptyReport, {
			policy: "required",
		});
		expect(result.verified).toBe(false);
		expect(result.message).toContain("Hardware TEE attestation required, but no attestation report was provided");

		const allowedUnderNone = await verifier.verifyTeeAttestationDetailed(emptyReport, {
			policy: "none",
		});
		expect(allowedUnderNone.verified).toBe(true);
	});
});
