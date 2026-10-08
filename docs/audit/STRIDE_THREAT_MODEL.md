# STRIDE Threat Model & Security Requirements Specification

This document provides the formal STRIDE threat model, security requirement extraction, and threat mitigation mapping for the Logic-Injection-on-Origin Protocol (LIOP) architecture across its four core trust boundaries.

---

## 1. System Overview & Architecture Decomposition

LIOP replaces traditional Model Context Protocol (MCP) data-pulling workflows by transmitting logic units directly into isolated sovereign enclaves where data resides at rest. To evaluate the resilience of this architecture, the system is decomposed into four trust boundaries, eleven architectural assets, and five data flow sequences.

### 1.1 Data Flow Diagram (DFD)

```
[ External Client / LLM Agent ]
             │
             │ [DF-1: gRPC / mTLS Request with Bearer Token]
             ▼
═════════════[ TRUST BOUNDARY 1: PERIMETER INGRESS ]═════════════
 [ Border LIO Gateway (BLG) ]
  ├── Heuristic Filter (Phase 1A)
  ├── ONNX Prompt Guard (Phase 1B)
  └── Rate Limiter & Token Meter
             │
             │ [DF-2: libp2p Swarm Encrypted Tunnel]
             ▼
═════════════[ TRUST BOUNDARY 2: P2P SWARM NETWORK ]═════════════
 [ libp2p DHT & Swarm Relay Node ]
  ├── Swarm PSK: /key/swarm/psk/1.0.0/
  ├── Noise Transport Handshake
  └── Symmetric Keepalive Channel (30s)
             │
             │ [DF-3: Dispatch Enclave Tool Invocation]
             ▼
═════════════[ TRUST BOUNDARY 3: SOVEREIGN ENCLAVE ]═════════════
 [ Sovereign Host Node (Bank / Vault Enclave) ]
  ├── Bearer Scope & Role Verifier (RBAC)
  ├── Append-Only Hash-Chain Ledger (AU-9)
  └── Protected Datastore (ePHI / Cardholder Records)
             │
             │ [DF-4: Inject Untrusted Micro-Module]
             ▼
═════════════[ TRUST BOUNDARY 4: LOGIC SANDBOX ]═════════════════
 [ V8 Isolate / Wasmtime Runtime ]
  ├── Guardian AST Allowlist (14 Imports)
  ├── 11 Frozen Core Prototypes
  ├── 27 Poisoned Global Scope Objects
  ├── Taint Analyzer (IFC Side-Channel Blocker)
  ├── Laplace Differential Privacy Engine
  └── Fuel Meter (100-Unit Quantized Buckets)
             │
             │ [DF-5: HMAC-SHA256 ZK-Receipt & Aggregated Output]
             ▼
 [ Verified Analytical Result Crossing Boundary to Client ]
```

---

## 2. Protected Assets & Data Classification

| Asset ID | Asset Name | Sensitivity Level | Data Classification | Security Impact if Compromised |
|---|---|---|---|---|
| **AST-01** | Raw Healthcare Records (ePHI) | Critical | HIPAA § 164.312 Regulated | Severe privacy violation, federal regulatory fines, loss of patient trust |
| **AST-02** | Cardholder PAN & Financial Data | Critical | PCI-DSS v4.0 Regulated | Severe financial fraud, merchant processor suspension, PCI non-compliance penalties |
| **AST-03** | Swarm Pre-Shared Key (`pnet` PSK) | Critical | Network Cryptographic Secret | Total mesh interception, unauthorized node admission into private network |
| **AST-04** | Private mTLS CA & Node Keys | Critical | Identity Cryptographic Secret | Spoofing of enclave nodes, silent man-in-the-middle decryption of gRPC traffic |
| **AST-05** | ML-KEM-768 Ephemeral Session Secrets | High | Post-Quantum Cryptographic Material | Decryption of individual historical sessions, loss of confidentiality |
| **AST-06** | OAuth 2.1 Private Signing Keys | High | Identity Token Secret | Token forgery, arbitrary elevation of privilege across tier perimeters |
| **AST-07** | Cryptographic Audit Ledger (`audit-ledger.jsonl`) | High | System Integrity Record | Inability to prove non-repudiation during forensic investigation or SOC 2 audit |
| **AST-08** | Injected Logic Source Code (`@LIOP`) | Medium | Proprietary Computation | Theft of intellectual property, leakage of analytical heuristics |
| **AST-09** | Enclave System Resource Budget (CPU/RAM) | Medium | Operational Availability | Service disruption, denial of analytical capabilities to legitimate clients |
| **AST-10** | Token Telemetry & Instruction Fuel Counters | Low | Telemetry Record | Minor distortion of billing, timing side-channel reconnaissance |
| **AST-11** | Public Tool Manifests & Routing Tables | Public | Metadata | Network topology disclosure, target reconnaissance |

