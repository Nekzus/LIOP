# Security & Regulatory Compliance Audit Matrix

This document provides a comprehensive technical mapping between the Logic-Injection-on-Origin Protocol (LIOP) architecture, its sovereign compute enclaves, and the five regulatory cybersecurity frameworks required in enterprise, banking, and healthcare production environments: SOC 2 Type II, HIPAA Security Rule, PCI-DSS v4.0, NIST SP 800-53 Rev. 5 / SP 800-207, and OWASP Top 10 (2025) / OWASP LLM Top 10 (2025).

In addition, it establishes the operational role of the six global cybersecurity skills installed in the agent environment (`security-requirement-extraction`, `stride-analysis-patterns`, `threat-mitigation-mapping`, `security-and-hardening`, `sast-configuration`, and `secrets-management`) for ongoing automated audits and formal verification.

---

## 1. Protocol Architecture & Trust Boundaries

Unlike traditional Model Context Protocol (MCP) architectures that rely on context pulling (fetching raw datasets across network boundaries into an LLM context window), LIOP executes logic directly at the data source (Logic Injection). Sensitive records never leave the physical boundary of the host enclave.

```
                              [ Client / LLM Agent ]
                                         │
                                   gRPC / mTLS
                                         ▼
                             [ Border LIO Gateway (BLG) ]
                             (Rate Limiter, ONNX Guard)
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │ Swarm PSK: /key/swarm/psk/1.0.0/ (libp2p) │
                   ▼                                           ▼
       [ Tier 1: The Bank Enclave ]               [ Tier 1: The Vault Enclave ]
       - V8 Isolate Sandboxing                    - V8 Isolate Sandboxing
       - 11 Frozen Prototypes                     - 11 Frozen Prototypes
       - Differential Privacy (Laplace)           - Taint Analyzer (IFC)
       - Egress PII Shield                        - Hash-Chain Audit Ledger
                   │                                           │
                   └─────────────────────┬─────────────────────┘
                                         ▼
                            [ HMAC-SHA256 ZK-Receipt ]
                            (Sealed with PQC session secret)
```

### The Six Defense Layers (The Shield)

1. **Layer 1 (Guardian AST):** Static pre-execution inspection of injected module imports against a strict allowlist of 14 deterministic functions.
2. **Layer 2 (WASI Sandbox):** V8 Isolate runtime configured with 27 poisoned globals, 11 pre-frozen core prototypes (`Object`, `Function`, `Array`, `String`, etc.), strict mode execution, and deterministic fuel ceilings.
3. **Layer 3 (Taint Analyzer IFC):** Acorn-based static Information Flow Control tracking that blocks side-channel derivation (`charCodeAt`, bit-shifting, and boolean inference).
4. **Layer 4 (Egress PII Shield):** Four-stage egress filter (exact key matching, fuzzy matching, pattern validators with Luhn check, and NER) inspecting all outgoing responses.
5. **Layer 5 (Aggregation-First Policy):** Compiler-enforced policy rejecting row-level data dumps; only aggregated analytical results can cross the network boundary.
6. **Layer 6 (ZK-Receipt):** Cryptographic HMAC-SHA256 receipt binding computed outputs to the exact executed AST and verified dataset hash, sealed with the post-quantum session secret.

---

## 2. Five-Pillar Regulatory Compliance Mapping

### 2.1. Pillar 1: SOC 2 Type II (Trust Services Criteria)

| SOC 2 Criteria | Regulatory Requirement | LIOP Implementation | Target Code / Artifact |
|---|---|---|---|
| **CC6.1** | Logical access security over infrastructure and data assets. | Bearer OAuth 2.1 tokens (RFC 6749) issued by Nexus OIDC validated at the Border LIO Gateway perimeter. | `src/gateway/hybrid.ts`, `src/rpc/channel-options.ts` |
| **CC6.6** | Perimeter defense and network segmentation. | Socket-level protection using libp2p `pnet` Swarm Key PSK (`/key/swarm/psk/1.0.0/`) on Tier 1 enclaves combined with mutual TLS (mTLS). | `src/rpc/tls.ts`, `docker-compose.production-audit.yml` |
| **CC6.7** | Transmission data protection in transit. | Authenticated AES-256-GCM encryption established via post-quantum ML-KEM-768 (NIST FIPS 203) key encapsulation. | `src/rpc/crypto/dilithium.ts`, `src/rpc/crypto/` |
| **CC7.1 / CC7.2** | Immutable audit logs and anomaly detection. | Cryptographic append-only hash-chain audit ledger (`audit-ledger.jsonl`) verifying chronological record integrity. | `src/audit/`, `AuditLogger` |
| **PI1.1 / PI1.2** | Processing integrity of transactions and analytics. | ZK-Receipts (HMAC-SHA256) binding outputs to the exact logic AST and dataset state. | `src/workers/logic-execution.ts` |

