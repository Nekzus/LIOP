# Logic-Injection-on-Origin Protocol: The Blind Analyst (Hi-Fi Demo)

A dynamic, high-fidelity demonstration simulating an end-to-end Logic-Injection-on-Origin Protocol (LIOP) execution cycle, security verification, and resource exhaustion defense.

## Overview
Unlike legacy systems (like MCP) that pull data toward large language models, LIOP pushes computational **WebAssembly (or JIT-compiled JS)** logic directly to the source of the data ("The Vault"). 

This demo runs a simulated P2P connection between `agent.ts` and `server-node.ts` to demonstrate:
1. **In-situ Execution:** Running logic payloads (Hypertension analysis, Age computation) over sensitive mock data without transferring raw records over the wire.
2. **Layered Defense:** Triggering pre-execution AST validation against sandbox escapes and halting infinite loops via deterministic fuel limits.

## Scenarios
The agent implements four scenarios:

### 1. `average-age` (Analytical Computation)
Computes the mean age of all patient records within the secure dataset and returns a **ZK-Receipt** proving the math was correctly executed inside the Vault.

### 2. `hypertension` (Conditional Aggregation)
Filters specifically for patients with a `Hypertension` condition and a Risk Score `> 0.8`. Demonstrates complex conditional filtering pushed to the origin without leaking individual records.

### 3. `ast-attack` (AST Static Inspection)
I/O Injection Attempt. The Client attempts to send a logic module that invokes `fs.readFileSync('/etc/passwd')`. The Vault's **Guardian AST** catches the unauthorized import and halts execution before instantiation.

### 4. `fuel-exhaustion` (Resource Exhaustion Defense)
Infinite Loop Simulation. The Client sends a loop designed to consume CPU cycles indefinitely. The server's **WASI Sandbox** tracks instruction cycles against the allocated fuel budget and terminates the process with a `Resource Exhaustion` error.

## How to Run
All scenarios can be run using `pnpm`:

```bash
# Run Analytical Scenarios
pnpm run hifi:agent --scenario=average-age
pnpm run hifi:agent --scenario=hypertension

# Run Security Defense Scenarios
pnpm run hifi:agent --scenario=ast-attack
pnpm run hifi:agent --scenario=fuel-exhaustion
```

## Security Stack Displayed
- **Simulated Kyber ML-KEM-768 & AES-256-GCM Handshakes.**
- **Guardian AST:** Pre-compilation import allowlist inspection.
- **Wasmtime WASI Fuel Management:** Strict instruction limit encapsulation.
- **ZK-Receipt Integrity (HMAC-SHA256).**

## Architecture Highlight
Executing `agent.ts` demonstrates how the client encapsulates remote operations by transmitting a compiled manifest directly into the isolated runtime of `server-node.ts`.
