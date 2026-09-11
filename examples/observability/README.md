# LIOP Enterprise Observability Stack (BYOO)

This directory provides an Enterprise BYOO (Bring Your Own Observability) monitoring stack for the Logic-Injection-on-Origin Protocol (LIOP). It enables real-time visualization of protocol metrics, WASI execution fuel, ZK-Receipt verification latencies, and Zero-Trust egress security enforcement without exposing internal data to external third parties.

## Architecture & Data Sovereignty

```
 ┌────────────────────────────────────────────────────────┐
 │                   User Infrastructure                  │
 │                                                        │
 │   ┌─────────────────┐           ┌──────────────────┐   │
 │   │  LIOP Gateway / │   scrape  │    Prometheus    │   │
 │   │  Node (:3000)   │ ◄──────── │    (v3.14.0)     │   │
 │   │  /metrics       │  (every 5s)│     (:9090)      │   │
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
- **Pull-Based Collection**: Prometheus scrapes standard OpenMetrics (`/metrics`) endpoints synchronously.
- **In-Situ Measurement**: Token economics and instruction fuel are calculated in memory at the host edge, preventing timing side-channel derivation.

---

## Prerequisites

- Docker Engine 24.0+ and Docker Compose v2.20+
- A running LIOP Node or MCP Gateway (default endpoint: `http://localhost:3000/metrics`)

---

## Quick Start

### 1. Launch the Observability Stack

From the root of the repository or this directory, run:

```bash
docker compose -f examples/observability/docker-compose.observability.yml up -d
```

This starts two isolated containers:
- **Prometheus** on `http://localhost:9090`
- **Grafana** on `http://localhost:3001` (mapped to port 3001 to prevent conflicts with the default LIOP Gateway on 3000)

### 2. Access the Pre-Configured Dashboard

1. Open your browser to `http://localhost:3001`.
2. Login with the default credentials:
   - **Username**: `admin`
   - **Password**: `admin`
3. Navigate to **Dashboards > LIOP > LIOP Protocol - Overview & Observability** (or access it directly at `http://localhost:3001/d/liop-overview`).

Datasources and dashboards are provisioned declaratively via YAML upon container startup. Manual configuration in the Grafana UI is not required.

---

## Metric Reference & SRE Paradigms

The dashboard implements Google SRE monitoring frameworks (**RED Method** for services and **USE Method** for resources) across 25 dynamic panels.

### 1. RED Method (Rate, Errors, Duration)
| Metric | Type | SRE Dimension | Description |
|---|---|---|---|
| `liop_tool_calls_total` | Counter | **Rate** | Cumulative logic invocations by capability (`capability`). |
| `liop_tokens_input_total` | Counter | **Rate** | Exact BPE input tokens processed (o200k_base). |
| `liop_tokens_output_total` | Counter | **Rate** | Exact BPE output tokens emitted (o200k_base). |
| `liop_wire_egress_bytes_total` | Counter | **Rate** | Total physical wire egress bytes emitted across enclaves. |
| `liop_wire_saved_bytes_total` | Counter | **Rate** | Bandwidth saved on the wire compared to full dataset extraction. |
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
| `liop_mesh_peers_connected` | Gauge | **Capacity** | Active libp2p DHT peer connections in the neural mesh. |
| `liop_manifest_cache_size` | Gauge | **Capacity** | Remote capability schemas cached in memory. |
| `liop_node_health_status` | Gauge | **Health** | Node operational status (1 = Healthy, 0 = Degraded). |

---

## Prometheus Alerting Rules & Incident Runbooks

Pre-configured alerting rules are declared in `prometheus/alerting_rules.yml` and evaluated every 10 seconds.

| Alert Name | Severity | Condition | Description |
|---|---|---|---|
| `LiopMeshZeroPeers` | **CRITICAL** | `liop_mesh_peers_connected == 0` for 1m | Node isolated from DHT mesh. |
| `LiopEnclaveDown` | **CRITICAL** | `up == 0` for 30s | Enclave target unreachable via gRPC/HTTP. |
| `LiopZeroTrustEgressViolation` | **CRITICAL** | `increase(liop_egress_blocks_total[1m]) > 0` | Unauthorized data extraction attempt blocked. |
| `LiopZkVerificationFailure` | **CRITICAL** | `increase(liop_zk_verifications_total{status="invalid"}[1m]) > 0` | Cryptographic proof forgery or corruption. |
| `LiopPqcHandshakeFailure` | **CRITICAL** | `increase(liop_pqc_handshakes_total{status="failure"}[1m]) > 0` | Post-quantum ML-KEM-768 handshake failure. |
| `LiopHighErrorRate` | **WARNING** | Error Rate > 5% for 2m | Tool execution error budget exceeded. |
| `LiopPqcLatencySpike` | **WARNING** | p99 Kyber Latency > 25ms for 2m | Worker pool contention or CPU starvation. |
| `LiopHeapSaturation` | **WARNING** | V8 Heap Utilization > 90% for 2m | Risk of Out-Of-Memory (OOM) crash. |