---

## 3. Comprehensive STRIDE Threat Analysis

### 3.1 Trust Boundary 1: Perimeter & Gateway Ingress (TB-1)

| Threat ID | Category | Threat Vector | Target Component | Impact | Likelihood | Risk Score | Initial Mitigation |
|---|---|---|---|---|---|---|---|
| **THREAT-TB1-S1** | Spoofing | Replay or fabrication of expired Bearer tokens to impersonate client agents. | BLG Authentication Guard | High (3) | Medium (2) | 6 (High) | Strict token expiration checking with RFC 6749 verification and clock skew rejection. |
| **THREAT-TB1-T1** | Tampering | Prompt injection or system prompt overrides hidden inside JSON-RPC arguments. | Gateway Dispatcher | Critical (4) | High (3) | 12 (Critical) | Two-phase gateway filter with Phase 1A regex scanning and Phase 1B warmed local ONNX prompt guard. |
| **THREAT-TB1-R1** | Repudiation | Client denies initiating expensive or malicious analytical requests. | Gateway Access Log | Medium (2) | Medium (2) | 4 (Medium) | Asynchronous non-blocking audit logging linking client IP, TLS thumbprint, and request hash. |
| **THREAT-TB1-I1** | Info Disclosure | Unhandled exceptions leaking internal container paths, hostnames, or library versions. | Error Serializer | Medium (2) | High (3) | 6 (High) | Strict redaction of internal errors, converting stack traces into generic RPC error codes. |
| **THREAT-TB1-D1** | Denial of Service | Flooding gRPC endpoints with oversized payloads or high-frequency invocations. | Gateway Connection Pool | High (3) | High (3) | 9 (High) | Per-IP rate limiting, maximum message size limits (4MB), and gRPC connection backpressure. |
| **THREAT-TB1-E1** | Elevation | Client crafting requests to bypass gateway policies and directly address Tier 1 enclaves. | Hybrid Gateway Router | Critical (4) | Low (1) | 4 (Medium) | Network namespace isolation where Tier 1 enclaves only bind to internal interfaces without public routes. |

---

### 3.2 Trust Boundary 2: Decentralized P2P Mesh & Transport (TB-2)

| Threat ID | Category | Threat Vector | Target Component | Impact | Likelihood | Risk Score | Initial Mitigation |
|---|---|---|---|---|---|---|---|
| **THREAT-TB2-S1** | Spoofing | Rogue node joining libp2p swarm without authorization to intercept routing queries. | Swarm Connection Gate | Critical (4) | Low (1) | 4 (Medium) | libp2p `pnet` private network wrapper enforcing pre-shared key `/key/swarm/psk/1.0.0/`. |
| **THREAT-TB2-T1** | Tampering | Modification of transit packets by intermediate routing hops or compromised relays. | gRPC Stream Transport | Critical (4) | Low (1) | 4 (Medium) | Mandatory mutual TLS (mTLS) with hot-reloaded certificates and AES-256-GCM encryption. |
| **THREAT-TB2-R1** | Repudiation | Relay node denying having forwarded or dropped tool discovery announcements. | Mesh Router | Low (1) | Low (1) | 1 (Low) | Signed DHT record provider advertisements using node identity keypairs. |
| **THREAT-TB2-I1** | Info Disclosure | Eavesdropping on cleartext multiaddrs or metadata across public relay links. | Transport Layer | High (3) | Low (1) | 3 (Medium) | Noise protocol handshake establishing authenticated encrypted channels before routing. |
| **THREAT-TB2-D1** | Denial of Service | Aggressive stateful firewall timeouts causing silent gRPC disconnection during idle intervals. | Tonic Transport Engine | High (3) | High (3) | 9 (High) | Symmetrical keepalive configuration (keepalive 30s, timeout 10s, permit_without_calls). |
| **THREAT-TB2-E1** | Elevation | Low-tier backbone node issuing analytical commands reserved for Tier 1 sovereign enclaves. | Mesh Dispatcher | Critical (4) | Medium (2) | 8 (High) | Tier metadata verification combined with OAuth 2.1 scope enforcement on target nodes. |

