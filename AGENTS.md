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
5. **Dual-Era MCP Compliance (2026-07-28 & 2025-11-25)**:
   - Implement `subscriptions/listen` and `resources/templates/list` to satisfy modern MCP v2 clients without polling overhead.
   - Use strict legacy stripping (`adaptResponseForLegacyClient`) for 2025-era handshakes.
6. **Cross-Platform String & AST Parsing**:
   - Always use `[\r\n]+` and `\s*` in regexes parsing syntax envelopes (`@LIOP{...}...@END`) to remain 100% resilient across Windows CRLF and POSIX LF.
7. **Docker/Host Hybrid Mesh Routing**:
   - Auto-detect local Docker demo endpoints (`127.0.0.1:13000`) and map gRPC targets to published host ports (`13011`/`13021`/`13031`) instead of unreachable container-internal IPs (`172.20.0.x`).
8. **MCP Client Configuration & Single-Gateway Invariant**:
   - On Windows systems with MSIX/Store installs, Claude Desktop config resides at:
     `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`.
   - Never configure duplicate or overlapping LIOP mesh servers in `claude_desktop_config.json`. Always route through a single unified gateway instance to prevent client-side tool index corruption.
9. **Symmetric Network Channel Configuration**:
   - Always mirror `GRPC_CHANNEL_OPTIONS` (keepalive 30s, timeout 10s, permit_without_calls) between `LiopRpcServer` and `LiopRpcClient` to ensure connections survive corporate stateful firewalls and aggressive NAT timeouts.
10. **Multiaddr-Driven Network Remapping (Resilience against Env Sanitization)**:
   - MCP clients and subagent runners often strip or fail to propagate environment variables (`LIOP_DOCKER_MAP`).
   - Mesh dispatchers and routers must inspect peer multiaddrs directly (`isDockerPort` checking ports 13001-13005 / 13011-13031) and automatically map gRPC targets to published host ports (`13011`/`13021`/`13031`).
11. **Elastic Parameter Resolution in MCP Gateway**:
   - Support both structured (`params.arguments`) and flat (`params.payload`) RPC invocations in `performTranscoding()`:
     `const embeddedArgs = params?.arguments ?? (params?.payload !== undefined ? params : {});`
   - Prevents argument loss across disparate MCP client implementations.
12. **Resilient Assertions for Dynamic P2P Topologies**:
   - In live P2P integration tests (libp2p DHT), connection and provider counts fluctuate organically.
   - Tests evaluating mesh telemetry (`LiopMeshStatus`) must assert on patterns (`/\d+ Conns/`), invariant tools, and cryptographic proofs rather than fixed socket counters.
13. **Global Distributed Deployment Roadmap Alignment**:
   - All future protocol developments must align strictly with the 5-phase evolution blueprint (Beta-1 Conectividad [DONE], Beta-2 Seguridad Avanzada, Beta-3 Observabilidad & SOC 2, RC Atestación TEE, GA Red Global Masiva). Refer to `learning_proposal.md` and repository roadmap docs for exact component specifications and dependency requirements.
14. **Realtime Metric Scrape Refresh Invariant**:
   - Prometheus gauges reporting dynamic runtime state (e.g., `liop_mesh_peers_connected`, `liop_manifest_cache_size`) must be sampled and updated on-the-fly synchronously inside the `GET /metrics` request handler, ensuring scrape collectors always receive accurate instantaneous telemetry.
15. **AST Envelope Parsing with Top-Level Return**:
   - Injected micro-modules frequently execute logic with top-level `return` expressions. All Acorn AST parsers evaluating logic envelopes must explicitly configure `{ allowReturnOutsideFunction: true }` to prevent syntax parsing failures.
16. **Mandatory GPG Commit Signing (Strict No-Bypass Invariant)**:
   - All git commits must be cryptographically signed with GPG. Agents are strictly prohibited from using `--no-gpg-sign`.
   - When running `git commit`, provide adequate wait time for the user to unlock the GPG key via the pinentry modal. If GPG agent cache expires (`Vida máxima?`), alert the user to re-authenticate instead of evading signature verification.

---

## 🛡️ Security Guardrails (The Shield)
Agents must enforce these six layers of defense:
1. **Layer 1: Guardian AST**: Static inspection of injected WASM imports against a strict 14-function allowlist.
2. **Layer 2: WASI Sandbox**: V8 Isolate with 25 poisoned globals, strict mode, 11-prototype pre-execution freezing (to satisfy PCI-DSS limits), and CPU fuel limits.
3. **Layer 3: Taint Analyzer (IFC)**: Acorn-based static taint tracking to block PII side-channel derivation (`charCodeAt`, boolean inference).
4. **Layer 4: Egress PII Shield**: Four-stage pipeline (key match, fuzzy, pattern validators, NER) scanning all outgoing data.
5. **Layer 5: Aggregation-First Policy**: Blocks raw row-level data export — only aggregated results pass through.
6. **Layer 6: ZK-Receipt (HMAC-SHA256)**: Cryptographic proof binding output to exact logic executed, sealed with PQC session secret.

---

## ⚠️ Infrastructure Gotchas (Windows + pnpm)
- **NEVER use `git clean -fdx`**: It destroys the pnpm virtual store and corrupts `node_modules`.
- **Symlink Management**: Avoid absolute paths; use relative resolution within the workspace.
- **Wasmtime Fuel**: Always configure fuel limits to prevent infinite-loop DoS attacks.
- **Docker BuildKit Cache Lock Recovery**:
  - When using Docker BuildKit cache mounts (`--mount=type=cache,target=/pnpm/store`), cancelling builds or interrupting Docker in Windows/WSL2 can wedge BuildKit cache locks.
  - Never attempt single-service hot builds if a previous build was killed. Instead: kill stuck background tasks, run `docker builder prune -f`, execute `docker compose down -v --remove-orphans`, and rebuild cleanly with `docker compose up -d --build`.

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

