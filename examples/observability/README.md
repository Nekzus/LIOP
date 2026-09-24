<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../docs/logo/dark.svg">
    <img alt="Logic-Injection-on-Origin Protocol Logo" src="../../docs/logo/light.svg" width="600">
  </picture>

  <h1>LIOP Enterprise Observability Stack (BYOO)</h1>
  <p><strong>Turnkey Prometheus & Grafana telemetry infrastructure for sovereign enclaves.</strong></p>
  <p>Zero phone-home monitoring, real-time in-situ AST fuel consumption, ZK-Receipt latency tracking, and 26-panel SRE dashboards.</p>

  <p align="center">
    <a href="https://github.com/Nekzus/LIOP/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
    <a href="https://nekzus-32.mintlify.app/operations/observability-runbook"><img src="https://img.shields.io/badge/docs-mintlify-0D9373?style=flat" alt="Docs"></a>
    <a href="https://deepwiki.com/Nekzus/LIOP"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
  </p>
</div>

---

## Official Documentation

Detailed incident response runbooks, alerting remediation procedures, and metric calculation formulas are hosted on Mintlify:

| Documentation Section | Focus Area | Canonical Guide |
|---|---|---|
| **Observability Runbook** | 26-panel Master Dashboard, PromQL alert catalog, and SRE triage | [Observability Runbook](https://nekzus-32.mintlify.app/operations/observability-runbook) |
| **Sovereign Operations** | Docker tri-tier production topology, mTLS, and Swarm Key PSK | [Sovereign Deployment](https://nekzus-32.mintlify.app/operations/sovereign-deployment) |
| **Compliance Matrix** | SOC 2 Type II CC6.1/CC7.2, HIPAA §164.312, and PCI-DSS v4.0 mapping | [Compliance Matrix](https://nekzus-32.mintlify.app/operations/compliance-matrix) |

---

## Architecture & Data Sovereignty

```
 ┌────────────────────────────────────────────────────────┐
 │                   User Infrastructure                  │
 │                                                        │
 │   ┌─────────────────┐           ┌──────────────────┐   │
 │   │  LIOP Gateway / │   scrape  │    Prometheus    │   │
 │   │  Nodes (:15000) │ ◄──────── │    (v3.14.0)     │   │
 │   │  /metrics       │ (every 5s)│     (:9090)      │   │
 │   └─────────────────┘           └────────┬─────────┘   │
 │                                          │             │
 │                                          │ query       │
 │                                          ▼             │
 │                                 ┌──────────────────┐   │
 │                                 │     Grafana      │   │
 │                                 │    (v13.2.1)     │   │
 │                                 │     (:3001)      │   │
 │                                 └──────────────────┘   │
 └────────────────────────────────────────────────────────┘
```

LIOP enforces a strict Zero-Trust telemetry philosophy:
- **Zero Phone-Home**: Telemetry is never pushed to external vendor clouds or central telemetry relays.
- **Pull-Based Collection**: Prometheus scrapes standard OpenMetrics (`/metrics`) endpoints synchronously over private interfaces.
- **In-Situ Measurement**: Token economics and instruction fuel are calculated in memory at the host edge, preventing timing side-channel derivation.

---

## Prerequisites

- Docker Engine 24.0+ and Docker Compose v2.20+
- A running LIOP Node or Border LIO Gateway (`http://localhost:15000/metrics` or `http://localhost:15018/metrics`)

---

## Quick Start

### 1. Launch the Observability Stack

From the root of the repository or this directory, run:

```bash
docker compose -f examples/observability/docker-compose.observability.yml up -d
```

This starts two isolated containers:
- **Prometheus** on `http://localhost:9090`
- **Grafana** on `http://localhost:3001` (mapped to port 3001 to prevent conflicts with local gateways)

### 2. Access the Pre-Configured Dashboard

1. Open your browser to `http://localhost:3001`.
2. Login with default credentials:
   - **Username**: `admin`
   - **Password**: `admin`
3. Navigate to **Dashboards > LIOP > LIOP Protocol - Overview & Observability** (or access directly at `http://localhost:3001/d/liop-overview`).

Datasources and dashboards are provisioned declaratively via YAML upon container startup. Manual configuration in the Grafana UI is not required.

---

## Metric Reference & SRE Paradigms

The dashboard implements Google SRE monitoring frameworks (**RED Method** for services and **USE Method** for resources) across **26 dynamic panels**, including Panel 50 (*Data Sovereignty Ratio*).

### 1. RED Method (Rate, Errors, Duration)
| Metric | Type | SRE Dimension | Description |
|---|---|---|---|
| `liop_tool_calls_total` | Counter | **Rate** | Cumulative logic invocations labeled by capability and node role (`executor` / `proxy`). |
| `liop_tokens_input_total` | Counter | **Rate** | Exact BPE input tokens processed (`o200k_base`). |
| `liop_tokens_output_total` | Counter | **Rate** | Exact BPE output tokens emitted (`o200k_base`). |
| `liop_tokens_saved_total` | Counter | **Rate** | Cumulative tokens prevented from transmission over the wire (`originDatasetTokens - outputTokens`). |
| `liop_wire_egress_bytes_total` | Counter | **Rate** | Total physical wire egress bytes emitted across enclaves. |
| `liop_wire_saved_bytes_total` | Counter | **Rate** | Bandwidth saved on the wire compared to full raw dataset extraction. |
| `liop_pqc_handshakes_total` | Counter | **Rate** | Total ML-KEM-768 key encapsulation operations by status (`success`/`failure`). |
| `liop_tool_call_errors_total` | Counter | **Errors** | Total failed logic invocations or policy rejections by capability. |
| `liop_egress_blocks_total` | Counter | **Errors** | Interceptions executed by Layer 4 Egress Shield and Layer 3 Taint Analyzer. |
| `liop_operation_duration_ms` | Histogram | **Duration** | End-to-end operation latency (p50, p90, p95, p99 quantiles). |
| `liop_pqc_handshake_duration_ms` | Histogram | **Duration** | ML-KEM-768 post-quantum key encapsulation latency. |
| `liop_zk_verification_duration_ms` | Histogram | **Duration** | ZK-Receipt and HMAC cryptographic attestation latency in worker pool. |

### 2. USE Method (Utilization, Saturation, Errors)
| Metric | Type | SRE Dimension | Description |
|---|---|---|---|
| `liop_process_memory_rss_bytes` | Gauge | **Utilization** | Resident Set Size (RSS) physical memory consumed. |
| `liop_process_memory_heap_used_bytes` | Gauge | **Utilization** | Active V8 isolate heap memory utilized. |
| `liop_process_memory_heap_total_bytes` | Gauge | **Saturation** | Total allocated V8 heap capacity (used to compute % saturation). |
| `liop_process_memory_external_bytes` | Gauge | **Utilization** | Memory bound to C++ bindings and cryptographic buffers. |
| `liop_fuel_consumed_total` | Histogram | **Saturation** | AST deterministic execution fuel consumption. |
| `liop_mesh_peers_connected` | Gauge | **Capacity** | Active libp2p DHT peer connections in the sovereign mesh. |
| `liop_manifest_cache_size` | Gauge | **Capacity** | Remote capability schemas cached in memory. |
| `liop_node_health_status` | Gauge | **Health** | Node operational status (1 = Healthy, 0 = Degraded). |

---

## Prometheus Alerting Rules & Incident Runbooks

Pre-configured alerting rules are declared in `prometheus/alerting_rules.yml` and evaluated every 5 seconds.

| Alert Name | Severity | Condition | Description |
|---|---|---|---|
| `LiopMeshZeroPeers` | **CRITICAL** | `liop_mesh_peers_connected == 0` for 1m | Node isolated from DHT mesh. |
| `LiopEnclaveDown` | **CRITICAL** | `up == 0` for 30s | Enclave target unreachable via gRPC/HTTP. |
| `LiopZeroTrustEgressViolation` | **CRITICAL** | `increase(liop_egress_blocks_total[1m]) > 0` | Unauthorized raw data extraction attempt blocked. |
| `LiopRepeatedEnclaveEgressRejection` | **CRITICAL** | `increase(liop_egress_blocks_total[5m]) > 5` | Repeated egress security rejections indicate active reconnaissance. |
| `LiopZkVerificationFailure` | **CRITICAL** | `increase(liop_zk_verifications_total{status="invalid"}[1m]) > 0` | Cryptographic proof forgery or replay mismatch. |
| `LiopPqcHandshakeFailure` | **CRITICAL** | `increase(liop_pqc_handshakes_total{status="failure"}[1m]) > 0` | Post-quantum ML-KEM-768 handshake failure. |
| `LiopHighErrorRate` | **WARNING** | Error Rate > 5% for 2m | Tool execution error budget exceeded. |
| `LiopPqcLatencySpike` | **WARNING** | p99 Kyber Latency > 25ms for 2m | Worker pool contention or CPU starvation. |
| `LiopHeapSaturation` | **WARNING** | V8 Heap Utilization > 90% for 2m | Risk of Out-Of-Memory (OOM) crash. |

---

## Configuration Details

### Scrape Target Configuration (`prometheus.yml`)

The Prometheus instance scrapes target enclaves across the tri-tier topology:

```yaml
scrape_configs:
  - job_name: "liop-mesh"
    metrics_path: "/metrics"
    scrape_interval: 5s
    static_configs:
      - targets: ["host.docker.internal:15000"]
        labels:
          node_role: "nexus-seed"
          tier: "tier3-backbone"
      - targets: ["host.docker.internal:15018"]
        labels:
          node_role: "blg-perimeter"
          tier: "tier2-perimeter"
      - targets: ["host.docker.internal:15014"]
        labels:
          node_role: "bank-enclave"
          tier: "tier1-enclave"
      - targets: ["host.docker.internal:15013"]
        labels:
          node_role: "vault-enclave"
          tier: "tier1-enclave"
      - targets: ["host.docker.internal:15015"]
        labels:
          node_role: "oracle-consortium"
          tier: "tier2-consortium"
      - targets: ["host.docker.internal:15016"]
        labels:
          node_role: "edge-remote"
          tier: "tier2-consortium"
      - targets: ["host.docker.internal:15017"]
        labels:
          node_role: "relay-backbone"
          tier: "tier3-backbone"
```

The Grafana dashboard features cascading template variables (`$environment`, `$tier`, `$node_role`, `$capability`) allowing multi-enclave filtering or cluster-wide aggregation.

---

## Stopping the Stack

To stop containers while preserving historical time-series data:

```bash
docker compose -f examples/observability/docker-compose.observability.yml down
```

To perform a complete teardown deleting persisted volumes:

```bash
docker compose -f examples/observability/docker-compose.observability.yml down -v
```

---

## License

Licensed under the [Apache License, Version 2.0](../../LICENSE). Copyright 2026 [Nekzus Solutions](https://github.com/Nekzus) and contributors.