---

### 3.3 Trust Boundary 3: Sovereign Compute Enclaves & Isolated Data Boundary (TB-3)

| Threat ID | Category | Threat Vector | Target Component | Impact | Likelihood | Risk Score | Initial Mitigation |
|---|---|---|---|---|---|---|---|
| **THREAT-TB3-S1** | Spoofing | Forgery of execution context claiming authorized administrative privileges. | Enclave Core Controller | Critical (4) | Low (1) | 4 (Medium) | Cryptographic signature validation of execution tickets prior to runtime initialization. |
| **THREAT-TB3-T1** | Tampering | Modifying local database records or manipulating in-memory transaction logs. | Protected Datastore | Critical (4) | Low (1) | 4 (Medium) | Read-only database connection handles provided to analytical execution workers. |
| **THREAT-TB3-R1** | Repudiation | Retroactive manipulation or deletion of historical audit log records to conceal breaches. | `audit-ledger.jsonl` | Critical (4) | Low (1) | 4 (Medium) | Cryptographic SHA-256 hash chaining where each log line incorporates the digest of the prior entry. |
| **THREAT-TB3-I1** | Info Disclosure | Direct extraction of raw row-level records bypassing analytical intent. | Data Adapter Interface | Critical (4) | High (3) | 12 (Critical) | Mandatory compiler-level aggregation policy rejecting raw object arrays or table dumps. |
| **THREAT-TB3-D1** | Denial of Service | Complex multi-join analytical queries overwhelming local enclave database storage. | Enclave Worker Pool | High (3) | Medium (2) | 6 (High) | Execution timeouts (5000 ms) and query complexity bounding before execution. |
| **THREAT-TB3-E1** | Elevation | Breaking out of process permissions to inspect neighboring containers or host devices. | Enclave Container Host | Critical (4) | Low (1) | 4 (Medium) | Execution in unprivileged Docker containers with dropped Linux capabilities (`cap_drop: ALL`). |

---

### 3.4 Trust Boundary 4: Untrusted Logic Injection & Sandbox Runtime (TB-4)

| Threat ID | Category | Threat Vector | Target Component | Impact | Likelihood | Risk Score | Initial Mitigation |
|---|---|---|---|---|---|---|---|
| **THREAT-TB4-S1** | Spoofing | Micro-module claiming to be an approved standard library module to bypass vetting. | Module Resolver | High (3) | Low (1) | 3 (Medium) | Guardian AST allowlist restricted strictly to 14 verified deterministic functions. |
| **THREAT-TB4-T1** | Tampering | Prototype pollution altering core JavaScript objects to affect concurrent executions. | V8 Isolate Runtime | Critical (4) | Medium (2) | 8 (High) | Deep recursive freezing (`Object.freeze`) of 11 fundamental prototypes before code execution. |
| **THREAT-TB4-R1** | Repudiation | Injected logic returning fabricated calculations without verifiable execution origin. | ZK-Receipt Generator | High (3) | Low (1) | 3 (Medium) | HMAC-SHA256 ZK-Receipt binding calculated result to AST digest and dataset state. |
| **THREAT-TB4-I1** | Info Disclosure | Extraction of private characters via timing differences or character code probing. | Taint Engine & Runtime | Critical (4) | High (3) | 12 (Critical) | Acorn AST Information Flow Control blocking `charCodeAt` and fuel quantized to 100 units. |
| **THREAT-TB4-D1** | Denial of Service | Infinite loops (`while(true)`) or memory exhaustion attacks attempting to crash the host. | CPU Fuel Meter & Allocator | Critical (4) | High (3) | 12 (Critical) | Strict instruction fuel ceilings enforced at AST and Wasmtime runtime levels with hard memory caps. |
| **THREAT-TB4-E1** | Elevation | Calling poisoned globals (`process`, `require`, `eval`) to execute arbitrary host commands. | Sandbox Global Scope | Critical (4) | Medium (2) | 8 (High) | Complete elimination and poisoning of 27 dangerous global symbols within the isolate context. |

