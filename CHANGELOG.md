# Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.5.0-beta.2](https://github.com/Nekzus/LIOP/compare/v2.5.0-beta.1...v2.5.0-beta.2) (2026-09-22)


### Bug Fixes

* **audit:** harden docker entrypoint wrapper and declare default CMD for test runner ([4e146db](https://github.com/Nekzus/LIOP/commit/4e146db70911aed1a0df922984903a3389e38e54))
* **audit:** scope GatewayInterceptor to perimeter nexus gateway to allow enclave test suites to pass ([0a38c39](https://github.com/Nekzus/LIOP/commit/0a38c393d405a410384ff2f71532ae805b672276))
* **client:** adaptive OAuth 2.1 M2M token auto-refresh and resilient intent negotiation ([16257c7](https://github.com/Nekzus/LIOP/commit/16257c7d3e87c5db6db3cf760b7386801c02b0b8))
* **deps:** override browserslist to >=4.28.7 resolving GHSA-c83g-rgw3-j3cx and GHSA-73wf-gq98-2v4g ([e6cbf0c](https://github.com/Nekzus/LIOP/commit/e6cbf0c22f78dbdea0826dd81ee8d77473f60773))
* **deps:** update overrides to eliminate all vulnerabilities and clean prometheus targets ([5b810dd](https://github.com/Nekzus/LIOP/commit/5b810dd368a754a28e135eaa52d538e61a091bce))
* **docs:** set explicit dimensions and solid backgrounds on log-audit SVGs ([2787644](https://github.com/Nekzus/LIOP/commit/2787644ddd3ac724706370e5753f43ff4e374928))
* **liop-studio:** enforce radical zero-trust offline network transparency and eliminate fallback mocks ([1a3d22d](https://github.com/Nekzus/LIOP/commit/1a3d22d7d161d1ea3dacef620dcd31da678ec50f))
* **playground:** eliminate hardcoded node counts and synchronize dynamic topology stats ([743205a](https://github.com/Nekzus/LIOP/commit/743205a07342528c3d27d02fb3a06aa8aa4cf335))
* **protocol:** enforce RFC 8785 JCS canonicalization and streaming manifest resolution ([aa1d36e](https://github.com/Nekzus/LIOP/commit/aa1d36ee6fce8d7b140de47f61bac74d8b5b2e33))
* **sdk:** export logger from root index and dynamically resolve in nexus entrypoint ([aa7f327](https://github.com/Nekzus/LIOP/commit/aa7f3274bb97a81d3b20d282e7ef2caa1614e770))
* **server:** resolve decryptedPayload reference for input token measurement in executeLogic ([e72527c](https://github.com/Nekzus/LIOP/commit/e72527cc32e5b760b36614f4e0e9587e7c2e27eb))
* **studio-ui:** guard telemetry rendering and inject bandwidth metrics across all transports ([7aebf87](https://github.com/Nekzus/LIOP/commit/7aebf87f0ca89a569c078b3772847af84bf91009))
* **studio:** implement genuine ML-KEM-768 encapsulation and AES-256-GCM sealing for gRPC transport ([5478ce1](https://github.com/Nekzus/LIOP/commit/5478ce18c07952285587e13746a53e1d77ea7eea))
* **studio:** package ui dist and resolve absolute static root for npx ([bedf739](https://github.com/Nekzus/LIOP/commit/bedf739dc0ef4e72f4742536c49c63646dda7b22))
* **studio:** relocate ignoreDeprecations to tsup config resolving IDE schema validation ([c34a408](https://github.com/Nekzus/LIOP/commit/c34a4084ebacc8cdffbfb7ca8d8b3cce2732260d))
* **studio:** resolve node types in tsconfig and explicitly import process across modules ([0068b31](https://github.com/Nekzus/LIOP/commit/0068b31a403ea2b03bfe77df6cf2e54d39ddd32d))
* **studio:** stabilize UI network polling dependencies and deterministic template routing ([0cc91db](https://github.com/Nekzus/LIOP/commit/0cc91dbd731b011980ff1a849866be25fa98dcfa))
* **studio:** synchronize active connected target and auto-route template capabilities ([1e73af1](https://github.com/Nekzus/LIOP/commit/1e73af1bde607570b2690834ef0f1b49842c1755))
* **studio:** use pathToFileURL for Windows dynamic ESM loader compatibility ([dc68588](https://github.com/Nekzus/LIOP/commit/dc68588b936f5d684cea13049b6022295fb4604a))


### Features

* **gateway:** implement perimeter admission hook with Jev validation (Phase 222) ([810047d](https://github.com/Nekzus/LIOP/commit/810047d1a9ed1ebbcb5b1f258976be27f251bcdb))
* **interceptors:** implement LogInterceptor and AuditInterceptor protocol-level hooks with TypeSafe Jev validation ([952421d](https://github.com/Nekzus/LIOP/commit/952421d5454b83cb62c2f41a993a8371d51f7764))
* **mesh:** implement adaptive topology runtime, dual-era mcp v2 and pnet enclave architecture ([8509716](https://github.com/Nekzus/LIOP/commit/85097168cf0695203faad596d15d97956c35d072))
* **observability:** deploy enterprise telemetry stack, wire egress tracking, and cluster stabilization ([de35cdf](https://github.com/Nekzus/LIOP/commit/de35cdf2cd535bd498ff4d1c701c04f4ff708225))
* **observability:** instrument token savings, role labels, full mesh interceptors, and data sovereignty panel ([d595f2e](https://github.com/Nekzus/LIOP/commit/d595f2ef28d7a0ce3ec5993eebe0d264e3c47ac0))
* **playground:** integrate AST fuel, token economy telemetry, and contrast themes ([fcfecb3](https://github.com/Nekzus/LIOP/commit/fcfecb32a552193e0ad8dfdc068543628289c7f7)), closes [#000000](https://github.com/Nekzus/LIOP/issues/000000) [#0f172a](https://github.com/Nekzus/LIOP/issues/0f172a)
* **rpc:** add granular TLS options and warning suppression for local and studio targets ([4c606f8](https://github.com/Nekzus/LIOP/commit/4c606f86db522aac94dcf2b5a3e96fab094c5ce7))
* **sdk:** public mesh introspection getters and unsafe cast elimination ([0c66cb9](https://github.com/Nekzus/LIOP/commit/0c66cb9f8639cde7b5cceae84ec7baef41e78e20))
* **studio:** comprehensive audit, codemirror 6 editor, and public mesh getters ([b34a97a](https://github.com/Nekzus/LIOP/commit/b34a97a1d0ff5b5d1accd52da7eedcc17aae36aa))
* **studio:** comprehensive audit, codemirror 6 editor, session telemetry and persistent history ([ef9dda0](https://github.com/Nekzus/LIOP/commit/ef9dda015078ebc203caca8924ef6cc784ff1c40))
* **studio:** contextual node capability resolution and domain discrimination in gRPC transport ([c869785](https://github.com/Nekzus/LIOP/commit/c869785c95af6b8f2573c92174c20530c69e69f3))
* **studio:** distill UI with impeccable standards, pure live telemetry, and zero AI slop ([f44b0fc](https://github.com/Nekzus/LIOP/commit/f44b0fcf805c74eca50541641066a129ac5bc596))
* **studio:** dynamic server scan node discovery and proactive template domain guards ([b35a048](https://github.com/Nekzus/LIOP/commit/b35a048e14c7d3dbee818889792d5c4d7bb836a8))
* **studio:** enterprise observability and sovereignty cockpit architecture ([67eeba3](https://github.com/Nekzus/LIOP/commit/67eeba33fc7039d547388a0c9a7d66d620620891))
* **studio:** implement sovereign liop-studio package with multi-transport architecture ([64e9a2d](https://github.com/Nekzus/LIOP/commit/64e9a2de19914b50d6a390da439d3ed68fb0c642))
* **studio:** sovereignty dj command deck and dual persona showcase architecture ([c0636eb](https://github.com/Nekzus/LIOP/commit/c0636ebae26f592933709518242a293f5b3a1c96))
* **studio:** transform into developer workbench with schema inspector, code exporter, ast validator, and 4-tab debug console (Phase 196) ([87fc644](https://github.com/Nekzus/LIOP/commit/87fc644b239f6ae031bae0b041c53cbb56bdbbb0))

# [2.5.0-beta.1](https://github.com/Nekzus/LIOP/compare/v2.4.1-beta.6...v2.5.0-beta.1) (2026-09-01)


### Bug Fixes

* **deps:** bump lodash override to >=4.18.1 for CVE-2026-4800 remediation ([62bffb3](https://github.com/Nekzus/LIOP/commit/62bffb35deac3eaf9e36e0e4ba828af703bb2390))


### Features

* **llm:** implement full llms.txt standard, agent context files and GEO metadata ([5181ba0](https://github.com/Nekzus/LIOP/commit/5181ba0c482628e9706817a642c4ad9507dd4298))

## [2.4.1-beta.6](https://github.com/Nekzus/LIOP/compare/v2.4.1-beta.5...v2.4.1-beta.6) (2026-08-31)


### Bug Fixes

* **security:** upgrade wasmtime and wasmtime-wasi to 48.0.1 in liop-node to resolve 17 Dependabot advisories ([7e98fb3](https://github.com/Nekzus/LIOP/commit/7e98fb35fa9d430540401bc6da74bd31efc57f77))
* **deps:** restore pure ESM lodash-es >=4.17.21 for semantic-release compatibility ([db1141b](https://github.com/Nekzus/LIOP/commit/db1141bab4a8b33b87fc6b9d1451cc59649a5bbb))

## [2.4.1-beta.5](https://github.com/Nekzus/LIOP/compare/v2.4.1-beta.4...v2.4.1-beta.5) (2026-08-30)


### Bug Fixes

* **security:** upgrade wasmtime and wasmtime-wasi to 48.0.1 in liop-node to resolve 17 Dependabot advisories ([7e98fb3](https://github.com/Nekzus/LIOP/commit/7e98fb35fa9d430540401bc6da74bd31efc57f77))

## [2.4.1-beta.4](https://github.com/Nekzus/LIOP/compare/v2.4.1-beta.3...v2.4.1-beta.4) (2026-08-29)


### Bug Fixes

* **deps:** bump lodash override to >=4.18.1 for CVE-2026-4800 remediation ([c2dc3bd](https://github.com/Nekzus/LIOP/commit/c2dc3bd5be41b69779d33933019299ebfc0e14b3))
* **deps:** map lodash-es to lodash >=4.18.1 and add dependabot configuration ([3e53097](https://github.com/Nekzus/LIOP/commit/3e53097ec3b2f0f34e9a8de374b9e52f536dda73))
* **deps:** restore pure ESM lodash-es >=4.17.21 for semantic-release compatibility ([2673b58](https://github.com/Nekzus/LIOP/commit/2673b58b9362c69a6919ae0ead610d0cee2984ba))

## [2.4.1-beta.3](https://github.com/Nekzus/LIOP/compare/v2.4.1-beta.2...v2.4.1-beta.3) (2026-08-29)


### Bug Fixes

* **deps:** bump lodash override to >=4.18.1 for CVE-2026-4800 remediation ([e2d830b](https://github.com/Nekzus/LIOP/commit/e2d830b58e9ff9b9263711507cb10735b2867b10))

## [2.4.1-beta.2](https://github.com/Nekzus/LIOP/compare/v2.4.1-beta.1...v2.4.1-beta.2) (2026-08-29)


### Bug Fixes

* **security:** resolve CodeQL CWE-915 prototype-polluting assignment in resetFieldBudget ([714acc6](https://github.com/Nekzus/LIOP/commit/714acc6b8b91e4f8fda5684daa37b8e6284530df))
* **security:** resolve Dependabot vulnerabilities via workspace overrides and wasmtime update ([a662006](https://github.com/Nekzus/LIOP/commit/a662006c977489d49fd050599a37d659d6bf8c4e))

## [2.4.1-beta.1](https://github.com/Nekzus/LIOP/compare/v2.4.0...v2.4.1-beta.1) (2026-08-29)


### Bug Fixes

* **security:** resolve CodeQL CWE-915 prototype-polluting assignment in resetFieldBudget ([4816003](https://github.com/Nekzus/LIOP/commit/4816003177cd6aca6d9b1fed9a0aaf1e09b0024c))

# [2.1.0-beta.6](https://github.com/Nekzus/LIOP/compare/v2.1.0-beta.5...v2.1.0-beta.6) (2026-08-29)

### Bug Fixes

* **ci:** eliminate cert-manager test race condition and sync PR workflow triggers ([10c43d2](https://github.com/Nekzus/LIOP/commit/10c43d26048fbcd99b0d22644bf4dbebb5a3f803))
* **deps:** synchronize pnpm-lock.yaml for devDependencies gpt-tokenizer migration ([64fb550](https://github.com/Nekzus/LIOP/commit/64fb550f7d5fa056b35fc9198530b8094540b005))
* **metrics:** dynamically update peer count and manifest cache size on /metrics export ([76dd258](https://github.com/Nekzus/LIOP/commit/76dd2589a5f1011f8895fd8a2a5c73637600cde4))
* **playground:** enforce dark input styling without contrast leaks and localize all code/frontend text to English ([36ae520](https://github.com/Nekzus/LIOP/commit/36ae5204a024ae143cec4639a2e8be3cdc2366f3))
* **playground:** resolve intermittent routing failures, adopt official logo/favicon, dynamic version and zero layout shift ([0d89d15](https://github.com/Nekzus/LIOP/commit/0d89d15fa11072d79f38be9e0b0b084df784eb20))
* **security:** resolve audit vulnerabilities and guard offline test in docker-mesh-live ([8c8684a](https://github.com/Nekzus/LIOP/commit/8c8684a5d913c85b823bea82da69790ebda3f0d8))


### Features

* **gateway:** implement dual-era MCP v2 specification and agent guardrails ([9bb47f6](https://github.com/Nekzus/LIOP/commit/9bb47f6485924de89090c6b2c9407dd112635f37))
* **license:** trigger Apache-2.0 package release with legal and trademark updates ([7b8b5a3](https://github.com/Nekzus/LIOP/commit/7b8b5a36c5e35d405f43ff0b0fd8ca55df1fb5fa))
* **mesh:** harden network connectivity and resilience for global distributed deployment ([5abe8cd](https://github.com/Nekzus/LIOP/commit/5abe8cd3af4c3af32b9669223781f11083f5d51b))
* **mesh:** integrate ML-DSA-65 manifest attestation, docker tokens, and optimize crossnet execution ([31424a6](https://github.com/Nekzus/LIOP/commit/31424a6f9b30f4b9843a6375bfd48abadc6d22cd))
* **observability:** implement Phase Beta-3 metrics, K8s probes, audit logger, and tracing ([135f136](https://github.com/Nekzus/LIOP/commit/135f136f438919e51cd1c3d32e890a048d7ed3d7))
* **playground:** add web playground, e2e client tests, and integrate graphify assistant tools ([7a6f790](https://github.com/Nekzus/LIOP/commit/7a6f79020e946daef70f6cc1436d2a47687d516b))
* **playground:** free-standing logo without container card, active tool cards, reset feedback, and search clear ([266724e](https://github.com/Nekzus/LIOP/commit/266724e6a1d2d0702e109eb03d7aeb7eb11fbdf4))
* **playground:** implement impeccable dual dark mode and cryptographic inspector ([62d1524](https://github.com/Nekzus/LIOP/commit/62d1524166260742045db3913851ecd8e69d0a3a))
* **playground:** implement sliding indicator animation with framer-motion and eliminate text jumping across all tab bars ([3772f9e](https://github.com/Nekzus/LIOP/commit/3772f9eed787078ae4e0ffbf711837eef3cb019d))
* **security:** implement Phase Beta-2 advanced security, post-quantum signatures, and firewall resilience ([56dfc7a](https://github.com/Nekzus/LIOP/commit/56dfc7ad993ae467c0cb4913122a9286aedcc935))


### Performance Improvements

* **economy:** inline o200k_base tokenizer and reduce package footprint ([1241cd6](https://github.com/Nekzus/LIOP/commit/1241cd60c8ac588b5dc21d5348ed1cc4972ec48c))
* **economy:** merge inlined o200k_base tokenizer optimization into alpha ([f9531b4](https://github.com/Nekzus/LIOP/commit/f9531b4cb25451b9f11397e6ee3d0306033bdc8c))
* **playground:** optimize latency to <500ms and revamp ui with impeccable craft-floor ([062a32c](https://github.com/Nekzus/LIOP/commit/062a32cd65ac358c3f187c201ebca50567b9acd9))


# [2.1.0-beta.5](https://github.com/Nekzus/LIOP/compare/v2.1.0-beta.4...v2.1.0-beta.5) (2026-06-05)
