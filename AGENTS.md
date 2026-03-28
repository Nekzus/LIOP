# Neural Mesh Protocol (NMP) - AI Agent Context & Rules

This document provides essential instructions, technical context, and development standards for AI agents (Antigravity, Claude, Cursor) working on the NMP repository. 

> [!IMPORTANT]
> NMP is a "Logic-on-Origin" decentralized mesh protocol. AI agents must prioritize security, zero-trust patterns, and cryptographic integrity in all proposed changes.

---

## 🚀 Project Vision & Paradigm
Neural Mesh Protocol (NMP) is the high-performance successor to the Model Context Protocol (MCP).
- **Core Paradigm**: *Logic-on-Origin*. Instead of moving data to the logic (Context-Pulling), NMP moves logic (WASM micro-modules) to the data (Logic-Injection).
- **Security model**: Extreme Zero-Trust using WASI sandboxing, PQC (Post-Quantum Cryptography), and ZK-SNARKs for computational integrity.

---

## 🛠️ Technology Stack

### Backend (Rust Workspace)
- **Runtime**: [Wasmtime](https://wasmtime.dev/) (WASI v29.0+).
- **Network**: [Tonic gRPC](https://github.com/hyperium/tonic) (h2/QUIC transport).
- **P2P Layer**: [rust-libp2p](https://libp2p.io/) (Kademlia DHT, Noise Protocol).
- **Cripto**: `pqcrypto-kyber` (ML-KEM-768), `aes-gcm`.

### SDK & Tooling (Node.js/TypeScript)
- **Environment**: Node.js 20+ (LTS).
- **Package Manager**: [pnpm 10+](https://pnpm.io/) (Hardlinks enabled).
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
Agents must enforce these three layers of defense:
1. **Layer 1: Guardian AST**: Static inspection of injected logic to prevent sandbox escapes.
2. **Layer 2: WASI Sandbox**: Strict isolation of file system and network calls.
3. **Layer 3: Egress PII Shield**: Recursive scanning of all outgoing data to prevent personal data leaks (PIIs).

---

## ⚠️ Infrastructure Gotchas (Windows + pnpm)
- **NEVER use `git clean -fdx`**: It destroys the pnpm virtual store and corrupts `node_modules`.
- **Symlink Management**: Avoid absolute paths; use relative resolution within the workspace.
- **Wasmtime Fuel**: Always configure fuel limits to prevent infinite-loop DoS attacks.

---

## 🏛️ Repository Structure
- `/servers/mesh-node`: Main Rust Mesh Node (The Bastion/Vault).
- `/sdks/typescript`: Official Node.js SDK and MCP Gateway.
- `/protocol`: gRPC Protobuf definitions.
- `/docs`: Mintlify Documentation source (MDX).
- `/tools/nmp-cli`: Rust binary for mesh management.

---

*This file is read by Antigravity IDE at start-up to ensure architectural alignment.*
