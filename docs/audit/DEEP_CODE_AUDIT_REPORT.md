# Deep Code Audit Report: Sandboxing, Runtime & Data Protection

This document provides the formal code-level cybersecurity audit for the execution engine, sandboxing boundaries, and information flow protection mechanisms of the Logic-Injection-on-Origin Protocol (LIOP) monorepo.

Audit assessment performed under the `security-and-hardening` and `threat-mitigation-mapping` frameworks across both the TypeScript SDK and the Rust Core engine.

---

## 1. Executive Summary & Verification Metrics

The deep code audit evaluated all six defense layers of the LIOP protocol (The Shield) against memory corruption, prototype pollution, side-channel data derivation, supply chain vulnerabilities, and arbitrary code execution.

### Verification Suite Baseline

```
 Test Files  88 passed (88)
      Tests  618 passed | 9 skipped (627)
   Duration  219.68s
   Failures  0
```

- **Static Analysis Compliance:** 108 files verified via BiomeJS with 0 errors and 0 warnings.
- **Critical Vulnerabilities:** 0
- **High Severity Findings:** 0
- **Medium Severity Findings:** 0
- **Architectural Hardening Recommendations:** 2 (cataloged in Section 7)

---

## 2. Layer 1: AST Guardian & Import Allowlisting

### 2.1 Implementation Analysis

Located in `sdks/typescript/src/sandbox/guardian.ts` and `servers/liop-node/src/guardian.rs`.

```
Incoming WebAssembly Binary / AST Payload
                  │
                  ▼
   [ Zero-Time Heuristic Scanner ]
                  │
  ├── 1. Structural Bomb Defense: Checks if function count > 50,000 (Halts AST bombs)
  ├── 2. Import Allowlist Enforcement: Checks module namespace strictly
  │       - WASI preview 1: Exactly 14 allowed function imports
  │       - Native LIOP: "liop" host namespace imports only
  │       - Rejects: "env", "fs", "child_process", "wasi_unstable", etc.
  └── 3. Import Quota Gate: Rejects modules containing > 128 total imports
                  │
                  ▼
 [ Sanitized AST Passed to Runtime Engine ]
```

### 2.2 Verified Allowlist Specification

The Guardian enforces an exact 14-symbol allowlist for `wasi_snapshot_preview1`:
1. `fd_write`
2. `fd_read`
3. `fd_close`
4. `fd_seek`
5. `environ_get`
6. `environ_sizes_get`
7. `args_get`
8. `args_sizes_get`
9. `clock_time_get`
10. `random_get`
11. `proc_exit`
12. `fd_prestat_get`
13. `fd_prestat_dir_name`
14. `fd_fdstat_get`

Any import referencing outside namespaces or unauthorized WASI symbols immediately triggers a `GuardianError` prior to compilation, preventing compiler exploits or zero-day engine bugs.

---

## 3. Layer 2: Hardened V8 Isolate & Wasmtime Runtime

### 3.1 Implementation Analysis

Located in `sdks/typescript/src/sandbox/wasi.ts` and `servers/liop-node/src/executor.rs`.

The execution runtime implements a multi-barrier sandbox defense designed to withstand untrusted client-supplied logic:

1. **Global Scope Poisoning:**
   The global context is constructed via `Object.create(null)`. Twenty-seven hazardous host identifiers are explicitly neutralized:
   - Command Execution & Process Escape: `process`, `require`, `global`, `globalThis`, `eval`, `Function`.
   - Asynchronous Execution & Microtasks: `setTimeout`, `setInterval`, `setImmediate`, `queueMicrotask`.
   - Timing Reconnaissance: `Date`, `performance`, `Intl`.
   - Off-Heap Memory Buffers: `Buffer`, `SharedArrayBuffer`, `ArrayBuffer`, `DataView`, and all TypedArrays (`Uint8Array`, `Int8Array`, `Uint16Array`, `Int16Array`, `Uint32Array`, `Int32Array`, `Float32Array`, `Float64Array`, `BigInt64Array`, `BigUint64Array`).

