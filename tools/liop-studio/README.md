# @nekzus/liop-studio

> **LIOP Sovereign Studio & Mesh Scanner**: Developer studio, interactive testbed, and network scanner for the Logic-Injection-on-Origin Protocol (LIOP) and Model Context Protocol (MCP).

---

## 🚀 Quickstart

### 1. Launch Interactive Studio (Web UI)
```bash
# Launch on default port (http://localhost:16000)
npx @nekzus/liop-studio

# Launch targeting a specific MCP endpoint
npx @nekzus/liop-studio --http "http://localhost:3000/mcp"

# Launch targeting a native LIOP gRPC node
npx @nekzus/liop-studio --grpc "127.0.0.1:50051"
```

### 2. Run Headless Network & Capability Scan (CLI)
```bash
# Quick health and capabilities scan of an MCP or LIOP server
npx @nekzus/liop-studio scan http://localhost:3000/mcp

# Scan a native gRPC node
npx @nekzus/liop-studio scan 127.0.0.1:50051

# Scan a P2P DHT multiaddr
npx @nekzus/liop-studio scan /ip4/127.0.0.1/tcp/4000/p2p/12D3KooW...
```

---

## 🛡️ Security Guardrails
- **CWE-78 Command Injection Defense**: Stdio subprocess execution strictly enforces `{ shell: false }` with executable and argument sanitization.
- **CWE-918 SSRF Protection**: All outbound HTTP probes validate URLs and block cloud metadata IP addresses (`169.254.169.254`).
- **NIST SP 800-53 Timing Side-Channel Protection**: Deterministic instruction fuel quantized to 100 units.
- **Zero-Trust Origin Execution**: V8 Isolate sandboxing with poisoned globals and frozen prototypes.

---

## 📄 License
Apache-2.0. Copyright 2026 Nekzus Solutions and contributors.
