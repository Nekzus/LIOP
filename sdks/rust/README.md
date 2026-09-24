<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../docs/logo/dark.svg">
    <img alt="Logic-Injection-on-Origin Protocol Logo" src="../../docs/logo/light.svg" width="600">
  </picture>

  <h1>Logic-Injection-on-Origin Protocol: Rust SDK</h1>
  <p><strong>Native Rust crates for the Logic-Injection-on-Origin Protocol.</strong></p>
  <p>Zero-cost abstractions, asynchronous gRPC transport, post-quantum key encapsulation, and decentralized P2P routing.</p>

  <p align="center">
    <a href="https://github.com/Nekzus/LIOP/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
    <a href="https://nekzus-32.mintlify.app/mesh-node/overview"><img src="https://img.shields.io/badge/docs-mintlify-0D9373?style=flat" alt="Docs"></a>
    <a href="https://deepwiki.com/Nekzus/LIOP"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
  </p>
</div>

---

## Official Documentation

Comprehensive architectural deep dives, compilation instructions, and protocol references are available on Mintlify:

| Documentation Section | Focus Area | Canonical Guide |
|---|---|---|
| **Rust Mesh Node** | Wasmtime WASI v29 sandbox, fuel metering, and runtime architecture | [Rust Core Overview](https://nekzus-32.mintlify.app/mesh-node/overview) |
| **WASI Compilation** | Compiling guest analytical modules to `wasm32-wasip1` | [Compilation Guide](https://nekzus-32.mintlify.app/mesh-node/compilation) |
| **Protocol Specification** | Formal RFC standards, wire framing, and cryptographic receipts | [Protocol Specification](https://nekzus-32.mintlify.app/concepts/specification) |

---

## Overview

The Rust SDK provides low-level, high-performance crates to interact with the Logic-Injection-on-Origin Protocol natively. It allows agent runtimes and data backends to negotiate post-quantum zero-trust sessions, compile and inject WebAssembly analytical micro-modules, and stream cryptographically verified results without data egress.

### Workspace Architecture

The SDK is organized as a Cargo Workspace containing two focused crates:

```
sdks/rust/
├── crates/
│   ├── core/            # liop-core: Compiled Protobuf definitions & gRPC stubs
│   └── client/          # liop-client: Native agent SDK with PQC, AES-GCM & libp2p
├── Cargo.toml
└── README.md
```

---

## Crates

### `liop-core`

The protocol definitions crate for the LIOP mesh. It compiles Protocol Buffer definitions via [`tonic`](https://github.com/hyperium/tonic) and [`prost`](https://github.com/tokio-rs/prost), exporting typed client and server stubs.

**Key Exports:**
- `liop_core::v1::LogicMeshClient`: gRPC client stub for connecting to Data Nodes.
- `liop_core::v1::LogicMeshServer`: gRPC server trait for implementing Data Nodes.
- `liop_core::v1::IntentRequest` / `IntentResponse`: Zero-Trust handshake negotiation.
- `liop_core::v1::LogicRequest` / `LogicResponse`: WASM payload injection and streaming results.

**Dependencies:**
| Crate | Version | Purpose |
|---|---|---|
| `tonic` | 0.11 | High-performance asynchronous gRPC transport over HTTP/2 |
| `prost` | 0.12 | Protocol Buffers runtime and code generation |
| `tokio` | 1.37 | Multi-threaded asynchronous runtime |
| `tokio-stream` | 0.1 | Asynchronous stream adapters for gRPC responses |

---

### `liop-client`

The client runtime crate for injecting analytical logic into remote Data Nodes. It encapsulates the full lifecycle of an in-situ logic execution:

1. **Intent Negotiation**: Zero-Trust handshake via `negotiate_intent()` with SPIFFE-compatible DIDs.
2. **PQC Key Encapsulation**: Post-quantum shared secret derivation using ML-KEM-768 (`pqcrypto-kyber`).
3. **Symmetric Payload Sealing**: Authenticated encryption of the compiled WASM binary using AES-256-GCM.
4. **Logic Injection**: Streaming deployment of the encrypted WASM module via `execute_logic()` gRPC transport.
5. **ZK-Receipt Verification**: Validating the HMAC-SHA256 computational proof against the session secret and payload digest.

**Example Usage:**

```rust
use liop_client::injector::inject_logic;
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Inject a precompiled WASI micro-module into a remote LIOP Data Node (port 15011 / 15021)
    let endpoint = "127.0.0.1:15021";
    let wasm_path = "./target/wasm32-wasip1/release/order_book_filter.wasm";

    let response = inject_logic(endpoint, wasm_path).await?;
    println!("Aggregated response: {:?}", response);

    Ok(())
}
```

**Dependencies:**
| Crate | Version | Purpose |
|---|---|---|
| `liop-core` | path | Internal Protobuf types and gRPC stubs |
| `tonic` | 0.11 | Asynchronous gRPC client |
| `tokio` | 1.37 | Async runtime for non-blocking I/O |
| `libp2p` | 0.54 | P2P mesh networking (TCP, QUIC, Noise, Yamux, Kademlia DHT) |
| `pqcrypto-kyber` | 0.8 | NIST FIPS 203 ML-KEM-768 Post-Quantum Key Encapsulation |
| `aes-gcm` | 0.10 | AES-256-GCM authenticated payload encryption |
| `rand` | 0.10 | Cryptographically secure pseudo-random number generator (CSPRNG) |

---

## Security Architecture (Zero-Trust)

The Rust SDK enforces strict zero-trust invariants across all layers:

| Layer | Mechanism | Implementation |
|---|---|---|
| **Transport** | Post-Quantum Handshake | ML-KEM-768 Key Encapsulation via `pqcrypto-kyber` |
| **Payload** | Symmetric Encryption | AES-256-GCM with 96-bit unique nonces |
| **Identity** | Decentralized DIDs | SPIFFE-compatible `agent_did` strings |
| **Discovery** | Cryptographic Routing | Kademlia DHT (`/ipfs/kad/1.0.0`) over Ed25519 PeerIDs |
| **Verification** | Computational Integrity | ZK-Receipt validation binding output digest to logic hash |

---

## Compilation & Verification

Compiling the Rust SDK crates requires Rust 1.75+ and `protoc` (handled automatically via `protoc-bin-vendored`):

```bash
# 1. Build both crates in release mode
cargo build -p liop-core -p liop-client --release

# 2. Run all unit and integration test suites
cargo test -p liop-core -p liop-client
```

---

## Related Projects

- [Mintlify Documentation](https://nekzus-32.mintlify.app/): Complete protocol documentation
- [TypeScript SDK (`@nekzus/liop`)](../../sdks/typescript/README.md): Node.js SDK and MCP Gateway
- [Rust Mesh Node (`liop-node`)](../../servers/liop-node/README.md): Physical WASI host daemon
- [Protocol Specification](../../protocol/SPECIFICATION.md): Technical RFC specification

---

## License

Licensed under the [Apache License, Version 2.0](../../LICENSE). Copyright 2026 [Nekzus Solutions](https://github.com/Nekzus) and contributors.