2. **Pre-Execution Recursive Prototype Freezing (PCI-DSS Req. 6.2):**
   Before evaluating any user script, the isolate executes `Object.freeze` on eleven foundational prototypes:
   - `Object.prototype`
   - `Array.prototype`
   - `String.prototype`
   - `Number.prototype`
   - `Boolean.prototype`
   - `RegExp.prototype`
   - `Map.prototype`
   - `Set.prototype`
   - `Promise.prototype`
   - `Error.prototype`
   - `Object.getPrototypeOf(function(){})`

3. **Function Prototype Constructor Neutralization:**
   To eliminate escape via `this.constructor.constructor('return process')()`, the isolate explicitly marks the `constructor` property on function, async function, and generator function prototypes as non-writable and non-configurable (`value: undefined`).

4. **Realm-Bound Record Parser:**
   Host records and parameters are serialized to JSON and reconstructed inside the sandbox using a realm-isolated parsing function. All objects are constructed with prototype-free null prototypes (`Object.create(null)`) and frozen recursively via `deepFreeze`, preventing host prototype leakage.

5. **Timing Side-Channel Protection (NIST SP 800-53 SC-38):**
   Instruction fuel consumption is computed via `calculateAstInstructionFuel(code)` using Acorn AST traversal. The resulting fuel score is quantized into 100-unit buckets (`Math.ceil(score / 100) * 100`), ensuring that execution fuel metrics remain invariant across differing data payloads.

6. **Wasmtime Resource Limiter (Rust Core):**
   The Rust execution node enforces a strict memory ceiling of 800 Wasm pages (51.2 MB linear memory) and a maximum of 10,000 table elements via `ResourceLimiter`. CPU execution is bounded by a hard fuel budget of 500,000,000 units.

---

## 4. Layer 3: Taint Analyzer & Information Flow Control (IFC)

### 4.1 Implementation Analysis

Located in `sdks/typescript/src/security/taint-analyzer.ts`.

The Taint Analyzer performs static AST analysis using an Acorn five-pass engine to identify unauthorized exfiltration of restricted data through scalar derivation.

```
                  Injected Logic Code String
                              │
                              ▼
        [ Pass 1: Record-Bound Variable Identification ]
                              │
        [ Pass 2: Iterative Transitive Taint Propagation ]
                              │
        [ Pass 3: Return Statement Sink Detection ]
                              │
        [ Pass 4: Correlation Guard (n < 50 records) ]
                              │
        [ Pass 5: Min/Max Gate (n < 50 records) ]
                              │
                              ▼
            [ Clean / TaintViolation Result ]
```

### 4.2 Verified Exfiltration Defenses

- **Character Code Derivation:** Detects and blocks `charCodeAt`, `codePointAt`, `charAt`, and array indexing on PII properties.
- **Search & Position Probing:** Intercepts `indexOf`, `lastIndexOf`, `search`, `startsWith`, `endsWith`, and `includes`.
- **String Transformations:** Blocks `substring`, `slice`, `substr`, `split`, `replace`, and `normalize` on sensitive fields.
- **Boolean Inference:** Evaluates ternary expressions (`a.name.startsWith('A') ? 1 : 0`) and binary comparisons. If a conditional branch depends on a tainted value, the resultant value is marked as tainted.
- **Small-Dataset Correlation Guard:** Rejects multiple reductions or extrema calculations (`Math.min`, `Math.max`, `.sort()[0]`) when source dataset size $n < 50$, preventing binary search identification of individual records.

---

## 5. Layer 4: Egress PII Shield & Data Lost Prevention

### 5.1 Implementation Analysis

Located in `sdks/typescript/src/server/pii.ts`.

The Egress Shield inspects all outgoing analytical payloads crossing the enclave network boundary via a four-tier pipeline:

