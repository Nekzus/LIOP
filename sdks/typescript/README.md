<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/dsvsl0b0b/image/upload/v1774702621/Neural-Mesh-Protocol/qaqsa28yrtpnxnbclv3p.svg?v=20260328">
    <img alt="Logic-Injection-on-Origin Protocol Logo" src="https://res.cloudinary.com/dsvsl0b0b/image/upload/v1774702621/Neural-Mesh-Protocol/hoanw0m6tybpz5fbl12n.svg?v=20260328" width="700">
  </picture>

<h1>Logic-Injection-on-Origin Protocol (LIOP) — TypeScript SDK</h1>
<p align="center">
  <a href="https://github.com/Nekzus/LIOP/actions/workflows/ci.yml"><img src="https://github.com/Nekzus/LIOP/actions/workflows/ci.yml/badge.svg?event=push" alt="Github Workflow"></a>
  <a href="https://www.npmjs.com/package/@nekzus/liop"><img src="https://img.shields.io/npm/v/@nekzus/liop.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@nekzus/liop"><img src="https://img.shields.io/npm/dm/@nekzus/liop.svg" alt="npm-month"></a>
  <a href="https://www.npmjs.com/package/@nekzus/liop"><img src="https://img.shields.io/npm/dt/@nekzus/liop.svg?style=flat" alt="npm-total"></a>
  <a href="https://github.com/Nekzus/LIOP/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Nekzus/LIOP.svg" alt="License"></a>
  <a href="https://nekzus-32.mintlify.app/"><img src="https://img.shields.io/badge/docs-mintlify-0D9373?style=flat" alt="Docs"></a>
  <a href="https://deepwiki.com/Nekzus/LIOP"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
  <a href="https://paypal.me/maseortega"><img src="https://img.shields.io/badge/donate-paypal-blue.svg?style=flat-square" alt="Donate"></a>
</p>

<p><strong>The official TypeScript SDK for the Logic-Injection-on-Origin Protocol.</strong></p>
  <p>Deploy Logic-on-Origin with WebAssembly sandboxing, gRPC-speed execution, and full MCP backward compatibility.</p>
</div>

---

## Overview

`@nekzus/liop` is an SDK that implements the **Logic-Injection-on-Origin (LIO)** paradigm: instead of extracting raw data from a server and sending it to an LLM, the LLM injects a micro-module of logic to be executed *at the data source*, inside a secure sandbox. The result — never the raw data — is returned.

This fundamentally solves the data privacy, bandwidth, and latency challenges of AI-powered data analysis at scale.

### Key Capabilities

| Feature                             | Description                                                                                                                                |
| :---------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **Logic-Injection-on-Origin** | LLMs send code, not queries. Data never leaves the origin server.                                                                          |
| **MCP Drop-in Replacement**   | `LiopServer` mirrors the Anthropic MCP `Server` API — tools, resources, and prompts with `Zod` schemas.                             |
| **Guardian AST**              | Zero-time heuristic inspection blocks sandbox escapes (`require`, `fs`, `eval`, `fetch`, prototype pollution).                     |
| **WASI Sandbox**              | JavaScript payloads execute inside V8 isolates with CPU fuel limits and no access to Node.js globals.                                      |
| **PII Shield**                | Multi-layer egress filter with Regional Presets (Email, Credit Card with Luhn, IP, Phone, SSN, IBAN Mod-97, Passport MRZ) and custom keys. |
| **ZK-Receipts**               | Cryptographic proof (SHA-256 ImageID + HMAC-SHA256 seal) that the returned result was computed honestly from the injected logic.            |
| **Worker Pool**               | Heavy computation (crypto, sandboxing) dispatched to OS threads via `piscina`, unblocking the V8 event loop.                             |
| **Cross-AI Adapters**         | Zero-Shot system prompts automatically adapt instructions for Claude (XML-heavy) vs OpenAI/Gemini (JSON-schema).                           |
| **MCP Bridge**                | `LiopMcpBridge` adapts any `LiopServer` to the JSON-RPC 2.0 / stdio protocol used by Claude Desktop, Cursor, etc.                      |
| **Post-Quantum Ready**        | ML-KEM-768 (Kyber) handshake + AES-256-GCM symmetric encryption for transport-layer security.                                              |
| **P2P Mesh**                  | Kademlia DHT discovery via `libp2p` with TCP + WebSocket + Yamux multiplexing and Noise encryption.                                      |

