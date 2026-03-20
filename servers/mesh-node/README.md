<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/dsvsl0b0b/image/upload/v1772730727/Neural-Mesh-Protocol/bxasdalv9vwyt7m45vnb.svg">
    <img alt="Neural Mesh Protocol Logo" src="https://res.cloudinary.com/dsvsl0b0b/image/upload/v1772730741/Neural-Mesh-Protocol/koych4jotjoldgo4ydpk.svg" width="700">
  </picture>
</div>

# Neural Mesh Protocol - Cargo Core (rust-app)

This directory contains the underlying high-performance, system-level components of the NMP mesh network, written cleanly in a Rust 2021 Cargo Workspace.

## Components Breakdown

The Cargo Workspace is divided into modular crates:

- **`nmp-core`**: The shared library storing standardized Protobuf definitions via `prost` and `tonic`.
- **`nmp-server`**: The Data Node host. Contains the heavy-duty `wasmtime-wasi` sandbox. It securely receives foreign WebAssembly logic, virtualizes strict capabilities (like read-only filesystem access for specific directories), and executes the payload at near-native speeds.
- **`nmp-client`**: The Agent Node injector SDK for compiling and pushing Wasm logic (now located in `sdks/rust/crates/client`).
- **`config/health`**: Modular infrastructure for TOML-driven external configuration and Hyper-based observability (`/health` probes).

## Core Capabilities (Hardening)

- **Native QUIC Transport**: Support for high-performance, multiplexed `/quic-v1` UDP transport over the Libp2p Mesh DHT.
- **TLS/mTLS Security**: Deep integration with `rustls` securing gRPC Tonic endpoints with decentralized or standard PKI certificates.
- **Rate-Limiting (Anti-DoS)**: Token-bucket interceptors deployed at the gRPC layer to throttle aggressive logic injections.
- **Structured Telemetry**: Full `tracing_subscriber` integration out-of-the-box for JSON-ready asynchronous logging.

## Security (Zero-Trust)

This backend implements a ferocious security posture:
- **WASI Sandboxing**: Payload instances cannot touch sockets, memory, or undeclared files not strictly mapped by the Server. Includes `consume_fuel()` runtime protections against infinite loops.
- **Decentralized Identity**: Peer Identifiers are mathematically derived from Ed25519 keypairs. Kademlia routing is cryptographically verified to evade Eclipse attacks.
- **Zero-Time AST**: `Guardian` statically analyzes `.wasm` imports via `wasmparser` to ban malicious sandbox escapes *before* instantiation.
- **PQC Handshakes & ZK**: Experimental integrations with `pqcrypto-kyber` to thwart "Harvest Now, Decrypt Later" quantum attacks, and ZK-Receipt SHA-256 (Journal + Seal) verification.

## Building and Running

To compile the workspace, you must have the `wasm32-wasip1` target installed for the example filters.

```bash
# Add WebAssembly WASI target
rustup target add wasm32-wasip1

# Compile everything, including filters
cargo build

# Run the complete test suite
cargo test
```

*Note: The `target/` directory of this workspace is heavily isolated and ignored globally from version control to prevent repository bloat.*