---

## 4. Derived Security Requirements Specification

Using the `security-requirement-extraction` methodology, the identified STRIDE threats are transformed into actionable, testable security requirements mapped directly to the five regulatory frameworks.

### 4.1 Functional Security Requirements (F-REQ)

| Requirement ID | Requirement Statement | Mitigated Threat | Compliance Reference | Verification Method |
|---|---|---|---|---|
| **F-REQ-01** | The gateway must execute deterministic regex filtering followed by local ONNX prompt classification on all text payloads before execution. | THREAT-TB1-T1 | OWASP LLM01 | Unit test passing adversarial injection payloads into `HybridGatewayRouter`. |
| **F-REQ-02** | The sandbox must inspect all AST imports and reject any call referencing symbols outside the 14 approved deterministic math utilities. | THREAT-TB4-S1 | NIST SP 800-53 CM-7 | Vitest suite validating rejection of unapproved import specifiers in `ASTGuardian`. |
| **F-REQ-03** | The runtime must block any code returning row-level data objects, permitting only scalar aggregations or approved differential privacy outputs. | THREAT-TB3-I1 | HIPAA § 164.312(a), PCI Req. 3.4 | Integration test attempting to return raw record arrays from `wasi.ts`. |
| **F-REQ-04** | The enclave must produce an HMAC-SHA256 ZK-receipt binding computed results to the logic AST hash and the local dataset snapshot. | THREAT-TB4-R1 | SOC 2 PI1.1, PI1.2 | Verification test using `zk-verifier.ts` on valid and mutated execution payloads. |
| **F-REQ-05** | The egress filter must scan all analytical responses with Luhn checksum validation and reject any match resembling payment card numbers. | THREAT-TB3-I1 | PCI-DSS v4.0 Req. 3.4 | Automated scan test in `pii.test.ts` verifying PAN interception. |

### 4.2 Non-Functional Security Requirements (NF-REQ)

| Requirement ID | Requirement Statement | Target Metric | Compliance Reference | Verification Method |
|---|---|---|---|---|
| **NF-REQ-01** | The deterministic Phase 1A security pre-filter must complete execution in under 0.05 milliseconds per invocation. | Latency < 0.05 ms | SOC 2 CC7.1 | Benchmark test harness measuring regex pipeline execution time. |
| **NF-REQ-02** | Local neural semantic inference in Phase 1B must execute in under 1.5 milliseconds on standard CPU hardware without remote API calls. | Latency < 1.5 ms | NIST SP 800-53 SC-5 | In-memory ONNX session latency measurement under warmed CPU state. |
| **NF-REQ-03** | All post-quantum ephemeral session secrets must enforce a strict maximum time-to-live of 3600 seconds (1 hour). | Lifetime <= 3600s | PCI-DSS v4.0 Req. 8.2 | Unit test asserting session rejection when timestamp exceeds 3600 seconds. |
| **NF-REQ-04** | Instruction fuel consumption for logic execution must be quantized into 100-unit buckets, ensuring zero variance across secret values. | Standard Deviation = 0 | NIST SP 800-53 SC-38 | Statistical test running variable-character payloads and verifying identical bucketed fuel. |

### 4.3 Technical Constraint Requirements (C-REQ)

| Requirement ID | Constraint Statement | Rationale | Compliance Reference |
|---|---|---|---|
| **C-REQ-01** | All P2P mesh sockets must require the libp2p `pnet` wrapper with pre-shared key `/key/swarm/psk/1.0.0/`. | Prevents unauthorized node discovery and unauthenticated swarm peering. | SOC 2 CC6.6 |
| **C-REQ-02** | V8 Isolate execution contexts must recursively freeze the 11 fundamental prototypes before loading user scripts. | Eliminates prototype pollution as an attack vector across concurrent or pooled workers. | PCI-DSS Req. 6.2 |
| **C-REQ-03** | Injected JavaScript modules must parse successfully under `{ allowReturnOutsideFunction: true }` in Acorn AST parsers. | Allows top-level return statements in micro-modules without compromising syntax tree parsing. | LIOP Agent Standard 15 |
| **C-REQ-04** | Symmetrical gRPC channel options must be enforced on both client and server (keepalive 30s, timeout 10s, permit_without_calls). | Prevents stateful firewall drops and TCP silent resets across enterprise NAT boundaries. | LIOP Agent Standard 9 |

