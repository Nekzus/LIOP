<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../docs/logo/dark.svg">
    <img alt="Logic-Injection-on-Origin Protocol Logo" src="../../docs/logo/light.svg" width="600">
  </picture>

  <h1>Logic-Injection-on-Origin Protocol — Rust Mesh Node (liop-node)</h1>
  <p><strong>High-performance Data Node host, Wasmtime WASI v29 sandbox, and native peer-to-peer transport.</strong></p>

  <p align="center">
    <a href="https://github.com/Nekzus/LIOP/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
    <a href="https://nekzus-32.mintlify.app/mesh-node/overview"><img src="https://img.shields.io/badge/docs-mintlify-0D9373?style=flat" alt="Docs"></a>
    <a href="https://deepwiki.com/Nekzus/LIOP"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
  </p>
</div>

---

## 📚 Official Documentation

Detailed architecture specifications, compilation guides, and runtime benchmarks are hosted on Mintlify:

- [Rust Core Architecture Guide](https://nekzus-32.mintlify.app/mesh-node/overview)
- [WASI Compilation & Target Setup](https://nekzus-32.mintlify.app/mesh-node/compilation)
- [Protocol Specification (RFC Standards)](https://nekzus-32.mintlify.app/concepts/specification)

---

## Overview

The `liop-node` binary represents the physical execution host (Data Node) in the Logic-Injection-on-Origin Protocol. It receives incoming analytical micro-modules compiled to WebAssembly, inspects their imports using `wasmparser`, isolates them inside a strictly metered `wasmtime` runtime, and executes computations locally against sovereign datasets without raw data egress.

### Architectural Breakdown

| Module | Subsystem | Purpose |
|---|---|---|
| `executor.rs` | Wasmtime WASI v29 | Instantiates isolated memory stores, sets strict CPU instruction fuel (`store.set_fuel()`), and pre-opens authorized host directory descriptors via `WasiCtxBuilder`. |
| `guardian.rs` | Guardian AST | Scans WASM import sections prior to JIT compilation. Enforces a 14-function allowlist from `wasi_snapshot_preview1` and halts unauthorized host system calls. |
| `grpc.rs` | Tonic Transport | Asynchronous gRPC service over HTTP/2 streaming Protobuf payloads (`liop_core.proto`). Supports mTLS channel security and PQC session handshakes. |
| `p2p.rs` | rust-libp2p | Kademlia Distributed Hash Table (`/ipfs/kad/1.0.0`) for decentralized peer routing over Noise protocol (Ed25519) and TCP/QUIC transports. |
| `zk.rs` | Receipt Engine | Computes deterministic HMAC-SHA256 computational commitments binding output payloads to logic digests and ephemeral post-quantum session secrets. |
| `tee.rs` | Hardware Bounds | Trait abstraction for deploying inside hardware enclaves (AWS Nitro Enclaves, Intel SGX). |

---

## Security & Sandboxing Invariants

1. **Deterministic CPU Fuel Metering**: Every WebAssembly instruction consumes virtual fuel units. Loops exceeding allocated quotas trigger an immediate `Trap::OutOfFuel` before host thread degradation occurs.
2. **Linear Memory Isolation**: Modules operate within strict 64 KB page boundaries. Out-of-bounds pointer dereferences trigger memory segmentation traps isolated to the guest execution context.
3. **Capability Pre-Opens**: Sandboxed guest code has zero access to host paths except explicitly configured subdirectories mounted via `WasiCtxBuilder::preopened_dir()`.
4. **Post-Quantum Session Sealing**: Inter-node handshakes negotiate ephemeral ML-KEM-768 session keys to protect wire data against harvest-now-decrypt-later attacks.

---

## Compilation & Verification

Compiling `liop-node` requires Rust 2021+ and the `wasm32-wasip1` compilation target:

```bash
# 1. Install the canonical WASI Preview 1 target
rustup target add wasm32-wasip1

# 2. Build the entire Cargo workspace with release optimizations
cargo build --workspace --release

# 3. Execute all unit, integration, and sandbox conformance tests
cargo test --workspace
```

---

## License

Licensed under the [Apache License, Version 2.0](../../LICENSE). Copyright 2026 [Nekzus Solutions](https://github.com/Nekzus) and contributors.
