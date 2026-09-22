# LIOP Production Audit Demo

A focused demonstration illustrating direct usage of the `@nekzus/liop` SDK to process protected datasets without raw data egress.

---

## 📚 Official Documentation

For comprehensive guides, API references, and production deployment patterns, visit the [official LIOP documentation](https://nekzus-32.mintlify.app/).

---

## Architectural Features

- **Native SDK Integration**: Built exclusively with `@nekzus/liop` using strict Zod schemas and runtime policies.
- **Hardware & Protocol Cryptography**: ML-KEM-768 key encapsulation and AES-256-GCM symmetric encryption.
- **In-Situ Execution**: Processes protected medical records (`medical_records.json`) locally. The audit logic executes at the server, returning only aggregated metrics.

---

## How to Run

### 1. Start the Data Node (Server)
```bash
pnpm run start:server
```

### 2. Run the Audit Agent (Client)
```bash
pnpm run start:client
```

---

## License

Licensed under the [Apache License, Version 2.0](../../../LICENSE). Copyright 2026 [Nekzus Solutions](https://github.com/Nekzus) and contributors.