---

## 4. Threat Mitigation Mapping & Defense-in-Depth Scoring

Following the `threat-mitigation-mapping` methodology, each high-impact threat is mapped across defensive layers and control types.

### 4.1 Multi-Layer Defense Matrix

```
                      ┌──────────────────────────────────────────────┐
                      │              PERIMETER LAYER                 │
                      │  - BLG Rate Limiter (Preventive)             │
                      │  - Heuristic Phase 1A Regex (Preventive)     │
                      │  - ONNX Prompt Guard Phase 1B (Detective)    │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────▼───────────────────────┐
                      │               NETWORK LAYER                  │
                      │  - libp2p Swarm PSK (Preventive)             │
                      │  - Mutual TLS AES-256-GCM (Preventive)       │
                      │  - Symmetrical Keepalive (Corrective)        │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────▼───────────────────────┐
                      │             HOST & RUNTIME LAYER             │
                      │  - Unprivileged Containers (Preventive)      │
                      │  - 27 Poisoned Globals (Preventive)          │
                      │  - 11 Frozen Prototypes (Preventive)         │
                      │  - Instruction Fuel Ceilings (Corrective)    │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────▼───────────────────────┐
                      │           APPLICATION & LOGIC LAYER          │
                      │  - Guardian AST Allowlist (Preventive)       │
                      │  - Taint Analyzer IFC (Detective)            │
                      │  - Quantized Fuel Buckets (Preventive)       │
                      │  - OAuth 2.1 Scope Checks (Preventive)       │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────▼───────────────────────┐
                      │                 DATA LAYER                   │
                      │  - Mandatory Aggregation Policy (Preventive) │
                      │  - Laplace Differential Privacy (Preventive) │
                      │  - Egress PII Luhn Scanner (Detective)       │
                      │  - SHA-256 Hash-Chain Ledger (Detective)     │
                      │  - HMAC-SHA256 ZK-Receipt (Corrective)       │
                      └──────────────────────────────────────────────┘
```

### 4.2 Control Coverage & Diversity Assessment

| Threat Identifier | Target Risk Score | Layer Coverage | Control Diversity | Mitigation Coverage Score | Defense Status |
|---|---|---|---|---|---|
| **THREAT-TB1-T1** (Prompt Injection) | 12 (Critical) | Perimeter, Application | Preventive + Detective | 95% | Adequate Defense-in-Depth |
| **THREAT-TB3-I1** (Data Exfiltration) | 12 (Critical) | Application, Data | Preventive + Detective | 100% | Adequate Defense-in-Depth |
| **THREAT-TB4-I1** (Side-Channel Derivation)| 12 (Critical) | Runtime, Application | Preventive + Detective | 90% | Adequate Defense-in-Depth |
| **THREAT-TB4-D1** (Sandbox DoS / Loops) | 12 (Critical) | Runtime, Application | Preventive + Corrective | 95% | Adequate Defense-in-Depth |
| **THREAT-TB4-T1** (Prototype Pollution) | 8 (High) | Host, Runtime | Preventive | 90% | Single-Type High Effectiveness |
| **THREAT-TB2-D1** (Firewall NAT Timeout)| 9 (High) | Network | Preventive + Corrective | 85% | Adequate Defense-in-Depth |

---

## 5. Critical Security Gaps & Recommendations

Based on the quantitative analysis conducted in Phase 1, two residual engineering areas warrant focused attention during Phase 2 and Phase 4:

1. **Deterministic Egress Normalization for IEEE 754 Floating-Point Values:**
   - Risk: While discrete identifiers (PAN, SSN) are blocked by the Egress PII Shield, raw floating-point calculations with unbounded decimals can theoretically leak low-order bits or trigger false positives.
   - Action: Phase 2 code audit will verify that financial totals and mathematical averages are strictly rounded to two decimal places (`Math.round(val * 100) / 100`) across all enclave output adapters.

2. **Automated Continuous SAST Quality Gate:**
   - Risk: Although current unit tests cover AST allowlists and prototype freezing, manual developer modifications could accidentally introduce unpoisoned globals or unescaped return paths.
   - Action: Phase 4 will implement custom Semgrep rules that automatically block any commit introducing global scope references, unmetered loops, or direct database collection serialization.