---

### 2.2. Pillar 2: HIPAA Security Rule (45 CFR Part 160 & Part 164)

| HIPAA Section | Technical Safeguard | LIOP Implementation | Target Code / Artifact |
|---|---|---|---|
| **§ 164.312(a)(1)** | Access control: unique user identification and emergency access. | Medical records are analyzed in-situ within healthcare enclaves; raw ePHI is never transmitted across the network. | `BLG_Execute_Healthcare_Analytics`, `Analyze_Synthetic_Medical_Records` |
| **§ 164.312(b)** | Audit controls: recording and examining activity in systems containing ePHI. | Append-only execution logging recording logic fingerprints, compute fuel, and authenticated caller identities without logging underlying ePHI. | `src/audit/`, `AuditInterceptor` |
| **§ 164.312(c)(1)** | Integrity: protecting ePHI from unauthorized alteration or destruction. | Differential Privacy Laplace mechanism powered by CSPRNG (`crypto.randomBytes()`) with query budgets (`FORBIDDEN`, `SENSITIVE`, `PUBLIC`) per NIST SP 800-226. | `src/security/differential-privacy.ts` |
| **§ 164.312(e)(1)** | Transmission security: guarding against unauthorized access to ePHI in transit. | Unconditional rejection of unauthenticated connections via fail-closed mTLS with hot certificate reloading (`CertManager`). | `src/security/cert-manager.ts`, `src/rpc/tls.ts` |

---

### 2.3. Pillar 3: PCI-DSS v4.0 (Payment Card Industry Data Security Standard)

| PCI-DSS Requirement | Mandated Control | LIOP Implementation | Target Code / Artifact |
|---|---|---|---|
| **Req. 3.4** | Render primary account numbers (PAN) unreadable anywhere they are stored. | Invariant separating discrete identifiers from analytical floats; Egress PII Shield blocks card numbers with Luhn checks on analytical outputs. | `src/security/egress-shield.ts`, `src/security/pii-rules.ts` |
| **Req. 6.2** | Secure development practices preventing memory corruption and prototype pollution. | Deep prototype freezing of 11 fundamental JavaScript prototypes before running code in V8 Isolates to prevent sandbox escape. | `src/workers/logic-execution.ts` |
| **Req. 8.2 / 8.3** | Strong identification, authentication, and session handling. | Hard 1-hour session TTL (3600 seconds) enforced on all ML-KEM-768 session secrets, blocking stale or tampered timestamps. | `src/workers/logic-execution.ts`, `src/server/index.ts` |
| **Req. 10.2** | Audit log implementation for all actions on cardholder data. | Financial calculations emit cryptographic receipts and numeric totals rounded to two decimal places, avoiding IEEE 754 drift and preventing PAN exposure. | `The Bank Enclave`, `BLG_Execute_Banking_Analytics` |

---

### 2.4. Pillar 4: NIST SP 800-53 Rev. 5 & SP 800-207 (Zero Trust Architecture)

| Control Family | NIST Identifier | LIOP Technical Control |
|---|---|---|
| **Access Control (AC)** | **AC-3 / AC-4** | Multi-tier network isolation (Tier 1 Enclaves, Tier 2 Consortium, Tier 3 Backbone). Cross-tier calls must transit the Border LIO Gateway with cryptographic scope checks. |
| **Audit & Accountability (AU)** | **AU-2 / AU-9** | Synchronous timestamped audit records with SHA-256 hash chaining to prevent retroactive event tampering. |
| **System & Communications (SC)** | **SC-13 / SC-28** | Post-quantum cryptography using ML-DSA-65 (NIST FIPS 204) for manifest signing and ML-KEM-768 (NIST FIPS 203) for key exchange. |
| **Side-Channel Protection** | **SC-38** | AST instruction fuel metering quantized into 100-unit buckets, guaranteeing standard deviation of zero across secret payloads to eliminate timing side channels. |
| **Zero Trust Communications** | **SP 800-207** | Symmetrical gRPC channel options (keepalive 30s, timeout 10s, permit_without_calls) to prevent silent firewall timeouts and NAT drops. |

