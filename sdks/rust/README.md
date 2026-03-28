<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/dsvsl0b0b/image/upload/v1774702621/Neural-Mesh-Protocol/qaqsa28yrtpnxnbclv3p.svg?v=20260328">
    <img alt="Logic-Injection-on-Origin Protocol Logo" src="https://res.cloudinary.com/dsvsl0b0b/image/upload/v1774702621/Neural-Mesh-Protocol/hoanw0m6tybpz5fbl12n.svg?v=20260328" width="700">
  </picture>

  <h1>Logic-Injection-on-Origin Protocol — Rust SDK</h1>
<p align="center">
  <a href="https://github.com/Nekzus/Neural-Mesh-Protocol/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Nekzus/LIOP.svg" alt="License"></a>
  <a href="https://liop.mintlify.app/"><img src="https://img.shields.io/badge/docs-mintlify-0D9373?style=flat" alt="Docs"></a>
  <a href="https://deepwiki.com/Nekzus/LIOP"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>

  <p><strong>Native Rust crates for the Logic-Injection-on-Origin Protocol.</strong></p>
  <p>Zero-overhead, highly concurrent, and cryptographically secure bindings to the LIOP ecosystem.</p>
</div>

## Overview

The Rust SDK provides the foundational building blocks for interacting with the Logic-Injection-on-Origin Protocol natively. It is designed for developers who need maximum performance and direct access to the low-level transport, cryptography, and P2P layers.

## Workspace Architecture

This SDK is organized as a Cargo Workspace with two crates:

```
sdks/rust/
├── crates/
│   ├── core/            # liop-core: Shared Protobuf definitions
│   └── client/          # liop-client: Agent SDK with PQC & P2P
├── LICENSE
└── README.md
```

### `liop-core`

The shared dictionary of the LIOP mesh. Contains all Protocol Buffer v3 service and message definitions compiled with [`tonic`](https://github.com/hyperium/tonic) and [`prost`](https://github.com/tokio-rs/prost).

**Key exports:**
- `liop_core::v1::LogicMeshClient` — gRPC client stub for connecting to Data Nodes.
- `liop_core::v1::LogicMeshServer` — gRPC server trait for implementing Data Nodes.
- `liop_core::v1::IntentRequest` / `IntentResponse` — Zero-Trust handshake negotiation.
- `liop_core::v1::LogicRequest` / `LogicResponse` — WASM payload injection and streaming results.

**Dependencies:**
| Crate | Purpose |
|---|---|
| `tonic` 0.11 | gRPC framework |
| `prost` 0.12 | Protobuf code generation |
| `tokio` 1.37 | Async runtime (full features) |
| `tokio-stream` 0.1 | Async streaming for gRPC responses |

### `liop-client`

The high-level Agent SDK for injecting Logic-Injection-on-Origin payloads into remote Data Nodes. This crate abstracts the full injection lifecycle:

1. **Intent Negotiation** — Zero-Trust handshake via `negotiate_intent()` with SPIFFE-compatible DIDs.
2. **PQC Key Encapsulation** — Post-Quantum secure shared secret derivation using ML-KEM-768 (Kyber).
3. **AES-256-GCM Encryption** — Symmetric encryption of the WASM payload before transit.
4. **Logic Injection** — Streaming deployment of encrypted WASM via `execute_logic()` gRPC call.
5. **Evidence Streaming** — Real-time reception of `LogicResponse` results from the Data Node.

**Core function:**

```rust
use liop_client::injector::inject_logic;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Inject a compiled WASM filter into a remote LIOP Data Node
    inject_logic("127.0.0.1:50051", "./target/wasm32-wasip1/release/filter.wasm").await?;
    Ok(())
}
```

**Dependencies:**
| Crate | Purpose |
|---|---|
| `liop-core` | Shared Protobuf types |
| `tonic` 0.11 | gRPC client |
| `tokio` 1.37 | Async runtime |
| `libp2p` 0.54 | P2P networking (QUIC, TCP, Noise, Yamux, Kademlia) |
| `pqcrypto-kyber` 0.8 | ML-KEM-768 Post-Quantum Key Encapsulation |
| `aes-gcm` 0.10 | AES-256-GCM authenticated encryption |
| `rand` 0.10 | Cryptographic random number generation |

## Security Architecture (Zero-Trust)

The Rust SDK implements a multi-layered security posture:

| Layer | Mechanism | Implementation |
|---|---|---|
| **Transport** | Post-Quantum Handshake | Kyber-768 KEM via `pqcrypto-kyber` |
| **Payload** | Symmetric Encryption | AES-256-GCM with random nonce |
| **Identity** | Decentralized DIDs | SPIFFE-compatible `agent_did` strings |
| **Discovery** | Cryptographic Routing | Kademlia DHT over Ed25519 Peer IDs |
| **Verification** | Integrity Proofs | ZK-Receipt validation (Journal + Seal) |

## Building

```bash
# From the repository root
cargo build -p liop-core -p liop-client

# Run tests
cargo test -p liop-core -p liop-client
```

> **Note:** The `liop-core` crate requires `protoc` to compile `.proto` files. The `protoc-bin-vendored` build dependency handles this automatically.

## Related

- 📖 [Official Documentation](https://liop.mintlify.app/)
- 📦 [TypeScript SDK (`@nekzus/liop`)](https://www.npmjs.com/package/@nekzus/liop)
- 🏗️ [Mesh Node Server](../../servers/liop-node/README.md)
- 📜 [Protocol Specification](../../protocol/SPECIFICATION.md)

## License

[MIT](./LICENSE) © [Nekzus](https://github.com/Nekzus)
