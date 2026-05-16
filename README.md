<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/dsvsl0b0b/image/upload/v1774702621/Neural-Mesh-Protocol/qaqsa28yrtpnxnbclv3p.svg?v=20260328">
    <img alt="Logic-Injection-on-Origin Protocol Logo" src="https://res.cloudinary.com/dsvsl0b0b/image/upload/v1774702621/Neural-Mesh-Protocol/hoanw0m6tybpz5fbl12n.svg?v=20260328" width="700">
  </picture>
<p align="center">
  <a href="https://github.com/Nekzus/LIOP/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Nekzus/LIOP.svg" alt="License"></a>
  <a href="https://nekzus-32.mintlify.app/"><img src="https://img.shields.io/badge/docs-mintlify-0D9373?style=flat" alt="Docs"></a>
  <a href="https://deepwiki.com/Nekzus/LIOP"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
  <a href="https://paypal.me/maseortega"><img src="https://img.shields.io/badge/donate-paypal-blue.svg?style=flat-square" alt="Donate"></a>
</p>

</div>

# Logic-Injection-on-Origin Protocol (LIOP)

**LIOP** is a next-generation, high-performance binary transport mesh designed for advanced AI Agent communication. It is the conceptual and technical evolution of the Model Context Protocol (MCP), radically shifting the paradigm from **pulling massive data** to secure **Logic-Injection-on-Origin (LIO)** execution.

> Instead of moving terabytes of data to the AI, LIOP moves lightweight, sandboxed logic to the data.

## The Problem

In the rapid evolution of autonomous agents, transferring gigabytes of raw data to central AI nodes for filtering, parsing, or reasoning is increasingly inefficient, slow, and expensive. Current protocols force agents to download entire datasets to extract a few relevant insights, wasting bandwidth, tokens, and time.

## The LIOP Solution: Logic-Injection-on-Origin

LIOP introduces a **decentralized, Zero-Trust architectural model** where AI agents inject ultra-lightweight, sandboxed execution modules (WebAssembly) directly into the data source. The data never leaves its origin.

```
@LIOP{wasi_v1,AuditModule}
...
@END
```

**Key benefits:**
- **Dramatically reduces network latency and bandwidth** — only semantically relevant results are returned.
- **Saves millions of tokens** — agents receive cryptographically verified evidence, not raw data.
- **Zero-Trust by default** — injected logic runs inside strict WASI sandboxes with capability-limited access.

## Repository Structure

This is a **polyglot monorepo** organized into clear, isolated modules:

```
LIOP-Protocol/ (LIOP)
├── sdks/
│   ├── typescript/          # @nekzus/liop (NPM package)
│   └── rust/                # liop-core & liop-client (Cargo crates)
├── servers/
│   └── liop-node/           # liop-server (Wasmtime + gRPC + libp2p)
├── protocol/
│   ├── proto/               # Protobuf v3 service definitions (liop_core.proto)
│   └── SPECIFICATION.md     # Formal protocol specification
├── examples/
│   ├── demos/               # High-fidelity & educational demos
│   └── wasm-filters/        # Example WASM payloads (filter, watchdog)
├── tools/
│   └── liop-cli/            # Developer CLI for Health/Negotiate checks
├── docs/                    # Mintlify documentation portal
├── tests/                   # E2E integration tests
├── MANIFESTO.md             # Project philosophy & vision
├── CONTRIBUTING.md          # Contribution guide (EN/ES)
├── CODE_OF_CONDUCT.md       # Code of conduct (EN/ES)
└── Cargo.toml               # Rust workspace root
```

## Core Components

### 1. TypeScript SDK — `sdks/typescript/`

