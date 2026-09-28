<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Nekzus/LIOP/main/docs/logo/dark.svg">
    <img alt="Logic-Injection-on-Origin Protocol Logo" src="https://raw.githubusercontent.com/Nekzus/LIOP/main/docs/logo/light.svg" width="600">
  </picture>

  <h1>@nekzus/liop-studio</h1>
  <p><strong>LIOP Sovereign Studio & Network Scanner</strong></p>
  <p>Interactive developer studio, real-time telemetry console, and zero-trust capability scanner for the Logic-Injection-on-Origin Protocol (LIOP) and Model Context Protocol (MCP).</p>

  <p align="center">
    <a href="https://www.npmjs.com/package/@nekzus/liop-studio"><img src="https://img.shields.io/npm/v/@nekzus/liop-studio.svg" alt="npm version"></a>
    <a href="https://github.com/Nekzus/LIOP/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
    <a href="https://nekzus-32.mintlify.app/typescript-sdk/playground"><img src="https://img.shields.io/badge/docs-mintlify-0D9373?style=flat" alt="Docs"></a>
    <a href="https://deepwiki.com/Nekzus/LIOP"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
  </p>
</div>

---

## Official Documentation

Interactive guides and architectural deep dives for LIOP Studio and Playground are hosted on Mintlify:

| Documentation Section | Focus Area | Canonical Guide |
|---|---|---|
| **Studio & Playground** | Web console architecture, 5-tab output inspector, and execution flows | [Playground & Studio Guide](https://nekzus-32.mintlify.app/typescript-sdk/playground) |
| **Observability Runbook** | Prometheus metrics catalog and 26-panel Grafana master dashboard | [Observability Runbook](https://nekzus-32.mintlify.app/operations/observability-runbook) |
| **TypeScript SDK** | Core runtime integration, client negotiation, and server sandboxing | [SDK Overview](https://nekzus-32.mintlify.app/typescript-sdk/overview) |

---

## Overview

`@nekzus/liop-studio` provides both a full-featured web dashboard and a headless CLI scanner to interact with LIOP sovereign enclaves and standard MCP servers. It allows developers and security auditors to test Logic-Injection-on-Origin payloads, measure AST instruction fuel consumption, trace post-quantum cryptographic handshakes, and inspect ZK-Receipts in real time.

### Key Capabilities

- **Interactive Web Console (`:16000`)**: Full-featured React 19 UI with real-time SSE execution streaming, CodeMirror 6 code editor, and live cluster health monitoring.
- **5-Tab Results Inspector**:
  - `Output`: Archetype-specific formatted data and sanitized JSON structures.
  - `Debug`: Granular step-by-step traces across AST validation, sandbox execution, and egress filtering.
  - `Telemetry`: In-situ AST fuel consumption (quantized to 100 units), BPE token counting (`o200k_base`), and wire egress savings.
  - `Export`: Auto-generated client integration snippets (TypeScript SDK, Python, cURL, gRPC).
  - `History`: In-memory inspection of the last 20 execution runs.
- **Headless Network Scanner**: CLI command (`scan`) to perform non-interactive health probes and capability discovery over HTTP, gRPC, and P2P multiaddrs.
- **Dual Dynamic Themes**: High-contrast OLED Obsidian (`#000000`) and Slate Navy (`#0f172a`) modes backed by semantic CSS custom properties.

---

## Quickstart

### 1. Launch Interactive Studio (Web UI)

Run the studio directly using `npx` (serves the web interface on `http://localhost:16000`):

```bash
# Launch default web console on port 16000
npx @nekzus/liop-studio

# Launch targeting a specific MCP HTTP endpoint
npx @nekzus/liop-studio --http "http://localhost:15000/mcp"

# Launch targeting a native LIOP gRPC enclave
npx @nekzus/liop-studio --grpc "127.0.0.1:15011"
```

### 2. Run Headless Capability Scan (CLI)

Perform instant health, discovery, and security scans from terminal scripts or CI pipelines:

```bash
# Quick health and capabilities scan of an HTTP MCP / LIOP gateway
npx @nekzus/liop-studio scan http://localhost:15000/mcp

# Scan a native gRPC sovereign enclave
npx @nekzus/liop-studio scan 127.0.0.1:15011

# Scan a P2P DHT multiaddr
npx @nekzus/liop-studio scan /ip4/127.0.0.1/tcp/15001/p2p/12D3KooW...
```

---

## Security & Sandboxing Guardrails

- **CWE-78 Command Injection Defense**: Stdio subprocess spawning strictly enforces `{ shell: false }` with rigorous argument and binary sanitization.
- **CWE-918 SSRF Protection**: All outbound HTTP probes validate destination addresses and explicitly block cloud metadata IPs (`169.254.169.254`).
- **NIST SP 800-53 Timing Side-Channel Elimination**: Deterministic AST instruction fuel scoring quantized into 100-unit buckets (`stddev = 0`).
- **Zero-Trust V8 Sandbox**: PAYLOAD execution occurs within isolated V8 contexts with 25 poisoned globals and 11 frozen prototypes.

---

## License

Licensed under the [Apache License, Version 2.0](../../LICENSE). Copyright 2026 [Nekzus Solutions](https://github.com/Nekzus) and contributors.