---

### Incident Runbooks

#### Runbook: `LiopPqcHandshakeFailure`
- **Symptom**: ML-KEM-768 key encapsulation failure between client and enclave host.
- **Verification**:
  1. Check client logs for `Handshake failed: Remote host did not provide a valid Kyber Public Key`.
  2. Inspect target enclave logs to ensure Dilithium65/Kyber768 crypto modules initialized properly.
- **Mitigation**:
  1. Verify gRPC channel connectivity and version parity across SDK runtimes.
  2. Invalidate corrupted session tokens and trigger fresh handshake intent.

#### Runbook: `LiopMeshZeroPeers`
- **Symptom**: Node reports 0 connected peers. Dynamic tool discovery fails.
- **Verification**:
  1. Inspect container logs: `docker logs liop-node` (or target container).
  2. Verify bootstrap multiaddr reachability: check TCP connectivity to bootstrap peers on port 15000/15017.
- **Mitigation**:
  1. Verify network bridge or overlay routing.
  2. If using Docker, ensure published ports (`15001-15031`) are not bound by zombie processes.
  3. Trigger manual bootstrap reconnect by restarting the mesh node daemon.

#### Runbook: `LiopZeroTrustEgressViolation`
- **Symptom**: Alert fires immediately upon outbound policy violation.
- **Verification**:
  1. Identify target enclave and tool invocation from the alert labels.
  2. Check audit logs for the tainted variable or unaggregated row attempt:
     `grep "PII side-channel detected" /var/log/liop/audit.log`
- **Mitigation**:
  1. The Egress Shield automatically suppressed data egress at the boundary. No confidential data leaked.
  2. Review the calling agent's injected WASM module to verify compliance with the **Aggregation-First** policy.

#### Runbook: `LiopZkVerificationFailure`
- **Symptom**: HMAC-SHA256 or ZK-Receipt fails cryptographic verification.
- **Verification**:
  1. Inspect error code in client/gateway logs.
  2. Confirm whether the shared secret was negotiated cleanly via ML-KEM-768.
- **Mitigation**:
  1. If persistent, suspect network man-in-the-middle tampering or clock skew on session tokens.
  2. Invalidate active session tokens and force fresh Kyber intent negotiation.

#### Runbook: `LiopHeapSaturation`
- **Symptom**: V8 heap exceeds 85% of allocated memory.
- **Verification**:
  1. Examine the `Process Physical Memory Footprint` panel in Grafana.
  2. Check if large AST syntax trees or uncollected manifests are held in cache.
- **Mitigation**:
  1. Flush remote manifest cache (`MANIFEST_CACHE_TTL_S` expires stale entries after 300s).
  2. Scale the container's memory ceiling or tune `--max-old-space-size` in Node.js options.

---

## Configuration Details

### Scrape Target Configuration (`prometheus.yml`)

The Prometheus instance scrapes all target enclaves defined in `scrape_configs`:

```yaml
scrape_configs:
  - job_name: "liop-nodes"
    metrics_path: "/metrics"
    scrape_interval: 5s
    static_configs:
      - targets:
          - "host.docker.internal:3000"
          - "host.docker.internal:15018"
          - "host.docker.internal:15014"
          - "host.docker.internal:15013"
          - "host.docker.internal:15015"
          - "host.docker.internal:15016"
          - "host.docker.internal:15000"
        labels:
          environment: "production-simulation"
          cluster: "tri-layer-mesh"
```

The Grafana dashboard features cascading template variables (`$environment`, `$instance`, `$capability`) allowing granular multi-enclave filtering or cluster-wide aggregation.

---

## Stopping the Stack

To stop containers while preserving historical time-series data:

```bash
docker compose -f examples/observability/docker-compose.observability.yml down
```

To perform a complete teardown deleting volumes:

```bash
docker compose -f examples/observability/docker-compose.observability.yml down -v
```