---

### 2.5. Pillar 5: OWASP Top 10 (2025) & OWASP LLM Top 10 (2025)

| Vulnerability Category | Threat Vector | LIOP Mitigation Engine |
|---|---|---|
| **LLM01: Prompt Injection** | Injection of hostile instructions through user data. | Two-phase gateway pipeline: Phase 1A deterministic heuristic scan (< 0.05 ms) and Phase 1B local ONNX prompt-guard (< 1.5 ms) with upfront warmup tensor passes. |
| **LLM02: Sensitive Data Disclosure** | Exfiltration of confidential enclave data in model outputs. | Mandatory aggregation policy combined with Acorn AST taint tracking to prevent byte-by-byte reconstruction of private records. |
| **LLM05: Insecure Output Handling** | Execution of dynamic code or unescaped commands from model responses. | Strict envelope parsing (`@LIOP{...}@END`) and schema verification; clients never pass unvalidated output to `eval` or system shells. |
| **LLM06: Excessive Agency** | Privilege escalation via autonomous tool invocations. | Sovereign enclaves enforce fail-closed boundary validation, rejecting raw payloads lacking canonical LIOP headers. |
| **API4:2023: Rate Limiting** | Resource exhaustion via concurrent connection floods. | O(1) sliding window token bucket rate limiter guarding `POST /mcp` with HTTP 429 and `Retry-After` headers. |
| **A10: SSRF** | Server-side requests targeted at internal loopback interfaces. | Egress fetch validation resolving all DNS records and denying private IPv4/IPv6 ranges as well as link-local addresses (`169.254.169.254`). |

---

## 3. Operational Integration of Global Security Skills

The six cybersecurity skills installed globally in `~/.gemini/config/skills` map directly into the LIOP engineering and audit lifecycle:

```
[ Phase 1: Planning & Compliance Requirements ]
  └─ security-requirement-extraction (Extracts SOC 2, HIPAA, PCI-DSS user stories)
  └─ stride-analysis-patterns (Formal STRIDE threat modeling on enclaves and DHT)

[ Phase 2: Threat Mitigation & Secret Architecture ]
  └─ threat-mitigation-mapping (Maps STRIDE vectors to NIST SP 800-53 & MITRE D3FEND)
  └─ secrets-management (Swarm PSK, OIDC token, and PQC session secret lifecycles)

[ Phase 3: Code Hardening & Continuous Verification ]
  └─ security-and-hardening (OWASP LLM 2025 defenses, SSRF controls, safe file paths)
  └─ sast-configuration (Semgrep and CodeQL rule suites for CI/CD pipelines)
```

---

## 4. Production Audit Execution Runbook

To empirically verify that all controls function as designed across a live multi-node topology, execute the automated production audit suite:

```bash
# 1. Deploy the 8-node sovereign production mesh with swarm keys
pnpm run audit:prod:start

# 2. Execute the 10-suite compliance audit under hostile network conditions
pnpm run audit:prod:run

# 3. Clean up audit containers, volumes, and temporary networks
pnpm run audit:prod:clean
```

### Audit Test Suite Coverage

- **Suite 00 (Package & Manifest Integrity):** Verifies provenance, SLSA Level 3 attestations, and cryptographic signatures.
- **Suite 01 (Hybrid Mesh & Routing):** Validates NAT traversal, symmetric keepalives, and multiaddr remapping.
- **Suite 02 (TLS Fail-Closed Enforcement):** Asserts immediate termination if TLS certificates are missing or invalid.
- **Suite 03 (ML-DSA-65 Digital Signatures):** Validates post-quantum manifest sealing and tamper rejection.
- **Suite 04 (CertManager Hot Reloading):** Confirms non-disruptive certificate rotation and expiration warning alerts.
- **Suite 05 (Session Lifetime TTL):** Confirms rejection of ML-KEM-768 session secrets older than 3600 seconds.
- **Suite 06 (SOC 2 / HIPAA Audit Trail):** Validates the cryptographic hash-chain integrity of `audit-ledger.jsonl`.
- **Suite 07 (Differential Privacy):** Tests Laplace noise addition and query budget limits under NIST SP 800-226.
- **Suite 08 (Enclave Isolation Boundaries):** Confirms fail-closed rejection of unencapsulated payloads lacking `@LIOP`.
- **Suite 09 (Traffic Shaping Resilience):** Executes under simulated latency, packet loss, and jitter using Linux `tc netem`.
