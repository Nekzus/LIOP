# Logic-Injection-on-Origin Protocol: The Blind Analyst (Hi-Fi Demo)

A dynamic, high-fidelity demonstration showcasing an end-to-end Logic-Injection-on-Origin Protocol (LIOP) execution cycle, layered security verification, and resource exhaustion defense.

---

## 📚 Official Documentation

For comprehensive guides and architecture specifications, visit the [official LIOP documentation](https://nekzus-32.mintlify.app/).

---

## Overview

Unlike legacy Model Context Protocol (MCP) systems that pull raw records across networks toward large language models, LIOP pushes computational WebAssembly (WASI) or sandboxed JavaScript logic directly to the source of the data ("The Vault").

This demo executes peer-to-peer interactions between `agent.ts` and `server-node.ts` to demonstrate:
1. **In-Situ Execution**: Running analytical logic payloads (Hypertension analysis, Age distribution) over sensitive records without transferring raw datasets over the wire.
2. **Layered Defense**: Enforcing pre-execution AST validation against sandbox escapes and halting infinite loops via deterministic CPU fuel limits.

---

## Scenarios

The agent implements four distinct scenarios:

### 1. `average-age` (Analytical Computation)
Computes the mean age of patient records within the secure dataset and returns an HMAC-SHA256 **ZK-Receipt** proving the calculation was correctly executed inside the Vault.

### 2. `hypertension` (Conditional Aggregation)
Filters specifically for patients with a `Hypertension` diagnosis and a Risk Score `> 0.8`. Demonstrates complex conditional filtering pushed to the origin without leaking individual records.

### 3. `ast-attack` (AST Static Inspection)
Simulates an I/O injection attack. The client attempts to dispatch a logic module that invokes `fs.readFileSync('/etc/passwd')`. The Vault's **Guardian AST** catches the unauthorized import and halts execution before compilation.

### 4. `fuel-exhaustion` (Resource Exhaustion Defense)
Simulates an infinite loop. The client sends a module designed to consume CPU cycles indefinitely. The server's **WASI Sandbox** tracks instruction cycles against the allocated fuel budget and terminates the process with an out-of-fuel error.

---

## How to Run

From the repository root or demo directory:

```bash
# Run Analytical Scenarios
pnpm run hifi:agent --scenario=average-age
pnpm run hifi:agent --scenario=hypertension

# Run Security Defense Scenarios
pnpm run hifi:agent --scenario=ast-attack
pnpm run hifi:agent --scenario=fuel-exhaustion
```

---

## Security Stack Displayed

- **Post-Quantum Cryptography**: NIST FIPS 203 ML-KEM-768 key encapsulation and AES-256-GCM encryption.
- **Guardian AST**: Pre-compilation import allowlist inspection (14 safe WASI symbols).
- **WASI Sandbox Fuel Management**: Instruction-level fuel budgeting quantized to 100-unit buckets.
- **ZK-Receipt Integrity**: HMAC-SHA256 proof binding output hash to logic digest and dataset anchor.

---

## License

Licensed under the [Apache License, Version 2.0](../../../LICENSE). Copyright 2026 [Nekzus Solutions](https://github.com/Nekzus) and contributors.