---

## Installation

```bash
npm install @nekzus/liop
```

> **Requirements:** Node.js ≥ 20.0. The SDK uses `node:crypto`, `node:vm`, and `piscina` (worker threads) internally.

---

## LIOP Agent (CLI)

The SDK includes a zero-config agent (`liop-agent`) designed to bridge the Logic-Injection-on-Origin Protocol with local AI clients like **Claude Desktop**.

### Installation & Run

You can run the agent directly using `npx` (recommended) or install it globally:

```bash
# Run instantly
npx @nekzus/liop

# Or install globally
npm install -g @nekzus/liop
liop-agent
```

### 🤖 Claude Desktop Configuration

To integrate LIOP into Claude Desktop, update your `claude_desktop_config.json` (typically found in `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "liop-agent": {
      "command": "npx",
      "args": ["-y", "@nekzus/liop", "liop-agent"],
      "env": {
        "LIOP_NEXUS_URL": "http://your-nexus-host:3000",
        "LIOP_LOG_LEVEL": "info"
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
  npx @nekzus/liop /ip4/1.2.3.4/tcp/4001/p2p/PEER_ID
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
    // This logic runs at origin — data never leaves the server
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
      maxThreads?: number;         // Max worker threads (default: CPU count)
      maxHeapMb?: number;          // V8 heap limit per worker (default: 64, env: LIOP_WORKER_MAX_HEAP_MB)
    };
    security?: {
      piiPatterns?: PiiRule[];     // Regex/validator rules for PII detection
      forbiddenKeys?: string[];    // Keys stripped from outgoing responses
      enableNerScanning?: boolean; // NLP entity detection via compromise (default: false)
      rateLimit?: {                // Sliding window rate limiter per tool
        maxPerWindow?: number;     // Max calls per window (default: 15)
        windowMs?: number;         // Window duration in ms (default: 60000)
      };
      globalRateLimit?: {           // Cross-tool aggregate rate limiter
        maxPerWindow?: number;     // Max total calls per window (default: 40)
        windowMs?: number;         // Window duration in ms (default: 60000)
      };
    };
    taxonomy?: {                   // Data domain classification
      domain?: string;             // e.g., "finance", "healthcare"
      clearanceTier?: string;      // e.g., "tier-0", "tier-1"
      executionTypes?: string[];   // e.g., ["aggregation", "analytics"]
    };
  }
)
```

#### Methods

| Method                       | Signature                                          | Description                                                                         |
| :--------------------------- | :------------------------------------------------- | :---------------------------------------------------------------------------------- |
| `tool()`                   | `(name, description, zodSchema, handler)`        | Registers a callable tool with Zod input validation.                                |
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

### `LiopMcpBridge`

Adapter that connects any `LiopServer` to MCP-compatible clients via JSON-RPC 2.0 over stdio.

```typescript
const bridge = new LiopMcpBridge(server);
await bridge.connect();
```

**Supported JSON-RPC methods:**

- `initialize` — Returns server capabilities and info
- `tools/list` — Lists available tools
- `tools/call` — Calls a tool (with ZK-Receipt verification)
- `resources/list` — Lists available resources
- `resources/read` — Reads a resource
- `prompts/list` — Lists available prompts
- `prompts/get` — Gets a specific prompt

---

## Security Architecture

### The Shield — Multi-Layer Defense

```
┌───────────────────────────────────────────────────────────┐
│  Layer 1: Guardian AST (Zero-Time Static Analysis)        │
│  14-function WASI allowlist • 128 import cap • Blocks     │
│  require, import(), fs, eval, fetch, __proto__            │
├───────────────────────────────────────────────────────────┤
│  Layer 2: WASI Sandbox (V8 Isolate)                       │
│  25 poisoned globals (incl. Date, TypedArrays) •          │
│  CPU Fuel limits • 5s timeout • maxHeapMb (64MB default)  │
│  Object.freeze() on 6 core prototypes                     │
├───────────────────────────────────────────────────────────┤
│  Layer 3: Taint Analyzer (IFC — Static)                   │
│  Acorn AST 3-pass analysis blocks PII side-channels:      │
│  charCodeAt, boolean inference, arithmetic derivation     │
├───────────────────────────────────────────────────────────┤
│  Layer 4: PII Shield (Egress Filter)                      │
│  4-stage pipeline: exact key → fuzzy key → pattern        │
│  validators (Luhn, IBAN Mod-97) → NER (compromise)        │
├───────────────────────────────────────────────────────────┤
│  Layer 5: Aggregation-First Policy                        │
│  Blocks raw row export • maxOutputRows (default: 10) •    │
│  Conditional error: detailed (dev) vs opaque (production) │
├───────────────────────────────────────────────────────────┤
│  Layer 6: ZK-Receipt (Integrity Verification)             │
│  SHA-256 ImageID + HMAC-SHA256 Seal (Kyber768-derived)    │
│  Timing-safe verification • LiopMcpBridge auto-verifies   │
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

---

## Logic-Injection-on-Origin Flow

The following shows a complete Logic-Injection-on-Origin execution cycle (handled internally by the SDK):

```
1. LLM generates JavaScript analysis code wrapped in @LIOP / @END boundaries
2. LiopServer receives the payload via tools/call (JSON-RPC or direct)
3. Guardian AST inspects for sandbox escapes (zero-time heuristic analysis)
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

This SDK dispatches all heavy computation to OS-level threads via [`piscina`](https://github.com/piscinajs/piscina), achieving Rust-like concurrency:

```typescript
// Automatic — no configuration needed
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

## Testing & Quality

This package is continuously tested across multiple platforms and Node.js versions via CI/CD:

- **259+ tests** spanning unit, integration, conformance, adversarial, and crossnet suites
- **Multi-OS matrix:** Ubuntu, Windows, macOS
- **Node.js versions:** 20.x, 22.x
- **Code quality:** Enforced by [Biome.js](https://biomejs.dev/) (linting + formatting)
- **Security:** Verified 6-layer defense-in-depth architecture — see [Security Architecture](https://nekzus-32.mintlify.app/typescript-sdk/security)

> To run tests locally or contribute, clone the [repository](https://github.com/Nekzus/LIOP) and follow the [Contributing Guide](https://github.com/Nekzus/LIOP/blob/main/CONTRIBUTING.md).

---

## Related

- [LIOP Documentation](https://nekzus-32.mintlify.app/) — Full conceptual and API documentation
- [LIOP Specification](https://github.com/Nekzus/LIOP/blob/main/protocol/SPECIFICATION.md) — Technical specification
- [LIOP Manifesto](https://github.com/Nekzus/LIOP/blob/main/MANIFESTO.md) — Project philosophy
- [Contributing Guide](https://github.com/Nekzus/LIOP/blob/main/CONTRIBUTING.md) — How to contribute
- [Rust Mesh Node](https://github.com/Nekzus/LIOP/tree/main/servers/liop-node) — Native high-performance backend
- [LIOP CLI](https://github.com/Nekzus/LIOP/tree/main/tools/liop-cli) — Developer diagnostics

---

## License

[MIT](https://github.com/Nekzus/LIOP/blob/main/LICENSE) © [Nekzus](https://github.com/Nekzus)
