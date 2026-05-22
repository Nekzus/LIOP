# Logic-Injection-on-Origin Protocol (LIOP) - AI Agent Context & Rules

This document provides essential instructions, technical context, and development standards for AI agents (Antigravity, Claude, Cursor) working on the LIOP repository. 

> [!IMPORTANT]
> LIOP is a "Logic-Injection-on-Origin" decentralized mesh protocol. AI agents must prioritize security, zero-trust patterns, and cryptographic integrity in all proposed changes.

---

## 🚀 Project Vision & Paradigm
Logic-Injection-on-Origin Protocol (LIOP) is the high-performance successor to the Model Context Protocol (MCP).
- **Core Paradigm**: *Logic-Injection-on-Origin (LIO)*. Instead of moving data to the logic (Context-Pulling), LIOP moves logic (WASM micro-modules) to the data (Logic-Injection).
- **Security model**: Extreme Zero-Trust using WASI sandboxing, PQC (Post-Quantum Cryptography), and ZK-Receipts (HMAC-SHA256) for computational integrity.

---

## 🛠️ Technology Stack

### Backend (Rust Workspace)
- **Runtime**: [Wasmtime](https://wasmtime.dev/) (WASI v29.0+).
- **Network**: [Tonic gRPC](https://github.com/hyperium/tonic) (h2/QUIC transport).
- **P2P Layer**: [rust-libp2p](https://libp2p.io/) (Kademlia DHT, Noise Protocol).
- **Cripto**: `pqcrypto-kyber` (ML-KEM-768), `aes-gcm`.

### SDK & Tooling (Node.js/TypeScript)
- **Environment**: Node.js 20+ (LTS).
- **Package Manager**: [pnpm 11+](https://pnpm.io/) (Hardlinks enabled).
- **Linting & Formatting**: [BiomeJS](https://biomejs.dev/) (Strict compliance).
- **Concurrency**: [Piscina](https://github.com/piscinajs/piscina) (Worker Pools for crypto-heavy tasks).
- **Testing**: [Vitest](https://vitest.dev/) (Unit & E2E).

---

## 📜 Development Standards

### Language Protocols
- **Code Language**: Strictly **ENGLISH** (Variable names, functions, comments, docs).
- **Discussion/Planning**: Strictly **SPANISH** (Chat, implementation plans, bitácora).

### Code Quality & Patterns
1. **Clean Code & SOLID**: Follow SRP (Single Responsibility Principle) strictly.
2. **BiomeJS Compliance**: All TS code must pass `pnpm run check`. Never use `any` unless absolutely necessary (annotate with `// biome-ignore`).
3. **Rust IDIOMS**: Prefer zero-cost abstractions. Use `tracing` for logs instead of `println!`.
4. **Error Handling**: Use `Result/Option` in Rust and exhaustive catch (with `unknown`) in TS.

---

## 🛡️ Security Guardrails (The Shield)
Agents must enforce these six layers of defense:
1. **Layer 1: Guardian AST**: Static inspection of injected WASM imports against a strict 14-function allowlist.
2. **Layer 2: WASI Sandbox**: V8 Isolate with 25 poisoned globals, prototype freeze, and CPU fuel limits.
3. **Layer 3: Taint Analyzer (IFC)**: Acorn-based static taint tracking to block PII side-channel derivation (`charCodeAt`, boolean inference).
4. **Layer 4: Egress PII Shield**: Four-stage pipeline (key match, fuzzy, pattern validators, NER) scanning all outgoing data.
5. **Layer 5: Aggregation-First Policy**: Blocks raw row-level data export — only aggregated results pass through.
6. **Layer 6: ZK-Receipt (HMAC-SHA256)**: Cryptographic proof binding output to exact logic executed, sealed with PQC session secret.

---

## ⚠️ Infrastructure Gotchas (Windows + pnpm)
- **NEVER use `git clean -fdx`**: It destroys the pnpm virtual store and corrupts `node_modules`.
- **Symlink Management**: Avoid absolute paths; use relative resolution within the workspace.
- **Wasmtime Fuel**: Always configure fuel limits to prevent infinite-loop DoS attacks.

---

## 🏛️ Repository Structure
- `/servers/liop-node`: Main Rust Mesh Node (The Bastion/Vault).
- `/sdks/typescript`: Official Node.js SDK and MCP Gateway.
- `/protocol`: gRPC Protobuf definitions.
- `/docs`: Mintlify Documentation source (MDX).
- `/tools/liop-cli`: Rust binary for mesh management.

---

## 🔒 Secure CI/CD & Publishing (OIDC)
- **Tokenless Infrastructure**: Static npm tokens (`NPM_TOKEN`) are strictly prohibited in the CI pipeline. The repository uses **OIDC / Trusted Publishers** on npmjs.com.
- **Decoupled pnpm Workspace Publishing**: Do not enable `"npmPublish": true` in semantic-release configuration. Standard npm publishing breaks under pnpm workspaces. Publishing is decoupled: semantic-release tags the code, and a native `pnpm publish --provenance --no-git-checks` command executes the publish step.
- **Provenance Verification**: `--provenance` is mandatory in CI to guarantee build origin.

---

*This file is read by Antigravity IDE at start-up to ensure architectural alignment.*

