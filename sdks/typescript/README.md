<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Nekzus/LIOP/main/docs/logo/dark.svg">
    <img alt="Logic-Injection-on-Origin Protocol Logo" src="https://raw.githubusercontent.com/Nekzus/LIOP/main/docs/logo/light.svg" width="700">
  </picture>

  <h1>Logic-Injection-on-Origin Protocol (LIOP), TypeScript SDK</h1>
  <p><strong>The official TypeScript SDK and MCP Bridge for the Logic-Injection-on-Origin Protocol.</strong></p>

  <p align="center">
    <a href="https://github.com/Nekzus/LIOP/actions/workflows/ci.yml"><img src="https://github.com/Nekzus/LIOP/actions/workflows/ci.yml/badge.svg?event=push" alt="Github Workflow"></a>
    <a href="https://www.npmjs.com/package/@nekzus/liop"><img src="https://img.shields.io/npm/v/@nekzus/liop.svg" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/@nekzus/liop"><img src="https://img.shields.io/npm/dm/@nekzus/liop.svg" alt="npm downloads"></a>
    <a href="https://github.com/Nekzus/LIOP/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
    <a href="https://nekzus-32.mintlify.app/typescript-sdk/overview"><img src="https://img.shields.io/badge/docs-mintlify-0D9373?style=flat" alt="Docs"></a>
    <a href="https://deepwiki.com/Nekzus/LIOP"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
  </p>
</div>

---

## Official Documentation

Comprehensive interactive guides, architectural deep dives, and API specifications are hosted on our official portal:

