# LIOP Repository — Copilot Instructions

This repository contains the Logic-Injection-on-Origin Protocol (LIOP) monorepo.

## Key Development Invariants
- **Package Manager**: Strictly `pnpm 11+` (never use `npm`, `yarn`, or `git clean -fdx`).
- **Code Formatting & Linting**: Strictly BiomeJS (`pnpm run check`).
- **TypeScript**: Strict mode. Never use `any` unless annotated with `// biome-ignore lint/suspicious/noExplicitAny: <reason>`.
- **Language Policy**:
  - Source code, comments, docstrings, variable names, and documentation must be written strictly in **ENGLISH**.
  - Internal planning, chat discussions, and developer logbooks (GEMINI.md, TASK.md) are in **SPANISH**.
- **Test Runner**: Vitest 4.x (`pnpm test`). Single worker in CI (`maxWorkers: 1`).
- **Build Tool**: `tsup` (`pnpm build`).

## Monorepo Architecture
- `sdks/typescript/` (`@nekzus/liop`): Primary developer-facing SDK and drop-in MCP gateway.
- `servers/liop-node/`: High-performance Rust node host (Wasmtime 29.0 + gRPC + libp2p Kademlia DHT).
- `protocol/`: Protobuf service contracts (`liop_core.proto`) and formal specification.
- `docs/`: Mintlify documentation portal (MDX bilingüe EN/ES).

## Security Guardrails
- **WASI Sandboxing**: Always enforce fuel limits and capability isolation.
- **Post-Quantum Cryptography**: ML-KEM-768 key encapsulation + ML-DSA-65 signatures with 1-hour session TTL.
- **Guardian AST**: Static inspection of injected logic before execution.
- **Egress PII Shield**: Scan and sanitize all output responses against sensitive data patterns and Differential Privacy constraints (NIST SP 800-226).
