# LIOP Sovereign Studio — Web UI Architecture

The frontend of **LIOP Studio** is a decoupled Single Page Application (SPA) designed to inspect, test, and inject sandboxed WASI micro-modules across multi-tier LIOP nodes and standard Model Context Protocol (MCP) servers.

---

## Architectural Principles

1. **Deterministic State Synchronization**: Template selection, capability targeting, and network endpoint routing maintain strict bidirectional synchronization. Selecting a capability switches target enclaves automatically when required.
2. **Realtime Computational Telemetry**: Observes in-situ fuel consumption (quantized to 100-unit buckets per NIST SP 800-53), BPE token counting (`o200k_base`), wire egress reduction, and cryptographic proofs (ZK-Receipt HMAC-SHA256, ML-KEM-768, AES-256-GCM).
3. **High-Contrast Semantic Theming**: Built with semantic CSS custom properties toggled atomically via `data-theme` attributes (`obsidian` OLED black and `slate` navy/slate), guaranteeing contrast across low-light development terminals.
4. **Resilient Local Persistence**: Modified WASI logic payloads persist per-template in browser local storage (`liop_studio_custom_code_{templateId}`), preventing accidental data loss during multi-enclave testing sessions.

---

## Component Taxonomy

```
src/
├── components/
│   ├── StudioHeader.tsx         # Live cluster health badge, dynamic tier counter, theme switcher
│   ├── TargetConnectionBar.tsx  # Multi-transport target switcher (stdio, http, grpc, mesh)
│   ├── SessionTelemetryBar.tsx  # Cumulative session metrics (total calls, tokens in/out, uptime)
│   ├── ServerScanPanel.tsx      # Tier 1-3 enclave inventory and capability browser
│   ├── NodeCard.tsx             # Interactive node card with RTT latency and exposed tools
│   ├── LogicEditor.tsx          # Dual-mode execution harness: WASI Logic injection vs MCP Form
│   ├── CodeEditor.tsx           # CodeMirror 6 editor with JavaScript syntax, line numbers, and fold gutter
│   ├── DynamicToolForm.tsx      # Reactive form generator driven by tool JSON Schemas
│   ├── EnvironmentExplorer.tsx  # Schema inspector for origin runtime datasets (`env.records`)
│   ├── ResultsConsole.tsx       # 5-tab output console with execution timeline visualizer
│   └── results/
│       ├── OutputTab.tsx        # Structured JSON and archetype-specific visual results
│       ├── DebugTab.tsx         # Detailed SSE execution step traces and security audit
│       ├── ExportTab.tsx        # Integration code generators (TypeScript SDK, Python, cURL, gRPC)
│       ├── TelemetryTab.tsx     # Context reduction, fuel usage, and cryptographic receipts
│       └── HistoryTab.tsx       # In-memory execution history inspector (up to 20 runs)
```

---

## Core Hooks

- **`useStudioNetwork`**: Manages active target connections (`POST /api/connect`), cluster inventory polling (`GET /api/nodes`), tool catalogs (`GET /api/tools`), and session-level telemetry (`GET /api/telemetry`).
- **`useStudioExecution`**: Streams real-time execution steps from `POST /api/execute` via Server-Sent Events (SSE), provides `AbortController` cancellation (`cancelExecution`), and maintains the session execution history.

---

## Development & Build Commands

```bash
# Start Vite development server with API proxy to port 16000
pnpm --filter @nekzus/liop-studio-ui dev

# Compile TypeScript and bundle production assets to ui/dist/
pnpm --filter @nekzus/liop-studio-ui build

# Preview production build locally
pnpm --filter @nekzus/liop-studio-ui preview
```
