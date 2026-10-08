# Secrets Management & Cryptographic Lifecycle Policy

This document defines the formal policy, operational lifecycle, and automated verification procedures for all cryptographic secrets, private network keys, certificates, and authentication tokens in the Logic-Injection-on-Origin Protocol (LIOP) monorepo.

Audit assessment performed under the `secrets-management` and `security-and-hardening` frameworks in compliance with NIST SP 800-57, SOC 2 Type II, and PCI-DSS v4.0.

---

## 1. Cryptographic Classification & Secret Inventory

The LIOP protocol employs four distinct tiers of cryptographic material, each with explicit generation, storage, and rotation parameters.

| Secret ID | Secret Description | Cryptographic Algorithm | Storage Medium | Lifecycle / TTL | Rotation Mandate |
|---|---|---|---|---|---|
| **SEC-01** | libp2p Swarm Key (PSK) | 95-Byte Private Network Key (`pnet`) | In-memory / Secure Volume (`chmod 0600`) | Network Lifespan | Annually or upon suspected node compromise |
| **SEC-02** | Enclave Node Identity Keys | Ed25519 (256-bit) | Encrypted Volume / Enclave KMS | Long-lived Node Identity | Upon enclave reprovisioning |
| **SEC-03** | mTLS CA & Node Certificates | X.509 RSA-4096 / ECDSA P-256 | Filesystem with `CertManager` monitoring | 90 days validity | Automated hot-reload at 30 days remaining |
| **SEC-04** | Post-Quantum Session Secrets | ML-KEM-768 (NIST FIPS 203) / AES-256-GCM | Ephemeral RAM only | 3600 seconds (1 hour maximum) | Per-session ephemeral generation |
| **SEC-05** | OAuth 2.1 M2M Bearer Tokens | RS256 / EdDSA signed JWT | In-memory cache with 30s buffer | 3600 seconds | Preemptive refresh at 30s before expiry |
| **SEC-06** | Package Registry Publishing Credential | OIDC Tokenless Exchange (SLSA Level 3) | Ephemeral GitHub Actions OIDC ID Token | 10 minutes (Job duration) | Purely ephemeral, zero static tokens |

---

## 2. Private Network Swarm Key (`pnet`) Management

### 2.1 Canonical Format & Storage

Located in `sdks/typescript/src/mesh/swarm-key.ts` and `servers/liop-node/src/p2p.rs`.

The private network is cryptographically segmented using libp2p `pnet` wrappers. The pre-shared key enforces the standard 95-byte multiline layout:

```
/key/swarm/psk/1.0.0/
/base16/
[64-character hexadecimal key]
```

### 2.2 Operational Safeguards

1. **Strict File Permissions:**
   When persisted to disk, the key file must be owned by the service user and restricted to `0600` permissions (`-rw-------`). Unprivileged users or container guests cannot read the key file.
2. **Environment Variable Injection:**
   In containerized or serverless deployments, the key is supplied via the `LIOP_SWARM_KEY` environment variable as a Base64-encoded string, which is parsed into binary memory by `deserializeSwarmKey()` without writing cleartext files to disk.
3. **Emergency Swarm Rotation Runbook:**
   In the event of an enclave compromise:
   - Generate a new 95-byte key using `createSwarmKey()`.
   - Distribute the new key to trusted Tier 1 enclaves and Border LIO Gateways via secure orchestration channels.
   - Disconnect untrusted peer connections, forcing immediate re-authentication under the new PSK.
   - Nodes without the new PSK are rejected at the transport socket level prior to DHT message processing.

---

## 3. Mutual TLS (mTLS) Certificate Lifecycle & Zero-Downtime Hot Reloading

### 3.1 Implementation Architecture

Located in `sdks/typescript/src/security/cert-manager.ts`.

To maintain compliance with NIST SP 800-52 Rev. 2 and Zero Trust Architecture (NIST SP 800-207), all inter-enclave gRPC channels require mutual TLS. `CertManager` provides non-blocking certificate monitoring and live replacement.

```
 [ Local Certificate Authority / Vault / cert-manager ]
                        │
                        ▼ (Writes renewed PEM files to disk)
 [ Filesystem: cert.pem, key.pem, ca.pem ]
                        │
                        │ (fs.watch triggers change event)
                        ▼
 ┌────────────────────────────────────────────────────────┐
 │                 LIOP CertManager Engine                │
 │  ├── 1. Debounce Window (150ms write stabilization)    │
 │  ├── 2. Native X.509 Parsing (crypto.X509Certificate)  │
 │  ├── 3. Validity & Expiration Verification             │
 │  └── 4. Atomic In-Memory Buffer Replacement            │
 └──────────────────────┬─────────────────────────────────┘
                        │
                        │ (Emits 'reload' event with CertInfo)
                        ▼
 [ Running gRPC Server & Client Channel Contexts Updated ]
 (Zero connection drops, zero process restarts)
```

### 3.2 Operational Guarantees

- **Proactive Expiration Warning:**
  Calculates days remaining on loaded certificates and raises alerts when validity falls below `warningDays` (default: 30 days).
