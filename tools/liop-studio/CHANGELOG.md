# LIOP Studio Changelog

All notable changes to @nekzus/liop-studio will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-alpha.18](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.17...studio-v1.0.0-alpha.18) (2026-09-24)


### Bug Fixes

* **types:** declare ambient module for optional @nekzus/liop-zk-native ([8359dd6](https://github.com/Nekzus/LIOP/commit/8359dd63bd63e125b3d039349b20ea290ccecbb4))


### Features

* **proto:** evolve liop_core.proto with ProofMode and ProofType enums ([9c01468](https://github.com/Nekzus/LIOP/commit/9c01468895088122b152cf8156324679168bc1c3))
* **server:** enforce ZK_BLOCKING policy and DHT manifest attestation ([6665d39](https://github.com/Nekzus/LIOP/commit/6665d3953d535e4ec85d8837cf5734243db1cd4a))
* **zk-native:** scaffold NAPI crate with R1CS analytical circuits and universal zkVM fallback ([3499bc4](https://github.com/Nekzus/LIOP/commit/3499bc4b1c98f06180ff1c4bb88e245c01f29db3))
* **zk:** complete Phase 1 ZK-VM TypeScript SDK verification engine ([7123f25](https://github.com/Nekzus/LIOP/commit/7123f2539b6dc136f35e114f792f3526c361274b))

# [1.0.0-alpha.17](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.16...studio-v1.0.0-alpha.17) (2026-09-22)


### Bug Fixes

* **ci:** automate Mintlify docs.json version update in semantic-release ([11b91a1](https://github.com/Nekzus/LIOP/commit/11b91a1d209aaed82279e7ba5b8ec8da55383b86))

# [1.0.0-alpha.16](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.15...studio-v1.0.0-alpha.16) (2026-09-22)


### Bug Fixes

* **docs:** resolve npmjs logo CDN paths, sync Mintlify v2.6.0, and automate metadata sync ([17a265a](https://github.com/Nekzus/LIOP/commit/17a265aee72f0ee2184623a886c092f9fe59e01e))

# [1.0.0-alpha.15](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.14...studio-v1.0.0-alpha.15) (2026-09-21)


### Bug Fixes

* **audit:** scope GatewayInterceptor to perimeter nexus gateway to allow enclave test suites to pass ([0a38c39](https://github.com/Nekzus/LIOP/commit/0a38c393d405a410384ff2f71532ae805b672276))

# [1.0.0-alpha.14](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.13...studio-v1.0.0-alpha.14) (2026-09-20)


### Bug Fixes

* **server:** resolve decryptedPayload reference for input token measurement in executeLogic ([e72527c](https://github.com/Nekzus/LIOP/commit/e72527cc32e5b760b36614f4e0e9587e7c2e27eb))


### Features

* **observability:** instrument token savings, role labels, full mesh interceptors, and data sovereignty panel ([d595f2e](https://github.com/Nekzus/LIOP/commit/d595f2ef28d7a0ce3ec5993eebe0d264e3c47ac0))

# [1.0.0-alpha.13](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.12...studio-v1.0.0-alpha.13) (2026-09-20)


### Bug Fixes

* **deps:** update overrides to eliminate all vulnerabilities and clean prometheus targets ([5b810dd](https://github.com/Nekzus/LIOP/commit/5b810dd368a754a28e135eaa52d538e61a091bce))

# [1.0.0-alpha.12](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.11...studio-v1.0.0-alpha.12) (2026-09-20)


### Bug Fixes

* **protocol:** enforce RFC 8785 JCS canonicalization and streaming manifest resolution ([aa1d36e](https://github.com/Nekzus/LIOP/commit/aa1d36ee6fce8d7b140de47f61bac74d8b5b2e33))

# [1.0.0-alpha.11](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.10...studio-v1.0.0-alpha.11) (2026-09-20)


### Bug Fixes

* **docs:** set explicit dimensions and solid backgrounds on log-audit SVGs ([2787644](https://github.com/Nekzus/LIOP/commit/2787644ddd3ac724706370e5753f43ff4e374928))

# [1.0.0-alpha.10](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.9...studio-v1.0.0-alpha.10) (2026-09-20)


### Bug Fixes

* **sdk:** export logger from root index and dynamically resolve in nexus entrypoint ([aa7f327](https://github.com/Nekzus/LIOP/commit/aa7f3274bb97a81d3b20d282e7ef2caa1614e770))

# [1.0.0-alpha.9](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.8...studio-v1.0.0-alpha.9) (2026-09-20)


### Features

* **interceptors:** implement LogInterceptor and AuditInterceptor protocol-level hooks with TypeSafe Jev validation ([952421d](https://github.com/Nekzus/LIOP/commit/952421d5454b83cb62c2f41a993a8371d51f7764))

# [1.0.0-alpha.8](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.7...studio-v1.0.0-alpha.8) (2026-09-19)


### Features

* **gateway:** implement perimeter admission hook with Jev validation (Phase 222) ([810047d](https://github.com/Nekzus/LIOP/commit/810047d1a9ed1ebbcb5b1f258976be27f251bcdb))

# [1.0.0-alpha.7](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.6...studio-v1.0.0-alpha.7) (2026-09-17)


### Features

* **sdk:** public mesh introspection getters and unsafe cast elimination ([0c66cb9](https://github.com/Nekzus/LIOP/commit/0c66cb9f8639cde7b5cceae84ec7baef41e78e20))
* **studio:** comprehensive audit, codemirror 6 editor, and public mesh getters ([b34a97a](https://github.com/Nekzus/LIOP/commit/b34a97a1d0ff5b5d1accd52da7eedcc17aae36aa))
* **studio:** comprehensive audit, codemirror 6 editor, session telemetry and persistent history ([ef9dda0](https://github.com/Nekzus/LIOP/commit/ef9dda015078ebc203caca8924ef6cc784ff1c40))

# [1.0.0-alpha.6](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.5...studio-v1.0.0-alpha.6) (2026-09-15)


### Features

* **rpc:** add granular TLS options and warning suppression for local and studio targets ([4c606f8](https://github.com/Nekzus/LIOP/commit/4c606f86db522aac94dcf2b5a3e96fab094c5ce7))

# [1.0.0-alpha.5](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.4...studio-v1.0.0-alpha.5) (2026-09-15)


### Bug Fixes

* **studio:** stabilize UI network polling dependencies and deterministic template routing ([0cc91db](https://github.com/Nekzus/LIOP/commit/0cc91dbd731b011980ff1a849866be25fa98dcfa))

# [1.0.0-alpha.4](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.3...studio-v1.0.0-alpha.4) (2026-09-14)


### Bug Fixes

* **studio:** synchronize active connected target and auto-route template capabilities ([1e73af1](https://github.com/Nekzus/LIOP/commit/1e73af1bde607570b2690834ef0f1b49842c1755))

# [1.0.0-alpha.3](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.2...studio-v1.0.0-alpha.3) (2026-09-14)


### Bug Fixes

* **studio:** package ui dist and resolve absolute static root for npx ([bedf739](https://github.com/Nekzus/LIOP/commit/bedf739dc0ef4e72f4742536c49c63646dda7b22))

# [1.0.0-alpha.2](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0-alpha.1...studio-v1.0.0-alpha.2) (2026-09-14)
