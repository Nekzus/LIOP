// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import {
	protocolMetrics,
	zkProofsByTypeTotal,
	zkProvingDurationMs,
	zkVerificationDurationMs,
	zkVkeyCacheSize,
} from "../../../src/observability/metrics.js";
import { LiopVerifier } from "../../../src/crypto/verifier.js";

describe("ZK Observability Telemetry Metrics (Task 9)", () => {
	it("should register and export all ZK metrics in Prometheus text format", () => {
		zkProofsByTypeTotal.inc({ proof_type: "groth16" });
		zkProofsByTypeTotal.inc({ proof_type: "hmac" });
		zkProvingDurationMs.observe({}, 45);
		zkVerificationDurationMs.observe({ status: "verified", proof_type: "groth16" }, 25);
		zkVkeyCacheSize.set(3);

		const prometheusOutput = protocolMetrics.exportPrometheusText();

		expect(prometheusOutput).toContain("liop_zk_verification_duration_ms");
		expect(prometheusOutput).toContain("liop_zk_verifications_total");
		expect(prometheusOutput).toContain("liop_zk_proofs_by_type_total");
		expect(prometheusOutput).toContain("liop_zk_proving_duration_ms");
		expect(prometheusOutput).toContain("liop_zk_vkey_cache_size");
		expect(prometheusOutput).toContain('proof_type="groth16"');
	});

	it("should update zkVkeyCacheSize gauge when registering VKeys in LiopVerifier", () => {
		LiopVerifier.registerVKey("metrics-test-circuit-1", crypto.randomBytes(64));
		LiopVerifier.registerVKey("metrics-test-circuit-2", crypto.randomBytes(64));

		const newSize = zkVkeyCacheSize.get();
		expect(newSize).toBeGreaterThanOrEqual(2);
	});
});