- **Debounced Reloading:**
  A 150-millisecond debounce window prevents race conditions caused by multi-stage certificate writes.
- **Fail-Safe Fallback:**
  If a renewed file is corrupted during write, `CertManager` retains the existing valid in-memory certificate buffers and emits a structured error event, preventing enclave downtime.

---

## 4. Ephemeral Post-Quantum Session Material & TTL Limits

### 4.1 Ephemeral Key Encapsulation (ML-KEM-768)

Located in `sdks/typescript/src/rpc/crypto/` and `servers/liop-node/src/zk.rs`.

Session encryption for high-assurance data transit utilizes NIST FIPS 203 (ML-KEM-768) key encapsulation to establish symmetric AES-256-GCM session keys.

1. **Ephemeral Scope:**
   Session keys are strictly ephemeral and derived in memory. Under no circumstances are symmetric session secrets written to persistent databases, log streams, or configuration files.
2. **Strict 3600-Second Time-to-Live (PCI-DSS Req. 8.2):**
   Session secrets enforce a non-extendable lifetime of 3600 seconds (1 hour). Once the TTL expires, the session secret is invalidated and purged from RAM. Any subsequent request referencing an expired session secret is rejected with an authentication failure.
3. **Anti-Replay Cryptographic Binding:**
   The output of each analytical execution is cryptographically bound to the session secret via HMAC-SHA256 ZK-receipts verified using `crypto.timingSafeEqual`. Modifying execution outputs or replaying journals from previous sessions causes immediate verification failure.

---

## 5. OAuth 2.1 M2M Bearer Token Lifecycle

### 5.1 Token Manager Specification

Located in `sdks/typescript/src/runtime/token-manager.ts`.

Machine-to-Machine (M2M) communications across tier boundaries utilize short-lived JWT access tokens conforming to RFC 6749 and RFC 9068.

1. **Preemptive Refresh Threshold:**
   To eliminate runtime 401 errors during continuous query streaming, `TokenManager` initiates token renewal 30 seconds before scheduled expiration (`REFRESH_BUFFER_MS = 30_000`).
2. **Concurrency De-duplication:**
   When multiple concurrent analytical queries require token acquisition simultaneously, `TokenManager` coalesces requests into a single in-flight HTTP promise, preventing authorization server throttling.
3. **Immediate Cache Invalidation on Revocation:**
   Upon receiving an HTTP 401 Unauthorized response from a target enclave, the client immediately invokes `invalidate()`, purging cached credentials and forcing a fresh token acquisition sequence.

---

## 6. Tokenless CI/CD Infrastructure & Supply Chain Provenance

### 6.1 OpenID Connect (OIDC) Publishing Model

Located in `.github/workflows/ci.yml`.

To eliminate supply chain credential compromise, static registry tokens (`NPM_TOKEN`) are strictly prohibited in repository secrets and pipeline environments.

```
 [ GitHub Actions Runner ]
            │
            │ 1. Requests OIDC ID token with permissions: id-token: write
            ▼
 [ GitHub Actions OIDC Provider ]
            │
            │ 2. Issues cryptographically signed OIDC token
            ▼
 [ npmjs.com Trusted Publisher Gate ]
            │
            │ 3. Verifies repository, branch, and workflow identity
            ▼
 [ Package Published with SLSA Level 3 Provenance ]
```

### 6.2 Pipeline Hardening Controls

- **StepSecurity `harden-runner`:**
  Every GitHub Actions workflow step enforces outbound network egress monitoring and blocklists unapproved external endpoints.
- **Full Action Pinning:**
  All GitHub Actions dependencies are pinned to immutable 40-character commit SHAs rather than mutable semver tags.
- **SLSA Level 3 Build Provenance:**
  All releases are signed with `--provenance`, linking published packages cryptographically to the exact commit and runner environment on GitHub.

---

## 7. Static Repository Audit & Secret Hygiene Verification

A comprehensive static audit was performed across the complete repository git history and tracked files using automated pattern matching.

### 7.1 Verified Patterns & Audit Results

| Audit Pattern | Target Asset | Findings | Compliance Status |
|---|---|---|---|
| `BEGIN RSA/EC/OPENSSH PRIVATE KEY` | Private certificate keys | 0 Real Keys (1 synthetic unit test fixture) | Clean / Compliant |
| `aws_secret_access_key` / `AWS_SECRET` | Cloud provider credentials | 0 Hardcoded Secrets (docs references only) | Clean / Compliant |
| `ghp_[a-zA-Z0-9]{36}` | GitHub Personal Access Tokens | 0 Real Tokens | Clean / Compliant |
| `.env`, `.env.*` | Local environment variables | Excluded via `.gitignore` (`!.env.example` preserved) | Clean / Compliant |
| `*.pem`, `*.key` | Production certificates | Excluded via `.gitignore` | Clean / Compliant |

### 7.2 Developer Commit Guardrail

All local commits must be cryptographically signed using GPG key `8D059D30C3259BB481A58A9C74FB2EB1DEE28F9B` (`git commit -S`). Commits lacking verified signatures are rejected by repository branch protection rules.
