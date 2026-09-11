import { describe, expect, it } from "vitest";
import {
	Counter,
	Gauge,
	Histogram,
	MetricsRegistry,
	operationDurationMs,
	pqcHandshakeDurationMs,
	protocolMetrics,
	tokensInputTotal,
	tokensOutputTotal,
	tokensSavedTotal,
	toolCallErrorsTotal,
	toolCallsTotal,
	zkVerificationDurationMs,
	zkVerificationsTotal,
	pqcHandshakesTotal,
	wireEgressBytesTotal,
	wireSavedBytesTotal,
} from "../../../src/observability/metrics.js";

describe("Prometheus Metrics Module (Phase Beta-3)", () => {
	it("should track Counter increments with and without labels", () => {
		const c = new Counter("test_counter", "A test counter");
		expect(c.get()).toBe(0);

		c.inc();
		expect(c.get()).toBe(1);

		c.inc({ tool: "oracle", status: "success" }, 5);
		expect(c.get({ tool: "oracle", status: "success" })).toBe(5);

		const text = c.toPrometheus().join("\n");
		expect(text).toContain("# HELP test_counter A test counter");
		expect(text).toContain("# TYPE test_counter counter");
		expect(text).toContain('test_counter{status="success",tool="oracle"} 5');
		expect(text).toContain("test_counter 1");
	});

	it("should throw on negative Counter increments", () => {
		const c = new Counter("test_neg", "Help");
		expect(() => c.inc(undefined, -1)).toThrow(
			"Counter increments must be non-negative",
		);
	});

	it("should track Gauge set, inc, and dec with labels", () => {
		const g = new Gauge("test_gauge", "A test gauge");
		g.set(42);
		expect(g.get()).toBe(42);

		g.inc(undefined, 8);
		expect(g.get()).toBe(50);

		g.dec(undefined, 10);
		expect(g.get()).toBe(40);

		g.set({ node: "vault" }, 99);
		expect(g.get({ node: "vault" })).toBe(99);

		const text = g.toPrometheus().join("\n");
		expect(text).toContain("# TYPE test_gauge gauge");
		expect(text).toContain('test_gauge{node="vault"} 99');
	});

	it("should observe Histogram values and compute buckets, count, and sum", () => {
		const h = new Histogram("test_hist", "A test histogram", [10, 50, 100]);
		h.observe(5);
		h.observe(20);
		h.observe(150);

		const text = h.toPrometheus().join("\n");
		expect(text).toContain('# TYPE test_hist histogram');
		expect(text).toContain('test_hist_bucket{le="10"} 1');
		expect(text).toContain('test_hist_bucket{le="50"} 2');
		expect(text).toContain('test_hist_bucket{le="100"} 2');
		expect(text).toContain('test_hist_bucket{le="+Inf"} 3');
		expect(text).toContain('test_hist_count 3');
		expect(text).toContain('test_hist_sum 175');
	});

	it("should export full Prometheus text including process metrics", () => {
		const registry = new MetricsRegistry();
		const counter = registry.counter("req_total", "Requests total");
		counter.inc({ route: "/mcp" });

		const exported = registry.exportPrometheusText();
		expect(exported).toContain("liop_process_uptime_seconds");
		expect(exported).toContain("liop_node_health_status 1");
		expect(exported).toContain("liop_process_memory_rss_bytes");
		expect(exported).toContain("liop_process_memory_heap_total_bytes");
		expect(exported).toContain("liop_process_memory_external_bytes");
		expect(exported).toContain('req_total{route="/mcp"} 1');
	});

	it("should provide pre-configured protocol metrics singleton", () => {
		toolCallsTotal.inc({ tool: "Analyze_HFT_Market_Data", status: "success" });
		toolCallErrorsTotal.inc({ capability: "Analyze_HFT_Market_Data", error_type: "policy_denied" });
		pqcHandshakesTotal.inc({ algorithm: "ml-kem-768", status: "success" });
		zkVerificationsTotal.inc({ status: "valid" });

		const out = protocolMetrics.exportPrometheusText();
		expect(out).toContain('liop_tool_calls_total{status="success",tool="Analyze_HFT_Market_Data"} 1');
		expect(out).toContain('liop_tool_call_errors_total{capability="Analyze_HFT_Market_Data",error_type="policy_denied"} 1');
		expect(out).toContain('liop_pqc_handshakes_total{algorithm="ml-kem-768",status="success"} 1');
		expect(out).toContain('liop_zk_verifications_total{status="valid"} 1');
	});

	it("should record and export token economy, duration, and PQC metrics", () => {
		tokensInputTotal.inc({ tool: "Analyze_HFT_Market_Data" }, 250);
		tokensOutputTotal.inc({ tool: "Analyze_HFT_Market_Data" }, 50);
		tokensSavedTotal.inc({ tool: "Analyze_HFT_Market_Data" }, 31950);
		operationDurationMs.observe({ tool: "Analyze_HFT_Market_Data" }, 45);
		pqcHandshakeDurationMs.observe({ tool: "Analyze_HFT_Market_Data" }, 12);
		zkVerificationDurationMs.observe({ status: "verified" }, 3);

		const out = protocolMetrics.exportPrometheusText();
		expect(out).toContain('liop_tokens_input_total{tool="Analyze_HFT_Market_Data"} 250');
		expect(out).toContain('liop_tokens_output_total{tool="Analyze_HFT_Market_Data"} 50');
		expect(out).toContain('liop_tokens_saved_total{tool="Analyze_HFT_Market_Data"} 31950');
		expect(out).toContain('liop_operation_duration_ms_count{tool="Analyze_HFT_Market_Data"} 1');
		expect(out).toContain('liop_pqc_handshake_duration_ms_count{tool="Analyze_HFT_Market_Data"} 1');
		expect(out).toContain('liop_zk_verification_duration_ms_count{status="verified"} 1');
	});

	it("should track and export wire egress and wire saved metrics", () => {
		wireEgressBytesTotal.inc({ capability: "bank_transfers" }, 1024);
		wireSavedBytesTotal.inc({ capability: "bank_transfers" }, 45000);

		const out = protocolMetrics.exportPrometheusText();
		expect(out).toContain(
			'liop_wire_egress_bytes_total{capability="bank_transfers"} 1024',
		);
		expect(out).toContain(
			'liop_wire_saved_bytes_total{capability="bank_transfers"} 45000',
		);
	});
});

