# Logic-Injection-on-Origin Protocol (LIOP) — Technical Specification

> **Status:** Ratified Standard  
> **Version:** 1.0.0  
> **Ratified Date:** August 31, 2026 | **First Published:** March 1, 2026  
> **Authors:** Mauricio Ortega (Nekzus) & Nekzus Solutions Architecture Team  
> **License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)  
> **Normative Language:** RFC 2119 (`MUST`, `MUST NOT`, `REQUIRED`, `SHALL`, `SHALL NOT`, `SHOULD`, `SHOULD NOT`, `RECOMMENDED`, `MAY`, `OPTIONAL`)  
> **Attribution Notice:** Any reproduction, adaptation, or derivative use of this protocol specification must explicitly cite **Mauricio Ortega (Nekzus)** and **Nekzus Solutions**, with an official reference link to this repository.  
> **Spanish Version:** See [SPECIFICATION_ES.md](./SPECIFICATION_ES.md) for the official Spanish text.

---

## 📚 Official Documentation

Interactive guides, reference runtimes, and live architectural sandboxes are hosted on the official Mintlify portal:

| Documentation Section | Scope | Canonical Guide |
|---|---|---|
| **Protocol Overview** | Core postulates, threat model, and zero-trust foundations | [Protocol Concepts](https://nekzus-32.mintlify.app/concepts/specification) |
| **TypeScript SDK** | Reference implementation, MCP gateway, and runtime interfaces | [TypeScript Reference](https://nekzus-32.mintlify.app/typescript-sdk/overview) |
| **Rust Mesh Node** | Wasmtime WASI v29 host, CPU fuel metering, and gRPC server | [Mesh Node Overview](https://nekzus-32.mintlify.app/mesh-node/overview) |
| **Sovereign Operations** | Tri-tier Docker topology, Swarm Key PSK, and mTLS mesh | [Operations Manual](https://nekzus-32.mintlify.app/operations/sovereign-deployment) |

---

## 1. Abstract & Problem Statement

Modern AI agent architectures rely predominantly on **Context-Pulling**: remote agents issue bulk queries to data stores, extract megabytes or gigabytes of raw records across wide-area networks (WAN), and inject those records into the Large Language Model's (LLM) context window.

This paradigm introduces three critical systemic failures:
1. **Sovereignty Failure**: Raw Personally Identifiable Information (PII), confidential medical records (HIPAA), or sensitive financial ledgers (PCI-DSS) exit secure enterprise enclaves and enter third-party model inference pipes.
2. **Context Window Saturation**: Bandwidth, serialization overhead, and input token consumption scale linearly ($O(N)$) with database volume, incurring extreme latency and exorbitant token costs.
3. **Integrity Void**: The agent has zero cryptographic guarantee that data received across intermediate relays was not modified, truncated, or replayed.

The **Logic-Injection-on-Origin Protocol (LIOP)** inverts this paradigm through **Logic-Injection-on-Origin (LIO)**:

$$\text{Intelligence} \xrightarrow{\text{Inject Micro-Module}} \text{Data Origin} \xrightarrow{\text{Execute In-Situ}} \text{Sanitized Aggregation} + \text{ZK-Receipt}$$

Data remains permanently stationary inside its sovereign enclave. The client transmits a self-contained, cryptographically signed analytical micro-module. The origin compiles, inspects, isolates, and executes this module directly against physical storage, returning only the compact mathematical aggregation accompanied by an unforgeable Zero-Knowledge Computational Receipt (ZK-Receipt).

---

## 2. Terminology & Normative Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

- **Data Node (Origin Enclave)**: A server daemon hosting raw datasets, isolating guest executions within a WebAssembly (WASI) or V8 sandbox, and enforcing the 6-layer defense shield.
- **Agent Injector (Client)**: An AI agent runtime or gateway that crafts logic envelopes, negotiates post-quantum session keys, dispatches execution requests, and verifies computational proofs.
- **Logic Envelope**: A standardized transport container (`@LIOP{...}...@END`) encapsulating execution metadata, AST instructions, and cryptographic assertions.
- **AST Instruction Fuel**: A deterministic computational metric derived from Abstract Syntax Tree nodes, quantized into 100-unit buckets to neutralize timing side-channels per NIST SP 800-53.
- **ZK-Receipt**: A cryptographic receipt comprising a SHA-256 logic digest (`image_id`), origin dataset commitment (`dataset_hash`), output hash (`output_hash`), and an HMAC-SHA256 signature sealed with an ephemeral post-quantum session secret.

---

## 3. Protocol Architecture & Interaction Sequence

```
  AI Agent / Client                Border Gateway (BLG)              Sovereign Origin Enclave
┌──────────────────┐               ┌──────────────────┐             ┌────────────────────────┐
│  LiopClient /    │               │  mTLS / OAuth    │             │  WASI Runtime          │
│  Claude Desktop  │               │  Rate Limiter    │             │  V8 Isolate / Wasmtime │
└────────┬─────────┘               └────────┬─────────┘             └───────────┬────────────┘
         │                                  │                                   │
         │ 1. Discover Capabilities         │                                   │
         │─────────────────────────────────>│                                   │
         │    GET /oidc/metadata            │                                   │
         │<─────────────────────────────────│                                   │
         │                                  │                                   │
         │ 2. Negotiate Post-Quantum Key    │                                   │
         │    ML-KEM-768 Encapsulation      │                                   │
         │─────────────────────────────────>│                                   │
         │    Shared Secret (K_sess)        │                                   │
         │<─────────────────────────────────│                                   │
         │                                  │                                   │
         │ 3. Dispatch Logic Envelope       │                                   │
         │    @LIOP{...} Code @END          │                                   │
         │─────────────────────────────────>│ 4. Forward over PSK Swarm Mesh   │
         │                                  │──────────────────────────────────>│
         │                                  │                                   │ 5. Guardian AST Scan
         │                                  │                                   │ 6. Sandboxed Execution
         │                                  │                                   │ 7. IFC Taint Analysis
         │                                  │                                   │ 8. Egress PII Shield
         │                                  │                                   │ 9. Seal ZK-Receipt
         │                                  │ 10. Return Encrypted Result       │
         │                                  │<──────────────────────────────────│
         │ 11. Return Verified Aggregation  │                                   │
         │<─────────────────────────────────│                                   │
         │                                  │                                   │
         │ 12. Client Verifies ZK-Receipt   │                                   │
         │     assert(HMAC == Seal)         │                                   │
```

---

## 4. Envelope Framing Specification

Clients injecting analytical logic MUST encapsulate their payload within the normative LIOP envelope syntax:

```
@LIOP{"version":"1.0","runtime":"wasi-js","fuel_limit":500000,"timeout_ms":5000}
// Guest analytical code begins here
const records = env.records;
let total = 0;
for (let i = 0; i < records.length; i++) {
  total += records[i].amount;
}
return { count: records.length, sum: total, mean: total / records.length };
@END
```

### 4.1 Parsing Rules & Envelope Grammar

1. **Boundary Delimiters**:
   - The opening envelope header MUST start with `@LIOP{`.
   - The closing header delimiter MUST be `}` followed immediately by newline characters.
   - The envelope trailer MUST be `@END` on its own line.
2. **Cross-Platform Regular Expressions**:
   - Parsers MUST accommodate both POSIX Line Feed (`\n`) and Windows Carriage Return + Line Feed (`\r\n`).
   - The canonical envelope regex MUST match:
     ```javascript
     /@LIOP(\{[^}]+\})[\r\n]+([\s\S]*?)[\r\n]+@END/
     ```
3. **JSON Metadata Schema**:
   - `version` (string, REQUIRED): Protocol envelope version (e.g. `"1.0"`).
   - `runtime` (string, REQUIRED): Execution target runtime (`"wasi-js"` or `"wasi-wasm32"`).
   - `fuel_limit` (integer, OPTIONAL): Maximum allowable virtual CPU fuel units (default: `1,000,000`).
   - `timeout_ms` (integer, OPTIONAL): Hard execution deadline in milliseconds (default: `5,000`).
4. **AST Top-Level Return**:
   - Guest JavaScript payloads frequently execute as self-contained evaluation blocks. All ECMAScript AST parsers (such as Acorn) MUST configure `{ allowReturnOutsideFunction: true }`. Failure to set this property causes syntax parser rejection.

---

## 5. Transport Layer & Channel Management

LIOP supports two transport modes:
1. **Native Mesh Transport (gRPC / HTTP/2)**: Binary Protobuf serialization over HTTP/2 with bidirectional streaming, mTLS, and custom channel keepalives.
2. **Stateless HTTP/Streamable Gateway**: RFC 9728 Bearer token authentication over TLS 1.3, forwarding into sovereign enclaves via Border LIO Gateways (`blg`).

### 5.1 Protobuf Wire Definitions (`liop_core.v1`)

```protobuf
syntax = "proto3";
package liop_core.v1;

service LogicMeshService {
  rpc NegotiateIntent (IntentRequest) returns (IntentResponse);
  rpc ExecuteLogic (LogicRequest) returns (LogicResponse);
  rpc StreamTelemetry (TelemetryRequest) returns (stream TelemetryChunk);
}

message IntentRequest {
  string agent_did = 1;
  bytes client_kem_public_key = 2; // ML-KEM-768 Public Key (1184 bytes)
  int64 timestamp = 3;
}

message IntentResponse {
  bytes server_kem_ciphertext = 1; // ML-KEM-768 Ciphertext (1088 bytes)
  bytes server_signature = 2;      // ML-DSA-65 Signature (3309 bytes)
  string session_token = 3;
  int64 expires_at = 4;
}

message LogicRequest {
  string session_token = 1;
  bytes encrypted_payload = 2;     // AES-256-GCM ciphertext
  bytes nonce = 3;                 // 96-bit unique IV
  bytes tag = 4;                   // 128-bit authentication tag
}

message LogicResponse {
  bytes encrypted_result = 1;      // AES-256-GCM ciphertext
  bytes nonce = 2;
  bytes tag = 3;
  ZkReceipt receipt = 4;
}

message ZkReceipt {
  string image_id = 1;             // SHA-256 digest of executed logic
  string dataset_hash = 2;         // SHA-256 anchor of origin storage
  string output_hash = 3;          // SHA-256 digest of sanitized output
  bytes seal = 4;                  // HMAC-SHA256 cryptographic seal
}
```

### 5.2 Symmetric Channel Invariants

To survive enterprise firewalls, stateful proxy timeouts, and Network Address Translation (NAT) table pruning, both `LiopRpcClient` and `LiopRpcServer` MUST configure symmetric channel keepalives:

```typescript
export const GRPC_CHANNEL_OPTIONS = {
  "grpc.keepalive_time_ms": 30000,
  "grpc.keepalive_timeout_ms": 10000,
  "grpc.keepalive_permit_without_calls": 1,
  "grpc.http2.max_pings_without_data": 0,
  "grpc.http2.min_time_between_pings_ms": 10000,
  "grpc.http2.min_ping_interval_without_data_ms": 5000,
};
```

---

## 6. Cryptographic Security Architecture (The Shield)

Data Nodes MUST enforce six discrete, non-bypassable defensive layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 1: Guardian AST Preflight Analysis                               │
│ - 14-function WASI allowlist inspection                                │
│ - Blocks eval, Function, process, require, import(), fetch, __proto__  │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 2: WASI Sandbox & Isolated Runtime                               │
│ - V8 Isolate / Wasmtime VM with 25 poisoned globals                    │
│ - Deep prototype freezing on 11 ECMAScript prototypes                  │
│ - Strict CPU instruction fuel limits with OutOfFuel traps              │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 3: Static Information Flow Control (IFC Taint Analyzer)          │
│ - 5-pass Acorn AST traversal tracking collection aliases               │
│ - Blocks side-channel derivation: charCodeAt, arithmetic inference     │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 4: Egress PII Defense Shield                                     │
│ - 4-stage pipeline: exact key → fuzzy key → regex → NER                │
│ - Recursive in-memory numerical sanitization (rounds to 4 decimals)    │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 5: Aggregation-First Policy & K-Anonymity                        │
│ - Rejects raw record extraction; enforces scalar outputs               │
│ - If dataset n < 10: enforces K-anonymity (max 3 scalar keys)          │
│ - NIST SP 800-226 Laplace Differential Privacy (epsilon >= 1.0)        │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 6: Zero-Knowledge Computational Receipt (ZK-Receipt)             │
│ - Seals output_hash + image_id + dataset_hash with session secret      │
│ - Authenticates computation without exposing underlying records        │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Layer 1: Guardian AST Allowlist

Before compiling guest logic, the host scans the parsed AST against an allowlist of 14 safe WASI Preview 1 functions:
- `fd_read`, `fd_write`, `fd_close`, `fd_seek`, `fd_fdstat_get`, `fd_fdstat_set_flags`, `fd_prestat_get`, `fd_prestat_dir_name`, `environ_sizes_get`, `environ_get`, `clock_time_get`, `proc_exit`, `random_get`, `sched_yield`.

Any payload attempting to invoke `proc_spawn`, `sock_open`, `path_create_directory`, or dynamic code evaluation (`eval`) MUST be rejected immediately with `ErrorCode.SECURITY_VIOLATION`.

### 6.2 Layer 2: WASI Sandbox & Prototype Freezing

1. **Poisoned Globals**: The host injects proxy traps on 25 forbidden global identifiers: `eval`, `Function`, `process`, `require`, `WebSocket`, `fetch`, `XMLHttpRequest`, `Buffer`, `ArrayBuffer`, `SharedArrayBuffer`, `DataView`, `Int8Array`, `Uint8Array`, `Uint8ClampedArray`, `Int16Array`, `Uint16Array`, `Int32Array`, `Uint32Array`, `Float32Array`, `Float64Array`, `BigInt64Array`, `BigUint64Array`, `Date`, `setTimeout`, `setInterval`.
2. **Prototype Freezing**: Prior to guest payload execution, the host freezes 11 core prototypes using `Object.freeze`: `Object.prototype`, `Function.prototype`, `Array.prototype`, `String.prototype`, `Number.prototype`, `Boolean.prototype`, `RegExp.prototype`, `Error.prototype`, `Promise.prototype`, `Map.prototype`, `Set.prototype`.
3. **Deterministic Fuel Metering**: Every AST instruction consumes fuel units. The total fuel consumed is quantized to 100-unit buckets ($F_{\text{reported}} = \lceil F_{\text{raw}} / 100 \rceil \times 100$), guaranteeing zero timing variance across adversarial executions.

### 6.3 Layer 3: Taint Analyzer (IFC)

The Taint Analyzer executes a 5-pass traversal over the guest AST to detect information flow violations:
- **Alias Resolution**: Tracks variables assigned from `env.records`.
- **Method Guard**: Detects side-channel character exfiltration (`charCodeAt`, `charAt`, `codePointAt`).
- **Inference Guard**: Flags binary search inference loops and branch conditions conditioned directly on unsanitized field values.

### 6.4 Layer 4: Egress PII Shield

All returned payloads undergo a 4-stage filter:
1. **Key Matching**: Exact match against configured `forbiddenKeys` (`id`, `ssn`, `password`, `email`, `name`).
2. **Fuzzy Distance**: Levenshtein distance check ($D \le 2$) identifying obfuscated key names (e.g. `user_mail`, `p_word`).
3. **Regex & Algorithmic Validators**:
   - Credit Cards: Regex match verified via Luhn Algorithm (Mod-10).
   - Bank Accounts: ISO 7064 Modulo 97-10 verification for IBAN strings.
   - Identifiers: US SSN (blocking area `000` or group `00`), international phone numbers, and RFC 5322 emails.
4. **Named Entity Recognition (NER)**: Compromise-driven linguistic extraction catching unformatted human names in strings.

### 6.5 Layer 5: Aggregation-First & Differential Privacy

1. **Row Extraction Barrier**: Payloads returning arrays of objects resembling raw database rows are rejected. The output MUST represent an aggregated scalar object (e.g. counts, sums, percentiles).
2. **K-Anonymity on Sparse Sets**: When the source dataset contains $n < 10$ records, the returned object MUST contain no more than 3 scalar keys and MUST NOT contain nested arrays or objects.
3. **Differential Privacy (Laplace Mechanism)**:
   When active, numeric results $x$ are perturbed by Laplace noise $Y \sim \text{Laplace}(0, \Delta f / \epsilon)$:

   $$x_{\text{private}} = x + \text{Laplace}\left(0, \frac{\Delta f}{\epsilon}\right), \quad \text{where } \epsilon \ge 1.0$$

### 6.6 Layer 6: Zero-Knowledge Computational Receipt

The host computes a cryptographic commitment proving that output $O$ was generated by logic $L$ over dataset $D$:

$$\text{ImageID} = \text{SHA256}(L)$$
$$\text{DatasetHash} = \text{SHA256}(D)$$
$$\text{OutputHash} = \text{SHA256}(O)$$
$$\text{Seal} = \text{HMAC-SHA256}\left(K_{\text{sess}}, \text{ImageID} \parallel \text{DatasetHash} \parallel \text{OutputHash}\right)$$

Upon receipt, the client recomputes $\text{OutputHash} = \text{SHA256}(O)$ and verifies that $\text{Seal}$ matches the expected signature using the shared post-quantum session secret $K_{\text{sess}}$.

---

## 7. Canonical Network Topology & Port Matrix

| Service / Node | Port | Protocol | Purpose | Access Boundary |
|---|---|---|---|---|
| **Nexus Discovery & OIDC** | `15000` | HTTP / SSE | Discovery, RFC 9728 metadata, OIDC Bearer tokens, Prometheus `/metrics` | Public Perimeter (DMZ) |
| **Nexus Mesh P2P** | `15001` | TCP / Noise | libp2p Kademlia DHT bootstrap (`/ipfs/kad/1.0.0`) | Inter-Node Mesh |
| **Border LIO Gateway (BLG)** | `15018` | HTTP / Streamable | L7 Perimeter Gateway, mTLS bridge, GatewayInterceptor | Public Ingress / DMZ |
| **Enclave Bank (Tier 1)** | `15021` | gRPC / HTTP/2 | Financial transaction analytics, PCI-DSS sandbox, ZK receipts | Private Enclave (Isolated) |
| **Enclave Vault (Tier 1)** | `15022` | gRPC / HTTP/2 | Healthcare medical analytics, HIPAA sandbox, Laplace DP engine | Private Enclave (Isolated) |
| **Consortium Oracle (Tier 2)**| `15011` | gRPC / HTTP/2 | High-frequency trading (HFT) order books, synthetic feeds | Consortium Network |
| **Edge Remote Node (Tier 2)**| `15012` | gRPC / HTTP/2 | Industrial IoT telemetry, vibration and pressure monitoring | Edge Enclave |
| **Circuit Relay v2** | `15007` | TCP / Noise | libp2p NAT traversal and packet relaying | Backbone Mesh |
| **LIOP Studio Web Console** | `16000` | HTTP / React 19 | Production developer studio, interactive testbed, network scanner | Developer Workstation |
| **Prometheus Telemetry** | `15090` | HTTP | Time-series metrics collection (`/metrics` scraping) | Observability Subnet |
| **Grafana Master Console** | `15091` | HTTP | 26-panel production dashboard, data sovereignty ratio | Operations Subnet |

---

## 8. Dual-Era MCP Compatibility

LIOP gateways (`LiopMcpBridge`) provide backward and forward compatibility across model eras:

1. **MCP v2 (2026-07-28 Era)**:
   - Full support for `subscriptions/listen` and `resources/templates/list`.
   - Streaming event delivery without periodic polling.
2. **MCP v1 (2025-11-25 Era)**:
   - Automated message translation (`adaptResponseForLegacyClient`).
   - Strips modern schema envelopes before emitting JSON-RPC 2.0 frames to legacy clients like Claude Desktop.
3. **Cognitive Fallback**:
   If an agent issues a legacy MCP call attempting to pull raw records, the server returns an instructional prompt describing the available Data Dictionary and instructing the model how to formulate an injected `@LIOP` envelope.

---

## 9. Security Considerations & Threat Model

1. **Denial-of-Service via CPU Exhaustion**: Neutralized by strict instruction-level virtual fuel limits. Exceeding the quota trips an uncatchable host trap.
2. **Prototype Pollution (CWE-915)**: Neutralized by recursive prototype freezing (`Object.freeze`) prior to execution.
3. **Side-Channel Extraction**: Neutralized by 100-unit fuel quantization, poisoned `Date` objects, and static taint tracking blocking iterative byte-by-byte exfiltration.
4. **Man-in-the-Middle (MITM) & Replay**: Neutralized by ML-KEM-768 session encryption and SHA-256 `output_hash` validation in ZK-Receipts.

---

## 10. Governance & Amendments

Amendments to this specification require submission of a **LIOP Enhancement Proposal (LEP)**. All proposals MUST preserve the 7 Non-Negotiable Invariants defined in the [LIOP Manifesto](../MANIFESTO.md).

---

## 11. References

- [RFC 2119: Key words for use in RFCs to Indicate Requirement Levels](https://datatracker.ietf.org/doc/html/rfc2119)
- [RFC 9728: Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)
- [NIST FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism (ML-KEM)](https://csrc.nist.gov/pubs/fips/203/final)
- [NIST FIPS 204: Module-Lattice-Based Digital Signature Algorithm (ML-DSA)](https://csrc.nist.gov/pubs/fips/204/final)
- [NIST SP 800-226: Guidelines for Evaluating Differential Privacy Guarantees](https://csrc.nist.gov/pubs/sp/800/226/final)
- [WASI: WebAssembly System Interface Preview 1](https://wasi.dev/)