| Documentation Section | Focus Area | Canonical Guide |
|---|---|---|
| **Overview & Setup** | Package architecture, core exports, and installation modes | [SDK Overview](https://nekzus-32.mintlify.app/typescript-sdk/overview) |
| **LiopClient API** | Discovery, intent negotiation, gRPC channels, and error catalog | [LiopClient Reference](https://nekzus-32.mintlify.app/typescript-sdk/client) |
| **LiopServer API** | Capability hosting, Zod schemas, and V8 sandboxing boundaries | [LiopServer Reference](https://nekzus-32.mintlify.app/typescript-sdk/server) |
| **LiopMcpBridge** | Zero-trust wrapping of `@modelcontextprotocol/sdk` servers | [Bridge Documentation](https://nekzus-32.mintlify.app/typescript-sdk/bridge) |
| **Runtime & Discovery** | `TopologyProbe`, `RoutingTable` circuit breaker, and `TokenManager` | [Runtime Architecture](https://nekzus-32.mintlify.app/typescript-sdk/runtime) |
| **Security Architecture** | 6-Layer defense-in-depth, AST Guardian, and Egress PII Shield | [Security Guide](https://nekzus-32.mintlify.app/typescript-sdk/security) |
| **Observability & SRE** | Prometheus metrics catalog and 26-panel Grafana master dashboard | [Observability Runbook](https://nekzus-32.mintlify.app/operations/observability-runbook) |

---

## Overview

`@nekzus/liop` is an SDK that implements the **Logic-Injection-on-Origin (LIO)** paradigm: instead of extracting raw data from a server and sending it to an LLM, the LLM injects a micro-module of logic to be executed *at the data source*, inside a secure sandbox. The result, and never the raw data, is returned.

This addresses the data privacy, bandwidth, and latency bottlenecks of distributed agent data analysis.

### Key Capabilities

| Feature                             | Description                                                                                                                                |
| :---------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **Logic-Injection-on-Origin** | LLMs send code, not queries. Data never leaves the origin server.                                                                          |
| **Dual-Era MCP Compliance**   | Dual-era compatibility supporting modern stateless MCP v2 (2026-07-28) and legacy MCP (2025-11-25) clients (Claude Desktop, Cursor).    |
| **Token Economy Engine**      | Inlined BPE `o200k_base` tokenizer with zero runtime dependencies (16.5MB footprint reduction) and OpenTelemetry `gen_ai.*` bridge.       |
| **Interactive Playground UI** | Real-time Web UI (`:16000` prod / `:14000` dev) with 4-tab modular architecture (`Output`, `Debug`, `Telemetry`, `Export`), code generation (TS/cURL/Python), and dual OLED/Slate themes. |
| **Multi-Tier Sovereign Enclaves** | Physical socket isolation via `@libp2p/pnet` (256-bit Swarm Key PSK) and Border LIO Gateway (`blg`) with OAuth 2.1 authentication.       |
| **AST Fuel Metering**         | Deterministic AST instruction fuel scoring with 100-bucket quantization for NIST SP 800-53 timing side-channel elimination (`stddev = 0`).|
| **Differential Privacy Engine** | NIST SP 800-226 Laplace mechanism with CSPRNG entropy, query-aware sensitivity, and deterministic ZK-Receipt auditing (`DpEngine`). |
| **MCP Drop-in Replacement**   | `LiopServer` mirrors the Anthropic MCP `Server` API (tools, resources, and prompts with `Zod` schemas).                             |
| **Guardian AST**              | Pre-execution heuristic inspection blocks sandbox escapes (`require`, `fs`, `eval`, `fetch`, prototype pollution).                 |
| **IFC Taint Analyzer**        | 5-pass Acorn AST information flow control tracking collection aliases, correlation guards, and extrema gates at preflight.         |
| **WASI Sandbox**              | JavaScript payloads execute inside V8 isolates with CPU fuel limits, no Node.js globals, and safe environment isolation (`allowEnv`). |
| **Adaptive Network Discovery**| Single-URL RFC 9728 Protected Resource Metadata probe and adaptive execution mode resolution (`TopologyProbe`).                   |
| **Resilient Hybrid Routing**  | Deterministic per-tool multiplexing across `http-gateway`, `p2p-grpc`, and `local` with 5-failure circuit breaker (`RoutingTable`).|
| **OAuth 2.1 M2M Lifecycle**   | Concurrency in-flight de-duplication, 30-second preemptive refresh buffer, and reactive invalidation (`TokenManager`).            |
| **Sliding-Window Rate Limiter**| In-memory OWASP API4:2023 rate limiting with background cleanup unreferenced intervals (`InMemoryRateLimiter`).                    |
| **PII Shield**                | Multi-layer egress filter with Regional Presets, custom keys, and recursive floats sanitization (`sanitizeOutput`). |
| **ZK-Receipts**               | Sovereign Zero-Knowledge Proofs: Groth16 BN254 with 144-byte binary journal (v2) and legacy HMAC-SHA256 (v1). Enforces `ZK_BLOCKING` on Tier 1 Enclaves. |
| **Worker Pool**               | Heavy computation (crypto, sandboxing) dispatched to OS threads via `piscina` with background async warmup. |
| **Post-Quantum Ready**        | ML-KEM-768 (Kyber) + ML-DSA-65 (Dilithium) with 1-hour session lifetime and AES-256-GCM encryption.                                        |
| **Enterprise Observability**  | Immutable SOC 2 Hash-Chain audit log (`AuditLogger`), physical wire egress tracking, Prometheus metrics (`/metrics`), and K8s probes.      |
| **P2P Mesh**                  | Kademlia DHT discovery via `libp2p` with TCP + WebSocket + Yamux multiplexing and Noise encryption.                                      |

---

## Installation

```bash
npm install @nekzus/liop@latest
```

Or for the latest stable zero-trust features on the beta channel:

```bash
npm install @nekzus/liop@beta
```

> **Requirements:** Node.js ≥ 20.0. The SDK uses `node:crypto`, `node:vm`, and `piscina` (worker threads) internally.

### Zero-Bloat & Micro-Deployments (Opt-Out)

By default, the SDK provides backward compatibility with MCP (`LiopMcpBridge`) by declaring `@modelcontextprotocol/sdk` as an optional dependency (which is automatically resolved by standard installations of NPM, PNPM, or Yarn).

For constrained production environments (e.g., Docker, AWS Lambda, Edge/IoT) where every megabyte counts, you can perform a **pure, zero-bloat LIOP installation** by opting out of the optional dependencies:

```bash
# npm
npm install @nekzus/liop@latest --no-optional

# pnpm
pnpm add @nekzus/liop@latest --without optional

# yarn
yarn add @nekzus/liop@latest --ignore-optional
```

The SDK uses dynamic `import()` statements under the hood to ensure that MCP translator modules are only loaded if they are actually instantiated, guaranteeing a lightweight memory footprint.

---

## LIOP Agent (CLI)

The SDK includes a zero-config agent CLI (`liop`) designed to bridge the Logic-Injection-on-Origin Protocol with local AI clients like **Claude Desktop**.

### Installation & Run

You can run the agent directly using `npx` (recommended) or install it globally:

```bash
# Run instantly
npx @nekzus/liop@latest

# Or install globally
npm install -g @nekzus/liop@latest
liop
```

### Claude Desktop Configuration

To integrate LIOP into Claude Desktop, update your `claude_desktop_config.json` (typically found in `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "liop": {
      "command": "npx",
      "args": ["-y", "@nekzus/liop@latest"],
      "env": {
        "LIOP_NEXUS_URL": "http://your-nexus-host:15000",
        "LIOP_LOG_LEVEL": "info",
        "LIOP_TOKEN_BANK": "your-secure-bank-token",
        "LIOP_TOKEN_VAULT": "your-secure-vault-token",
        "NODE_OPTIONS": "--use-system-ca"
      }
    }
  }
}
```

### Persistence & Identity

The agent automatically manages your P2P identity:

- **Identity Path**: `~/.liop/identity.json`. This file contains your unique PeerID. Keep it safe if you want to maintain a consistent identity in the mesh.
- **Bootstrap Nodes**: By default, the agent connects to the **LIOP Alpha Nexus**. You can provide custom bootstrap addresses as CLI arguments:
  ```bash
  npx @nekzus/liop@latest /ip4/1.2.3.4/tcp/4001/p2p/PEER_ID
  ```

---

## Quick Start

### 1. Create a Server

```typescript
import { LiopServer, PII_PATTERNS } from "@nekzus/liop/server";
import { z } from "zod";

const server = new LiopServer(
  { name: "MyDataNode", version: "1.0.0" },
  {
    capabilities: { tools: { listChanged: true } },
    security: {
      // Built-in PII detection (Email, Credit Card, IP, Phone)
      piiPatterns: [PII_PATTERNS.EMAIL, PII_PATTERNS.CREDIT_CARD],
      // Keys that will be stripped from any outgoing response
      forbiddenKeys: ["id", "ssn", "password", "email", "name"],
    },
  }
);
```

### 2. Register a Tool

```typescript
server.tool(
  "analyze_logs",
  "Analyzes local log files without sending raw data to the LLM.",
  { target_error: z.string().describe("The error pattern to search for") },
  async ({ target_error }) => {
    // This logic runs at origin, data never leaves the server
    return {
      content: [{ type: "text", text: `Found 51 occurrences of ${target_error}` }],
    };
  }
);
```

### 3. Connect to Claude Desktop / Cursor (MCP Bridge)

```typescript
import { LiopMcpBridge } from "@nekzus/liop/bridge";

const bridge = new LiopMcpBridge(server);
await bridge.connect(); // Listens on stdio (JSON-RPC 2.0)
```

**Claude Desktop config** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "my-data-node": {
      "command": "npx",
      "args": ["tsx", "src/server.ts"]
    }
  }
}
```

---

## Module Exports

The package exposes targeted entry points to minimize bundle size:

```typescript
import { LiopServer, PII_PATTERNS } from "@nekzus/liop/server";
import { LiopMcpBridge }             from "@nekzus/liop/bridge";
import { LiopClient }                from "@nekzus/liop/client";
import type { Tool, Resource, Prompt, CallToolRequest, CallToolResult } from "@nekzus/liop/types";
```

---

## API Reference

### `LiopServer`

The core class for declaring data nodes. API-compatible with Anthropic's MCP `Server`.

#### Constructor

```typescript
new LiopServer(
  serverInfo: { name: string; version: string },
  config?: {
    capabilities?: Record<string, unknown>;
    workerPool?: {
      enabled?: boolean;           // Enable OS-thread sandboxing (default: true)
      minThreads?: number;         // Min worker threads (default: CPU count based)
      maxThreads?: number;         // Max worker threads (default: CPU count)
      idleTimeout?: number;        // Idle timeout in milliseconds for workers
      maxHeapMb?: number;          // V8 heap limit per worker (default: 64, env: LIOP_WORKER_MAX_HEAP_MB)
    };
    security?: {
      piiPatterns?: PiiRule[];     // Regex/validator rules for PII detection
      forbiddenKeys?: string[];    // Keys stripped from outgoing responses
      sensitiveKeys?: string[];    // Keys that trigger sensitive query budget
      enableNerScanning?: boolean; // NLP entity detection via compromise (default: false)
      rateLimit?: {                // Sliding window rate limiter configuration
        maxPerWindow?: number;     // Max calls per window per tool (default: 15)
        globalMaxPerWindow?: number; // Max total calls across all tools (default: 40)
        windowMs?: number;         // Window duration in ms (default: 60000)
      };
    };
    taxonomy?: {                   // Data domain classification
      domain?: string;             // e.g., "finance", "healthcare"
      clearanceTier?: number;      // e.g., 3, 5 (strictly numeric)
      executionTypes?: string[];   // e.g., ["aggregation", "analytics"]
    };
    auth?: LiopAuthConfig;         // OAuth 2.1 Hybrid authentication config
    tokenSlug?: string;            // Deterministic token resolution slug (e.g., "BANK", "VAULT")
    allowEnv?: boolean;            // Enable safe host environment propagation (default: false)
    budgetStorePath?: string;      // Path to a shared JSON file for persistent Query Budget tracking
  }
)
```

#### Methods

| Method                       | Signature                                          | Description                                                                         |
| :--------------------------- | :------------------------------------------------- | :---------------------------------------------------------------------------------- |
| `tool()`                   | `(name, description, shape, handler, policy?)`     | Registers a callable tool with Zod input validation and logic execution policies.   |
| `prompt()`                 | `(name, description, args, handler)`             | Registers a dynamic prompt template.                                                |
| `resource()`               | `(name, uri, description?, mimeType?, content?)` | Registers a readable resource.                                                      |
| `dataDictionary()`         | `(schema, name?, uri?, description?)`            | Broadcasts a data schema so LLMs can write accurate Logic-Injection-on-Origin code. |
| `setSandboxData()`         | `(records: Record[])`                            | Injects data into the sandbox as `env.records` for Logic-on-Origin tools.         |
| `enableZeroShotAutonomy()` | `()`                                             | Registers the "Blind Analyst" prompt for autonomous code generation.                |
| `callTool()`               | `(request: CallToolRequest)`                     | Invokes a registered tool (used locally or via MCP Bridge).                         |
| `listTools()`              | `()`                                             | Returns all registered tools.                                                       |
| `listPrompts()`            | `()`                                             | Returns all registered prompts.                                                     |
| `getPrompt()`              | `(request: GetPromptRequest)`                    | Returns a specific prompt by name.                                                  |
| `listResources()`          | `()`                                             | Returns all registered resources.                                                   |
| `readResource()`           | `(uri: string)`                                  | Reads a resource by URI.                                                            |
| `getServerInfo()`          | `()`                                             | Returns the server's name and version.                                              |
| `connectToMesh()`          | `()`                                             | Connects to the libp2p Kademlia DHT.                                                |
| `clearAstCache()`          | `()`                                             | Invalidates the Guardian AST logic cache.                                           |
| `close()`                  | `()`                                             | Destroys the worker pool and releases threads.                                      |

#### LogicExecutionPolicy Options

When registering a tool via `server.tool()`, you can optionally pass a `policy` object to configure security and privacy guards for that specific tool:

```typescript
interface LogicExecutionPolicy {
  outputSchema?: z.ZodType<unknown>;         // Validate returned business payload (strict by default)
  enforceAggregationFirst?: boolean | AggregationPolicy; // Block row-level exports & enforce K-Anonymity
  preflightDenyPatterns?: RegExp[];          // Custom regex patterns blocked in static analysis
  dpEpsilon?: number;                        // Laplace Differential Privacy epsilon (default: 1.0)
  dpSensitivity?: number;                    // Maximum change per single record (default: 1.0)
  dpSmallDatasetThreshold?: number;          // Size threshold below which DP is active (default: 50)
  queryBudgetPerField?: number;              // Uniform session query limit per field (legacy compatibility)
  sensitiveKeys?: string[];                  // Tool-level fields under the 8-query sensitive budget tier
  budgetStorePath?: string;                  // Shared path for persistent and concurrent query budgets
}
```

### `LiopMcpBridge`

Adapter that connects any `LiopServer` to MCP-compatible clients via JSON-RPC 2.0 over stdio.

```typescript
const bridge = new LiopMcpBridge(server);
await bridge.connect();
```

**Supported JSON-RPC methods:**

- `initialize`: Returns server capabilities and info
- `tools/list`: Lists available tools
- `tools/call`: Calls a tool (with ZK-Receipt verification)
- `resources/list`: Lists available resources
- `resources/read`: Reads a resource
- `prompts/list`: Lists available prompts
- `prompts/get`: Gets a specific prompt

---

## Security Architecture

### Defense-in-Depth Architecture

```
┌───────────────────────────────────────────────────────────┐
│  Layer 1: Guardian AST (Pre-Execution Static Analysis)    │
│  14-function WASI allowlist • 128 import cap • Blocks     │
│  require, import(), fs, eval, fetch, __proto__            │
├───────────────────────────────────────────────────────────┤
│  Layer 2: WASI Sandbox (V8 Isolate)                       │
│  25 poisoned globals (incl. Date, TypedArrays) •          │
│  CPU Fuel limits • 5s timeout • maxHeapMb (64MB default)  │
│  Object.freeze() on 11 core prototypes • allowEnv allowlist │
├───────────────────────────────────────────────────────────┤
│  Layer 3: Taint Analyzer (IFC, Static)                    │
│  Acorn AST 3-pass analysis blocks PII side-channels:      │
│  charCodeAt, boolean inference, arithmetic derivation     │
├───────────────────────────────────────────────────────────┤
│  Layer 4: PII Shield (Egress Filter)                      │
│  4-stage pipeline: exact key → fuzzy key → pattern        │
│  validators (Luhn, IBAN Mod-97) → NER (compromise) •      │
│  Recursive In-Memory Numerical Sanitization (4 decimals)  │
├───────────────────────────────────────────────────────────┤
│  Layer 5: Aggregation-First Policy                        │
│  Blocks raw row export • maxOutputRows (default: 10) •    │
│  Conditional error: detailed (dev) vs opaque (production) │
├───────────────────────────────────────────────────────────┤
│  Layer 6: ZK-Receipt (Groth16 BN254 & Replay Mitigation)   │
│  Version 2: 144-byte binary journal + Groth16 curve points │
│  Version 1: HMAC-SHA256 session commitment (Kyber768)      │
│  output_hash cross-verification • Balanced-brace extractor │
└───────────────────────────────────────────────────────────┘
```

### PII Patterns

Built-in patterns with multi-layer verification:

```typescript
import { PII_PATTERNS, PII_PRESETS } from "@nekzus/liop/server";

// Available patterns:
PII_PATTERNS.EMAIL         // RFC 5322 compliant, excludes @example.com/@test.com
PII_PATTERNS.CREDIT_CARD   // Visa/MC/Amex + Luhn algorithm validation
PII_PATTERNS.IP_ADDRESS    // IPv4 with octet range validation (excludes localhost)
PII_PATTERNS.PHONE         // International phone formats with digit-length validation
PII_PATTERNS.SSN           // USA Social Security Number rules (blocks 000 segments)
PII_PATTERNS.IBAN          // ISO 7064 Modulo 97-10 algorithm precision via BigInt
PII_PATTERNS.PASSPORT_MRZ  // Strict 44-character TD3 international passport MRZ string

// Pre-built Regional Presets ready to drop-in via LiopServer(options):
PII_PRESETS.GLOBAL_STRICT
PII_PRESETS.US_COMPLIANT
PII_PRESETS.EU_GDPR
```

### Forbidden Keys

The PII Shield automatically strips any key from outgoing responses that matches your configured list:

```typescript
const server = new LiopServer(info, {
  security: {
    forbiddenKeys: ["id", "ssn", "password", "token", "secret", "email", "name"],
  },
});
// Any response containing these keys → instantly blocked with "Egress Security Violation"
```

### Envelope & Cryptographic Unwrapping

To avoid false positive triggers caused by HMAC-SHA256 ZK-Receipt signatures or transport wrapper frames (such as `{ content: [{ type: "text", text: "..." }] }`), the PII Shield and Aggregation-First engines scan only the unwrapped business data (via `unwrapForAggregationPolicyScan`). Cryptographic seals and protocol routing structures are isolated and excluded from compliance scans.

### 3-Tier Query Budget (NIST SP 800-226)

To prevent advanced statistical differentiation or database reconstruction attacks, the SDK implements a tiered, session-based budget engine:

- **Forbidden Tier** (Limit: `3` queries/session): Applied to highly restricted variables like user IDs, passwords, emails, SSNs (configured via `forbiddenKeys`).
- **Sensitive Tier** (Limit: `8` queries/session): Applied to moderately sensitive variables like account types, medical diagnoses, blood types, financial tickers (configured via `sensitiveKeys`).
- **Public Tier** (Limit: `25` queries/session): Default budget for non-sensitive public metadata.

If an injected payload queries a field beyond its budget limit, the preflight static analysis immediately blocks execution.

### K-Anonymity on Small Datasets

When operating on high-privacy datasets, if the source records count is **less than 10**, the SDK forces a strict K-Anonymity restriction:
- Rejects any output that contains nested objects or arrays.
- Restricts the returned structure to a maximum of **3 scalar keys** (e.g., simple aggregate counts or statistics).
- Prevents structural data leakage in low-entropy datasets.

### Sandbox Poisoned Globals & Date Workaround

For maximum host security, the WASI sandbox enforces a poisoned environment that strips dangerous globals and prevents timing side-channels:
- **Poisoned/Disabled**: `Date` (Date.now, parse, etc. throw an exception to prevent timing analysis), `eval`, `Function`, `setTimeout`, `setInterval`, `Buffer`, `ArrayBuffer`, and all `TypedArrays`.
- **Date Workaround**: To perform date checks, use lexicographical string comparison on ISO 8601 strings (e.g., `record.date >= "2026-01-01"`).

### Recursive In-Memory Numerical Sanitization

To mitigate timing channels, statistical differentiation, and floats side-channels, the SDK executes a recursive sanitization pipeline before the PII scanner runs:
- Positive floating-point numbers are recursively rounded to exactly **4 decimal places**.
- Negative values are safely clamped to **0** (via `sanitizeOutput()`).
- This operation runs entirely in-memory and recursively on all fields, preserving data structure immutability without expensive and fragile serialization-deserialization cycles.

### Environment Isolation & allowEnv Allowlist

For robust sandboxing, the WASI execution path isolates host environment variables. Propagation can be enabled explicitly:
```typescript
const server = new LiopServer(info, {
  allowEnv: true
});
```
To block arbitrary command execution (e.g., Shellshock) and prevent exposure of host credentials, the SDK filters environment variables through a **strict system allowlist** (`getDefaultEnvironment()`):
- **Windows Allowlist**: `APPDATA`, `HOMEDRIVE`, `HOMEPATH`, `LOCALAPPDATA`, `PATH`, `PROCESSOR_ARCHITECTURE`, `SYSTEMDRIVE`, `SYSTEMROOT`, `TEMP`, `USERNAME`, `USERPROFILE`, `PROGRAMFILES`.
- **Unix/Linux Allowlist**: `HOME`, `LOGNAME`, `PATH`, `SHELL`, `TERM`, `USER`.
Variables starting with shell functions `()` are dropped.

### Sovereign ZK-Receipts & Groth16 Attestation

LIOP ZK-Receipts provide cryptographic evidence that a computation was executed honestly under zero-trust bounds. Version 2 receipts introduce true Zero-Knowledge Groth16 proofs over the BN254 pairing-friendly elliptic curve, packing a 144-byte binary journal:

- **144-Byte Binary Journal Layout**:
  - `guest_image_id` (32 bytes): Sovereign enclave guest runtime image identifier
  - `logic_digest` (32 bytes): SHA-256 fingerprint of the executed JavaScript/WASM logic
  - `dataset_digest` (32 bytes): SHA-256 fingerprint of the origin dataset at execution time
  - `output_digest` (32 bytes): SHA-256 fingerprint of the sanitized computation result
  - `fuel_consumed` (8 bytes uint64 BE): AST fuel metering units consumed
  - `execution_timestamp` (8 bytes uint64 BE): Epoch timestamp in milliseconds
- **Tampering & Replay Mitigation**: The client computes the local SHA-256 hash of the received output and asserts strict equality with `journal.outputDigest`. Any modified bit in either the journal or curve proof causes immediate rejection.
- **Enclave Policy Invariant (`ZK_BLOCKING`)**: Tier 1 Sovereign Enclaves configure `zkMode: "required"`, rejecting queries if a valid Groth16 proof cannot be synthesized.

```typescript
import { LiopServer } from "@nekzus/liop/server";
import { LiopVerifier } from "@nekzus/liop";

// 1. Enclave configuration with ZK_BLOCKING policy
const server = new LiopServer({ name: "bank-enclave", version: "1.0.0" });
server.tool(
  "calculate_payroll_aggregate",
  "Aggregates payroll without egressing employee identities",
  { payload: z.string() },
  async () => ({ content: [{ type: "text", text: "ok" }] }),
  {
    zkMode: "required", // Enforces Groth16 proof generation (ZK_BLOCKING)
    circuitName: "sum",
  }
);

// 2. Client verification via LiopVerifier
const verifier = new LiopVerifier();
const isValid = await verifier.verifyZkReceipt(
  Buffer.from(logicPayload),
  remoteImageIdHex,
  rawReceiptBuffer,
  { zkPolicy: "required" }
);
```

---

## Logic-Injection-on-Origin Flow

The following shows a complete Logic-Injection-on-Origin execution cycle (handled internally by the SDK):

```
1. LLM generates JavaScript analysis code wrapped in @LIOP / @END boundaries
2. LiopServer receives the payload via tools/call (JSON-RPC or direct)
3. Guardian AST inspects for sandbox escapes (pre-execution heuristic analysis)
4. Code executes inside a V8 isolate with CPU fuel limits (no Node.js globals)
5. Taint Analyzer blocks PII side-channel derivation (charCodeAt, boolean inference)
6. PII Shield scans output for forbidden data and keys
7. ZK-Receipt generated (SHA-256 ImageID + HMAC-SHA256 seal)
8. Result + receipt returned to the LLM (raw data never exposed)
```

### Data Dictionary & Zero-Shot Autonomy

The Data Dictionary tells the LLM exactly what fields exist in `env.records`, enabling accurate code generation without seeing the actual data:

```typescript
server.dataDictionary({
  id: "string (Anonymized patient identifier, strictly PII)",
  age: "number (Patient age in years)",
  condition: "string (Healthy, Hypertension, Diabetes Type 1, Diabetes Type 2, Heart Disease, Asthma)",
  riskScore: "number (Float 0.0 to 1.0)",
  lastVisit: "string (ISO 8601 date)",
});

server.enableZeroShotAutonomy(); // Registers the "Blind Analyst" prompt
```

---

## Worker Pool (Multi-Core Scaling)

Node.js is single-threaded. Heavy operations like Kyber768 decryption, AES-GCM authentication, AST validation, and V8 sandbox instantiation would block the event loop in a standard setup.

This SDK dispatches all heavy computation to OS-level threads via [`piscina`](https://github.com/piscinajs/piscina), achieving Rust-like concurrency. On server or verifier initialization, background warmup tasks are automatically dispatched to pre-warm the pool workers, eliminating V8/WASI cold-start overhead (~820k fuel units) for subsequent calls:

```typescript
// Automatic, no configuration needed
// When a Logic-Injection-on-Origin payload is received:
// 1. Main thread receives JSON-RPC request
// 2. Worker thread: AST inspection + PQC decryption + Sandbox execution
// 3. Main thread: Returns result (non-blocking)

// Cleanup on shutdown:
await server.close();
```

---

## Post-Quantum Cryptography

Transport-layer security using ML-KEM-768 (Kyber) for key encapsulation and AES-256-GCM for symmetric encryption:

```typescript
import { LiopClient } from "@nekzus/liop/client";

const client = new LiopClient();
await client.connect();

// Discover remote tools via Kademlia DHT
const tools = await client.discoverTools();

// Call a tool with PQC-encrypted WASM payload
// Kyber768 key encapsulation + AES-256-GCM happens automatically
const result = await client.callTool(request, wasmPayload, serverPublicKey);

// Verify the ZK-Receipt from the remote server
const isValid = await client.verifyZkReceipt(payload, imageId, receipt);
```

---

## P2P Mesh Network

Decentralized tool discovery via Kademlia DHT:

```typescript
await server.connectToMesh();
// Server is now discoverable on the libp2p network
// Transports: TCP + WebSocket
// Multiplexing: Yamux
// Encryption: Noise Protocol
```

---

---

## Interactive Web Playground (`:16000` prod / `:14000` dev)

The SDK includes a real-time developer interface to test Logic-Injection-on-Origin, trace post-quantum handshakes, evaluate AST fuel consumption, and inspect cryptographic proofs:

```bash
# 1. Launch the full 10-node production audit mesh with traffic shaping (http://localhost:16000)
pnpm run audit:prod:start

# Run the 12-suite automated production audit against the mesh (64 tests)
pnpm run audit:prod:run

# Teardown and cleanup production containers
pnpm run audit:prod:clean

# 2. Alternatively, launch the lightweight 5-node demo (http://localhost:14000)
pnpm run demo:start
```

Navigate to **`http://localhost:16000`** in your browser:

* **Live 7-Phase Streaming:** Visualizes Bootstrap, DHT Discovery, ML-KEM-768 Handshake, AES-256-GCM Sealing, WASI Sandbox Execution, ZK-Receipt Verification, and Output Aggregation via real-time Server-Sent Events (SSE).
* **Tri-Tab Results Panel:** Switch between `Aggregated Output` (sanitized JSON), `Fuel & Telemetry` (WASI fuel metering, token economy comparison banner), and `Crypto Proofs` (ImageID, Dataset Hash, and HMAC-SHA256 signature with instant copy).
* **Token Economy Dashboard:** Live comparison showing **98.9% to 99.6% token reduction** and **99.6% network bandwidth savings** over traditional MCP context-pulling.
* **REST Telemetry Endpoint:** Query session analytics programmatically at `GET http://localhost:16000/api/telemetry`.
* **Built-in Scenario Presets:** Ready-to-run micro-modules for High-Frequency Trading (HFT Level 2 order books), Banking transaction analysis, Medical Vault HIPAA records, and Edge IoT industrial sensor telemetry.
* **Dual Dark Modes:** Toggle between Obsidian OLED (`#000000`) and Slate Navy (`#0f172a`) interfaces.

---

## Token Economy & Telemetry

The SDK ships with a zero-runtime-dependency **`o200k_base`** BPE token estimation and telemetry engine:

```typescript
import {
  createTokenEstimator,
  createSyncTokenEstimator,
  TokenTelemetryEngine,
  LiopOTelBridge
} from "@nekzus/liop";

// 1. Exact BPE Token Counting (Bundled inlined o200k_base vocab, zero network/disk lag)
const estimator = createSyncTokenEstimator();
const tokens = estimator.countTokens("Hello world! Logic-Injection-on-Origin"); // 12

// 2. Operation-Level Token Telemetry
const telemetry = TokenTelemetryEngine.getInstance();
telemetry.record({
  type: "tool_call",
  method: "tools/call",
  toolName: "Analyze_HFT_Market_Data",
  estimatedInputTokens: 120,
  estimatedOutputTokens: 42
});

// 3. OpenTelemetry gen_ai.* Bridge
// Automatically exports gen_ai.client.token.usage and gen_ai.client.operation.duration histograms
```

---

## Testing & Quality

This package is continuously tested across multiple platforms and Node.js versions via CI/CD:

- **490+ tests** spanning unit, integration, conformance, adversarial, and live Docker mesh suites
- **Multi-OS matrix:** Ubuntu, Windows, macOS
- **Node.js versions:** 20.x, 22.x
- **Code quality:** Enforced by [Biome.js](https://biomejs.dev/) (linting + formatting)
- **Security:** Verified 6-layer defense-in-depth architecture (see [Security Architecture](https://nekzus-32.mintlify.app/typescript-sdk/security))

> To run tests locally or contribute, clone the [repository](https://github.com/Nekzus/LIOP) and follow the [Contributing Guide](https://github.com/Nekzus/LIOP/blob/main/CONTRIBUTING.md).

## Security Auditing & Supply Chain

This repository is integrated with [Socket.dev](https://socket.dev) to continuously monitor and secure the software supply chain against malicious packages, hidden telemetry, and dependency vulnerabilities.

You can run security audits and check package health scores directly from the monorepo root:

- **Scan Monorepo Dependencies:** `pnpm socket:scan` (performs a security scan and generates a report)
- **Check SDK Security Score:** `pnpm socket:score` (shows the detailed package score for the SDK in Markdown format)
- **Fix Vulnerabilities:** `pnpm socket:fix` (automatically remediates known CVEs in package.json)

The codebase undergoes regular dependencies audits. As of June 2026, the SDK is verified to be 100% free of orphan packages and dead dependencies, ensuring a minimal deployment footprint.

---

## Related

- [LIOP Documentation](https://nekzus-32.mintlify.app/): Full conceptual and API documentation
- [LIOP Specification](https://github.com/Nekzus/LIOP/blob/main/protocol/SPECIFICATION.md): Technical specification
- [LIOP Manifesto](https://github.com/Nekzus/LIOP/blob/main/MANIFESTO.md): Project philosophy
- [Contributing Guide](https://github.com/Nekzus/LIOP/blob/main/CONTRIBUTING.md): How to contribute
- [Rust Mesh Node](https://github.com/Nekzus/LIOP/tree/main/servers/liop-node): Native high-performance backend
- [LIOP CLI](https://github.com/Nekzus/LIOP/tree/main/tools/liop-cli): Developer diagnostics

---

## License

Licensed under the [Apache License, Version 2.0](https://github.com/Nekzus/LIOP/blob/main/LICENSE) (the "License"). You may not use this file except in compliance with the License. See [NOTICE](https://github.com/Nekzus/LIOP/blob/main/NOTICE) and [TRADEMARKS.md](https://github.com/Nekzus/LIOP/blob/main/TRADEMARKS.md) for attribution and trademark details.

Copyright 2026 [Nekzus Solutions](https://github.com/Nekzus) and contributors.
