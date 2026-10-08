# SAST Quality Gate & Continuous Security Verification Specification

This document provides the formal engineering specification for the Static Application Security Testing (SAST) pipeline and automated quality gates guarding the Logic-Injection-on-Origin Protocol (LIOP) monorepo.

Implementation established in accordance with the `sast-configuration` framework to satisfy NIST SP 800-53 SA-11 (Developer Security Testing), SOC 2 CC7.1 (Vulnerability Detection), and PCI-DSS v4.0 Requirement 6.2.

---

## 1. DevSecOps Architecture & CI/CD Pipeline Integration

To guarantee that security constraints are continuously verified prior to merging and deployment, static security analysis is integrated directly into GitHub Actions via `.github/workflows/security-scan.yml`.

```
 [ Developer Commit / Pull Request ]
                 │
                 ▼
 ┌────────────────────────────────────────────────────────┐
 │           GitHub Actions Security Runner               │
 │  ├── 1. Harden Runner (StepSecurity Egress Filter)     │
 │  ├── 2. Python 3.12 & Semgrep CLI Setup                │
 │  ├── 3. LIOP Protocol Custom Rules Scan (Blocking)     │
 │  │      - Config: .semgrep/liop-security-rules.yaml    │
 │  │      - Action: Exit Code 1 on any ERROR violation   │
 │  └── 4. Community Baseline Scan (SARIF Report)         │
 │         - Config: p/security-audit + p/owasp-top-ten   │
 │         - Action: Upload to GitHub Security Dashboard  │
 └──────────────────────┬─────────────────────────────────┘
                        │
                        ▼
      [ Quality Gate: Passed (Exit 0) ]
```

---

## 2. LIOP Custom Semgrep Rules Catalog

The repository maintains specialized static security rules located in `.semgrep/liop-security-rules.yaml` designed to detect protocol-level anti-patterns and sandbox escape attempts.

### 2.1 Rule Inventory & Regulatory Mapping

| Rule Identifier | Severity | Primary Target | CWE / OWASP Classification | Enforcement Behavior |
|---|---|---|---|---|
| `liop-banned-eval-construction` | ERROR | Arbitrary dynamic code execution | CWE-95 / OWASP A03:2021 (Injection) | Immediate PR Block |
| `liop-prototype-pollution-assignment` | ERROR | Object prototype modification | CWE-1321 / OWASP A03:2021 (Prototype Pollution) | Immediate PR Block |
| `liop-raw-records-egress-leak` | ERROR | Direct return of unaggregated data | CWE-200 / OWASP A01:2021 (Data Exposure) | Immediate PR Block |
| `liop-insecure-random-in-dp` | ERROR | Non-cryptographic PRNG in DP | CWE-338 (Weak PRNG) | Immediate PR Block |
| `liop-blocking-io-in-interceptors` | WARNING | Synchronous I/O in telemetry pipes | CWE-400 (Resource Exhaustion) | Pipeline Warning |
| `liop-banned-host-process-imports` | ERROR | Hazardous host process execution imports | CWE-78 / OWASP A03:2021 (Command Injection) | Immediate PR Block |

---

## 3. Detailed Rule Mechanics

### 3.1 Banned Dynamic Evaluation (`liop-banned-eval-construction`)

- **Description:** Scans JavaScript and TypeScript source files for invocations of `eval()`, `new Function()`, or `Function()`.
- **Rationale:** Untrusted client logic must only execute within the hardened V8 Isolate or Wasmtime runtime. Using dynamic constructors in the host runtime introduces direct command injection vulnerabilities.
- **Exclusions:** Unit test suites (`**/*.test.ts`), UI client SPA (`**/tools/liop-studio/ui/**`), and sandbox initialization modules where global symbols are explicitly assigned to `undefined`.

### 3.2 Prototype Pollution Defense (`liop-prototype-pollution-assignment`)

- **Description:** Detects property assignments on `__proto__`, calls to `Object.setPrototypeOf()`, or direct mutations on prototype objects.
- **Rationale:** Prevents developers from accidentally introducing prototype pollution pathways that could undermine the sandbox pre-execution freezing guarantees mandated by PCI-DSS Requirement 6.2.

### 3.3 Aggregation-First Policy Enforcement (`liop-raw-records-egress-leak`)

- **Description:** Intercepts functions returning unaggregated record collections (`return env.records;` or `return records;`).
- **Rationale:** Enforces data sovereignty by ensuring that raw healthcare (ePHI) and banking records cannot cross the network boundary without prior reduction or differential privacy processing.

### 3.4 Cryptographic Randomness Verification (`liop-insecure-random-in-dp`)

- **Description:** Blocks usage of `Math.random()` inside the `src/security/` module directory.
- **Rationale:** Differential privacy Laplace mechanisms must strictly derive entropy from OS-level CSPRNG pools (`crypto.randomBytes()`) per NIST SP 800-226 §3.2 to prevent state reconstruction attacks.

### 3.5 Interceptor Concurrency Protection (`liop-blocking-io-in-interceptors`)

- **Description:** Flags synchronous filesystem APIs (`fs.readFileSync`, `fs.writeFileSync`) inside network interceptors.
- **Rationale:** High-throughput gRPC streams and telemetry pipelines will experience severe head-of-line blocking if audit log interceptors perform blocking disk writes on the main Node.js event loop.

### 3.6 Hazardous Host Process Import Defense (`liop-banned-host-process-imports`)

- **Description:** Detects unauthorized imports of host execution primitives (`child_process`, `cluster`, `worker_threads`) in sensitive sandbox, server, and security modules.
- **Rationale:** Institutionalizes the import whitelist at the static level to prevent sandbox escapes, ensuring host execution boundaries cannot be bypassed via developer error or malicious third-party dependencies.

---

## 4. Quality Gate Policies & False Positive Management

### 4.1 Blocking Criteria

The GitHub Actions workflow enforces strict pass/fail criteria:
- Any finding matching a custom LIOP rule with `severity: ERROR` immediately fails the workflow with an exit code of 1, preventing merge into protected branches (`alpha`, `beta`, `main`).
- Community rulesets (`p/security-audit`, `p/owasp-top-ten`) generate SARIF reports uploaded to GitHub Advanced Security to provide visibility into third-party dependency trends.

### 4.2 False Positive Triage & Suppression Standards

When a static finding is determined to be a legitimate false positive:
1. **Inline Suppression Requirement:**
   The developer must place an explicit suppression comment on the line immediately preceding the finding:
   ```typescript
   // nosemgrep: liop-banned-eval-construction -- verified test fixture only
   ```
2. **Mandatory Documentation:**
   The pull request description must explain why the pattern is safe and reference the architectural invariant maintaining protection. Blanket repository-wide suppressions are strictly prohibited.
