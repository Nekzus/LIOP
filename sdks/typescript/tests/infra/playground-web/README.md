# LIOP Web Playground

The **LIOP Web Playground** is an interactive, browser-based testing console for the Logic-Injection-on-Origin Protocol (LIOP). It provides real-time visualization of logic injection pipelines, deterministic AST fuel telemetry, token economy comparison against traditional MCP context-pulling, and cryptographic proof inspection.

## Architecture

Built with React 19, TypeScript, Tailwind CSS, Radix UI primitives, and Framer Motion:

* **In-Situ Execution Console**: Allows writing and testing WebAssembly/JavaScript logic payloads against connected enclaves.
* **4-Tab Inspector**:
  * **Output**: Formatted result payload, cryptographic ZK-Receipt HMAC-SHA256 attestation, and data sovereignty metrics.
  * **Debug**: Step-by-step pipeline timings (Route Discovery, ML-KEM-768 Handshake, AES-256-GCM Sealing, WASI Sandbox, ZK-Receipt Verification), raw JSON-RPC envelopes, and PII Shield verdicts.
  * **Telemetry**: Side-by-side token economy comparison (BPE `o200k_base`) vs traditional MCP context-pulling (~16k to 48k tokens), deterministic AST instruction fuel metering with 100-unit bucket quantization (NIST SP 800-53), and wire traffic reduction percentages.
  * **System**: Node connection state, active era detection (MCP 2026-07-28 vs legacy 2025-11-25), and routing table status.
* **Dual High-Contrast Themes**: OLED Obsidian and Midnight Slate modes toggled atomically via CSS custom properties.

## Development & Build

```bash
# Run local dev server with Hot Module Replacement (HMR)
pnpm run dev

# Compile TypeScript and bundle for production
pnpm run build

# Preview production build locally
pnpm run preview
```

## Running within the Mesh

The playground is typically launched through the root workspace scripts:

```bash
# Launch local standalone gateway + playground on port 14000
pnpm demo:playground

# Or run within the full 10-node sovereign Docker harness on port 16002
pnpm audit:prod:start
```

## Configuration

The playground automatically connects to the local LIOP Gateway at `http://localhost:3000/mcp` or the URL configured via the connection input in the top navigation bar.