The developer-facing SDK, published as [`@nekzus/liop`](https://www.npmjs.com/package/@nekzus/liop) on NPM. Designed as a **drop-in replacement for MCP** with native LIOP capabilities.

| Feature | Description |
|---|---|
| `LiopServer` | Register tools, resources, and prompts with Zod schema validation |
| `LiopClient` | Discover and invoke remote tools via P2P mesh |
| `LiopMcpBridge` | JSON-RPC 2.0 adapter for legacy MCP clients (Claude Desktop, Cursor) |
| Guardian AST | Static analysis of WASM imports to prevent sandbox escapes |
| PII Shield | Real-time detection and blocking of sensitive data via Customizable Regional Presets (Email, Credit Card, SSN, IBAN, Passport MRZ, custom regex) |
| Worker Pool | Multi-threaded execution via Piscina for non-blocking cryptography |
| PQC (Kyber) | Post-Quantum key encapsulation for transport layer security |
| Security | TLS/mTLS, Rate-Limiting, and QUIC transport support |
| Cross-AI Prompts | Zero-Shot Adaptors to train models in Real-Time (Claude XML, OpenAI, Gemini) |
| ZK Receipts | HMAC-SHA256 cryptographic proof of honest computation (ZK-VM roadmap) |

[Read the TypeScript SDK Documentation](./sdks/typescript/README.md)

---

### 2. Rust SDK — `sdks/rust/`

The native Rust crates providing zero-overhead bindings to the LIOP mesh.

| Crate | Description |
|---|---|
| `liop-core` | Shared Protobuf definitions compiled with `tonic` + `prost` |
| `liop-client` | High-level agent interface with Kyber PQC, AES-256-GCM encryption, and Kademlia DHT discovery |

[Read the Rust SDK Documentation](./sdks/rust/README.md)

---

### 3. Mesh Node Server — `servers/liop-node/`

The high-performance Data Node host, written in Rust. This is where injected WASM logic executes.

| Module | Description |
|---|---|
| `executor.rs` | Wasmtime + WASI sandbox with fuel-based CPU limits and `liop::push_event` host syscall |
| `guardian.rs` | Zero-Time AST structural scanning via `wasmparser` — rejects malicious imports before JIT |
| `grpc.rs` | Tonic gRPC server with PQC intent negotiation, Rate-Limiting, and streaming |
| `p2p.rs` | libp2p Kademlia DHT for decentralized peer discovery over Noise/TCP/QUIC |
| `zk.rs` | ZK-Receipt generation engine (HMAC-SHA256 commitments, ZK-VM roadmap) |
| `tee.rs` | Trusted Execution Environment trait bounds for AWS Nitro Enclaves / Intel SGX |
| `config/health`| Externalized `config.toml` and Hyper `/health` endpoints for observability |

[Read the Mesh Node Documentation](./servers/liop-node/README.md)

## Technical Stack

| Layer | Technology |
|---|---|
| **Transport** | Tonic gRPC + Protobuf v3 |
| **Peer Discovery** | libp2p (Kademlia DHT, Noise Protocol, QUIC) |
| **Sandboxing** | Wasmtime 29.0 + WASI Preview 1 |
| **Post-Quantum Crypto** | ML-KEM-768 (Kyber) + AES-256-GCM |
| **Static Analysis** | `wasmparser` AST inspection |
| **Integrity Proofs** | HMAC-SHA256 commitments (ZK-VM roadmap: RISC Zero / SP1) |
| **TypeScript Runtime** | Node.js ≥ 20 + Piscina Worker Threads |
| **Code Quality** | Biome.js (TS) + Clippy (Rust) |
| **CI/CD** | GitHub Actions + semantic-release + NPM Provenance |

## Getting Started

### Install the TypeScript SDK

```bash
npm install @nekzus/liop@latest
```

### Run the Zero-Config Agent (CLI)

For end-users wanting to integrate with **Claude Desktop** instantly:

```bash
npx -y @nekzus/liop@latest
```

### Build the Rust Backend

```bash
# Add WASI target
rustup target add wasm32-wasip1

# Compile the full workspace
cargo build

# Run tests
cargo test
```

## Documentation

- [Official Documentation Portal (Mintlify)](https://nekzus-32.mintlify.app/)
- [Ask DeepWiki about LIOP](https://deepwiki.com/Nekzus/LIOP)
- [Protocol Specification](./protocol/SPECIFICATION.md)
- [Project Manifesto](./MANIFESTO.md)

## 🤖 AI Agent Support

This project includes a native [AGENTS.md](./AGENTS.md) file to provide optimized context and rules for AI-assisted development (Google Antigravity, Claude, Cursor). It ensures architectural alignment and security compliance during autonomous tasks.

## Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) for guidelines on how to get involved. This project adheres to a [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © [Nekzus](https://github.com/Nekzus)