1. **Exact Key Matching:** Constant-time $O(1)$ lookup against cataloged PII identifiers (`email`, `phone`, `ssn`, `accountHolder`, `pan`, `creditCard`).
2. **Boundary-Aware Fuzzy Matching:** Evaluates short tokens (`id`) with camelCase and snake_case boundary expressions, preventing false positives on safe technical terms such as `grid`, `video`, `android`, `timestamp`, `image_id`, or `zk_receipt`.
3. **Algorithmic Pattern Verification:**
   - Credit Cards: Regex match coupled with mandatory Luhn algorithm verification.
   - Bank Accounts: International Bank Account Number (IBAN) validation using ISO 7064 Modulo 97 computed with `BigInt` arithmetic.
   - Social Security Numbers: Area, group, and serial number validity checks rejecting test series.
   - Phone Numbers: Rejection of decimal structures where dots follow more than four consecutive digits.
4. **Analytical Float vs Discrete Identifier Invariant:**
   Floating-point numeric values (`typeof input === "number" && !Number.isInteger(input)`) are exempt from discrete PII regex matching, eliminating false positive blocks on monetary totals, percentages, and mathematical averages.
5. **Anti-Evasion Deep Parsing:**
   Recursively unpacks stringified JSON structures to detect and neutralize double-encoding evasion techniques.

---

## 6. Layer 5: Aggregation-First Policy & Differential Privacy Engine

### 6.1 Implementation Analysis

Located in `sdks/typescript/src/security/dp-engine.ts`.

When analytical queries operate on datasets below the statistical privacy threshold ($n < 50$), the Differential Privacy engine applies calibrated Laplace noise:

1. **CSPRNG Source (NIST SP 800-226 §3.2):**
   Generates noise samples using `crypto.randomBytes(4)` rather than `Math.random()`. This prevents pseudo-random state reconstruction attacks where an observer could deduce future noise values from successive queries.
2. **Query-Aware Sensitivity Allocation:**
   - Count operations (`count`, `length`, `size`, `total_records`) allocate sensitivity equal to 1.
   - Average and ratio operations allocate sensitivity normalized by record count ($S / n$).
   - Sum operations use global sensitivity bounds.
3. **Epsilon Floor:**
   For ultra-small datasets ($n < 10$), epsilon is clamped to a minimum floor of 1.0 to prevent complete utility destruction while maintaining formal privacy guarantees.
4. **Deterministic Audit Mode (DDP):**
   When operating under audit mode, the engine derives pseudorandomness deterministically from the dataset hash, image ID, and an incrementing counter via SHA-256, allowing reproducible ZK-receipt generation.

---

## 7. Layer 6: Cryptographic ZK-Receipt Verification

### 7.1 Implementation Analysis

Located in `sdks/typescript/src/workers/zk-verifier.ts` and `servers/liop-node/src/zk.rs`.

Each completed computation emits an authenticated ZK-receipt proving execution integrity:

1. **HMAC-SHA256 V1 Receipts:**
   - Evaluates whether the remote ImageID matches the locally derived AST digest.
   - Verifies the cryptographic seal using `crypto.timingSafeEqual` against the Kyber-derived session secret.
   - Confirms that the output hash recorded in the journal matches the SHA-256 digest of the actual returned output, defeating reply and mutation attacks.
2. **Groth16 & PQC V2 Hybrid Receipts:**
   - Verifies zero-knowledge SNARK proofs against verified arithmetic circuits.
   - Validates post-quantum digital signatures using ML-DSA-65 (NIST FIPS 204).

---

## 8. Architectural Hardening Recommendations

During this deep code audit, two non-critical areas were identified for optimization in upcoming milestones:

1. **Explicit Two-Decimal Normalization for Financial Enclave Adapters:**
   - Finding: Enclaves returning floating-point monetary averages rely on standard JavaScript formatting.
   - Recommendation: Standardize all enclave adapters to explicitly apply `Math.round(val * 100) / 100` before serializing responses, eliminating IEEE 754 precision tails across differing CPU architectures.
2. **Static Import Whitelist Synchronization in Semgrep:**
   - Finding: The 14-symbol WASI allowlist is checked dynamically at runtime by `ASTGuardian`.
   - Recommendation: Institutionalize these rules in the Phase 4 CI/CD pipeline using custom Semgrep queries to flag unauthorized import bindings during pull request checks.
