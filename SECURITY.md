# Security Policy

## Supported Versions

We provide security updates and patches for the following release channels:

| Channel | Release Range | Security Support |
| :--- | :--- | :---: |
| `main` (`latest`) | `>= 2.3.0` | Supported |
| `beta` (`@beta`) | `>= 2.1.0-beta.x` | Supported |
| `alpha` (`@alpha`) | `>= 2.1.0-alpha.x` | Supported |
| Legacy (v1.x) | `< 2.0.0` | End of Life (Unsupported) |

---

## Reporting a Security Vulnerability

The Logic-Injection-on-Origin Protocol (LIOP) operates under a strict **Zero-Trust** security model with military-grade protections against data extraction, side-channel attacks, and sandbox escapes.

If you discover a potential security vulnerability, memory isolation breach, PII extraction vector, or cryptographic weakness, **please DO NOT create a public GitHub issue**.

### Preferred Reporting Method
Privately submit a report through GitHub Security Advisories:
👉 **[Open a Private Security Advisory](https://github.com/Nekzus/LIOP/security/advisories/new)**

### Security Scope & Triage Invariants
Reports regarding the following critical layers receive expedited triage:
1. **Layer 1 (Guardian AST)**: Static inspection bypasses or allowlist escapes in injected logic.
2. **Layer 2 (WASI / V8 Sandboxing)**: Global namespace poisoning escapes or prototype contamination vectors.
3. **Layer 3 (Taint Analysis & IFC)**: Information Flow Control breaches deriving sensitive data through side channels.
4. **Layer 4 (Egress PII Shield)**: Unsanitized credit card, SSN, email, or credential leakage through egress filters.
5. **Layer 5 (Cryptographic Proofs & ZK-Receipts)**: HMAC-SHA256 tampering, ML-KEM-768 key exchange flaws, or ML-DSA-65 signature forgery.

### Response Timeline
* **Initial Assessment**: Within 48 hours.
* **Triage & Reproduction**: Within 5 business days.
* **Coordinated Disclosure**: Fixes will be backported to `alpha`, `beta`, and released in `main` with full CVE attribution prior to public disclosure.
