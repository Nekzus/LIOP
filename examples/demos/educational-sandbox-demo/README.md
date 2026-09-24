# LIOP Educational Sandbox Demo

This interactive sandbox demonstrates the internal security and execution layers of the Logic-Injection-on-Origin Protocol (LIOP) that operate under the hood in the SDK.

---

## Official Documentation

For full guides and architectural documentation, visit the [official LIOP documentation](https://nekzus-32.mintlify.app/).

---

## Core Components

- **LiopCompiler**: Packaging of analytical logic into a secure, self-contained LIOP payload envelope.
- **GuardianAST**: Security module that performs AST inspection before instantiation, checking imports against a 14-symbol allowlist.
- **WasiSandbox**: Isolated execution environment with resource monitoring (CPU fuel) and virtual filesystem isolation.
- **ZK-Verifier**: Cryptographic verification of computational integrity using ZK-Receipts (HMAC-SHA256 commitments sealed with session secrets).

---

## How to Run

Ensure you are in the demo directory and dependencies are installed:

### 1. Start the Data Node (Server)
```bash
pnpm run start:server
```

### 2. Run the Injector Agent (Client)
```bash
pnpm run start:agent
```

---

## Workflow Sequence

1. The Agent compiles analytical logic into a secure envelope (`@LIOP{...}...@END`).
2. PQC Handshake (ML-KEM-768) and symmetric payload sealing (AES-256-GCM) take place.
3. The Server validates the code (Guardian AST) and executes it within the Sandbox.
4. Sanitized results are returned alongside an HMAC-SHA256 ZK-Receipt confirming integrity.

---

## License

Licensed under the [Apache License, Version 2.0](../../../LICENSE). Copyright 2026 [Nekzus Solutions](https://github.com/Nekzus) and contributors.
