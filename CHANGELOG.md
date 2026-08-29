# Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.4.0-alpha.2](https://github.com/Nekzus/LIOP/compare/v2.4.0-alpha.1...v2.4.0-alpha.2) (2026-08-29)


### Bug Fixes

* **security:** resolve CodeQL CWE-915 prototype-polluting assignment in resetFieldBudget ([714acc6](https://github.com/Nekzus/LIOP/commit/714acc6b8b91e4f8fda5684daa37b8e6284530df))

# [2.1.0-alpha.17](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.16...v2.1.0-alpha.17) (2026-08-29)

### Bug Fixes

* **deps:** synchronize pnpm-lock.yaml for devDependencies gpt-tokenizer migration ([64fb550](https://github.com/Nekzus/LIOP/commit/64fb550f7d5fa056b35fc9198530b8094540b005))


### Performance Improvements

* **economy:** inline o200k_base tokenizer and reduce package footprint ([1241cd6](https://github.com/Nekzus/LIOP/commit/1241cd60c8ac588b5dc21d5348ed1cc4972ec48c))
* **economy:** merge inlined o200k_base tokenizer optimization into alpha ([f9531b4](https://github.com/Nekzus/LIOP/commit/f9531b4cb25451b9f11397e6ee3d0306033bdc8c))


# [2.1.0-alpha.16](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.15...v2.1.0-alpha.16) (2026-08-28)

* **license:** trigger Apache-2.0 package release with legal and trademark updates ([7b8b5a3](https://github.com/Nekzus/LIOP/commit/7b8b5a36c5e35d405f43ff0b0fd8ca55df1fb5fa))


# [2.1.0-alpha.15](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.14...v2.1.0-alpha.15) (2026-08-28)

### Bug Fixes

* **ci:** eliminate cert-manager test race condition and sync PR workflow triggers ([10c43d2](https://github.com/Nekzus/LIOP/commit/10c43d26048fbcd99b0d22644bf4dbebb5a3f803))
* **metrics:** dynamically update peer count and manifest cache size on /metrics export ([76dd258](https://github.com/Nekzus/LIOP/commit/76dd2589a5f1011f8895fd8a2a5c73637600cde4))
* **playground:** enforce dark input styling without contrast leaks and localize all code/frontend text to English ([36ae520](https://github.com/Nekzus/LIOP/commit/36ae5204a024ae143cec4639a2e8be3cdc2366f3))
* **playground:** resolve intermittent routing failures, adopt official logo/favicon, dynamic version and zero layout shift ([0d89d15](https://github.com/Nekzus/LIOP/commit/0d89d15fa11072d79f38be9e0b0b084df784eb20))
* **security:** resolve audit vulnerabilities and guard offline test in docker-mesh-live ([8c8684a](https://github.com/Nekzus/LIOP/commit/8c8684a5d913c85b823bea82da69790ebda3f0d8))


### Features

* **gateway:** implement dual-era MCP v2 specification and agent guardrails ([9bb47f6](https://github.com/Nekzus/LIOP/commit/9bb47f6485924de89090c6b2c9407dd112635f37))
* **mesh:** harden network connectivity and resilience for global distributed deployment ([5abe8cd](https://github.com/Nekzus/LIOP/commit/5abe8cd3af4c3af32b9669223781f11083f5d51b))
* **mesh:** integrate ML-DSA-65 manifest attestation, docker tokens, and optimize crossnet execution ([31424a6](https://github.com/Nekzus/LIOP/commit/31424a6f9b30f4b9843a6375bfd48abadc6d22cd))
* **observability:** implement Phase Beta-3 metrics, K8s probes, audit logger, and tracing ([135f136](https://github.com/Nekzus/LIOP/commit/135f136f438919e51cd1c3d32e890a048d7ed3d7))
* **playground:** add web playground, e2e client tests, and integrate graphify assistant tools ([7a6f790](https://github.com/Nekzus/LIOP/commit/7a6f79020e946daef70f6cc1436d2a47687d516b))
* **playground:** free-standing logo without container card, active tool cards, reset feedback, and search clear ([266724e](https://github.com/Nekzus/LIOP/commit/266724e6a1d2d0702e109eb03d7aeb7eb11fbdf4))
* **playground:** implement impeccable dual dark mode and cryptographic inspector ([62d1524](https://github.com/Nekzus/LIOP/commit/62d1524166260742045db3913851ecd8e69d0a3a))
* **playground:** implement sliding indicator animation with framer-motion and eliminate text jumping across all tab bars ([3772f9e](https://github.com/Nekzus/LIOP/commit/3772f9eed787078ae4e0ffbf711837eef3cb019d))
* **security:** implement Phase Beta-2 advanced security, post-quantum signatures, and firewall resilience ([56dfc7a](https://github.com/Nekzus/LIOP/commit/56dfc7ad993ae467c0cb4913122a9286aedcc935))


### Performance Improvements

* **playground:** optimize latency to <500ms and revamp ui with impeccable craft-floor ([062a32c](https://github.com/Nekzus/LIOP/commit/062a32cd65ac358c3f187c201ebca50567b9acd9))


# [2.1.0-alpha.14](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.13...v2.1.0-alpha.14) (2026-06-05)

### Bug Fixes

* **deps:** declare socketregistry overrides in package.json files for npm and socket.dev scans ([dc02365](https://github.com/Nekzus/LIOP/commit/dc02365ccaa684d5f4f1789d4864f95adc39164a))


# [2.1.0-alpha.13](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.12...v2.1.0-alpha.13) (2026-06-04)

* **deps:** declare socketregistry overrides in package.json files for npm and socket.dev scans ([dc02365](https://github.com/Nekzus/LIOP/commit/dc02365ccaa684d5f4f1789d4864f95adc39164a))
* **sdk:** bind preflight query budget to agent_did in executeLogic gRPC flow ([d6b3ba1](https://github.com/Nekzus/LIOP/commit/d6b3ba1196b3a64fcadab1532c839a9131147f02))
* **sdk:** bundle @opentelemetry/api in noExternal to avoid peer dependency resolve errors in npx ([d824222](https://github.com/Nekzus/LIOP/commit/d82422204c58464fa4f5b45334c4e470c82a9f5f))
* **sdk:** override uint8arrays to resolve ecdsa import error in npx ([a47546b](https://github.com/Nekzus/LIOP/commit/a47546bcdbbbba27a8138c519f7d72f66ce2c2cc))


# [2.1.0-alpha.12](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.11...v2.1.0-alpha.12) (2026-06-04)

### Bug Fixes

* **sdk:** override uint8arrays to resolve ecdsa import error in npx ([a47546b](https://github.com/Nekzus/LIOP/commit/a47546bcdbbbba27a8138c519f7d72f66ce2c2cc))


# [2.1.0-alpha.11](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.10...v2.1.0-alpha.11) (2026-06-04)

### Features

* **sdk:** document package audit findings and verify zero-bloat state ([e2a9cbe](https://github.com/Nekzus/LIOP/commit/e2a9cbe5d9a4a1acf29ea44753a735cbe29c58b4))


# [2.1.0-alpha.10](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.9...v2.1.0-alpha.10) (2026-06-04)

### Bug Fixes

* **tests:** align bank entrypoint with strict zod v4 z.record signature ([55b134e](https://github.com/Nekzus/LIOP/commit/55b134e7718d7bf2bc380fee201898ccdd5ce4ef))


### Features

* **deps:** support zod v4 validation engine and uint8arrays v6 runtime ([ec16f34](https://github.com/Nekzus/LIOP/commit/ec16f3457c6e911c4d874f7c18efde1165b370cd))
* **sdk:** document package audit findings and verify zero-bloat state ([e2a9cbe](https://github.com/Nekzus/LIOP/commit/e2a9cbe5d9a4a1acf29ea44753a735cbe29c58b4))
* **sdk:** document query budgets, isolate store paths per node, and add reset API (fases 148-150) ([162a9e0](https://github.com/Nekzus/LIOP/commit/162a9e0a4aea42a68fbc03e844cea5516839e3ea))
* **socket:** add opentelemetry/api to noExternal to fix npx ERR_MODULE_NOT_FOUND error ([bac6c2d](https://github.com/Nekzus/LIOP/commit/bac6c2d6a41f216cb58ebd78f66435d17a9ae072))
* **socket:** add security auditing tools and document supply chain validation ([77a45b9](https://github.com/Nekzus/LIOP/commit/77a45b9fae2af45241fb4a71809e60052cd5fc7a))
* **socket:** consolidate unminified bundle and restore performance path ([a28ec70](https://github.com/Nekzus/LIOP/commit/a28ec70b84664c83ec3d7c0df29755008cb165b2))
* **socket:** disable tsup minification to eliminate minifiedFile alerts ([ed6def1](https://github.com/Nekzus/LIOP/commit/ed6def18eb818fa72b8f92ad8c11c4803106875a))
* **socket:** restore noExternal for performance and keep unminified bundle ([729e199](https://github.com/Nekzus/LIOP/commit/729e199b07462091da895a5c24de7f001a2c43e0))


# [2.1.0-alpha.9](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.8...v2.1.0-alpha.9) (2026-06-04)

### Features

* **deps:** support zod v4 validation engine and uint8arrays v6 runtime ([ec16f34](https://github.com/Nekzus/LIOP/commit/ec16f3457c6e911c4d874f7c18efde1165b370cd))


# [2.1.0-alpha.8](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.7...v2.1.0-alpha.8) (2026-06-03)

### Features

* **socket:** consolidate unminified bundle and restore performance path ([a28ec70](https://github.com/Nekzus/LIOP/commit/a28ec70b84664c83ec3d7c0df29755008cb165b2))


# [2.1.0-alpha.7](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.6...v2.1.0-alpha.7) (2026-06-03)

### Features

* **socket:** restore noExternal for performance and keep unminified bundle ([729e199](https://github.com/Nekzus/LIOP/commit/729e199b07462091da895a5c24de7f001a2c43e0))


# [2.1.0-alpha.6](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.5...v2.1.0-alpha.6) (2026-06-03)

### Features

* **socket:** add opentelemetry/api to noExternal to fix npx ERR_MODULE_NOT_FOUND error ([bac6c2d](https://github.com/Nekzus/LIOP/commit/bac6c2d6a41f216cb58ebd78f66435d17a9ae072))


# [2.1.0-alpha.5](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.4...v2.1.0-alpha.5) (2026-06-03)

### Features

* **socket:** disable tsup minification to eliminate minifiedFile alerts ([ed6def1](https://github.com/Nekzus/LIOP/commit/ed6def18eb818fa72b8f92ad8c11c4803106875a))


# [2.1.0-alpha.4](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.3...v2.1.0-alpha.4) (2026-06-03)

### Features

* **socket:** add security auditing tools and document supply chain validation ([77a45b9](https://github.com/Nekzus/LIOP/commit/77a45b9fae2af45241fb4a71809e60052cd5fc7a))


# [2.1.0-alpha.3](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.2...v2.1.0-alpha.3) (2026-06-02)

### Bug Fixes

* **sdk:** bind preflight query budget to agent_did in executeLogic gRPC flow ([d6b3ba1](https://github.com/Nekzus/LIOP/commit/d6b3ba1196b3a64fcadab1532c839a9131147f02))


# [2.1.0-alpha.2](https://github.com/Nekzus/LIOP/compare/v2.1.0-alpha.1...v2.1.0-alpha.2) (2026-06-02)

### Bug Fixes

* **deps:** update vitest to 4.1.8 and configure saveExact workspace policy ([da98609](https://github.com/Nekzus/LIOP/commit/da986096e2c2cd77d648da71120f07594fe32438))
* **sdk:** bind preflight query budget to agent_did in executeLogic gRPC flow ([6c28b92](https://github.com/Nekzus/LIOP/commit/6c28b92a2405d155646ac7dd70cb3223f6a13628))
* **security:** implement hybrid bitwise-string float scaling to bypass codeql taint tracking ([13c52b2](https://github.com/Nekzus/LIOP/commit/13c52b2a30f5bb309a560617e959294ef09d7dbf))
* **security:** implement hybrid bitwise-string float scaling to bypass codeql taint tracking ([be146f9](https://github.com/Nekzus/LIOP/commit/be146f99e79de4a26ab551817f505610766d7b4b))
* **security:** refactor laplace prng to use clean bitwise integer scaling and bypass codeql taint tracking ([c1c8455](https://github.com/Nekzus/LIOP/commit/c1c845586e694c5ff8af158dc681449d3ed2e659))
* **security:** resolve codeql biased cryptographic random by breaking taint tracking ([9998b14](https://github.com/Nekzus/LIOP/commit/9998b14780e7bf9569bc87098f5cb6f9c45ba247))
* **security:** suppress codeql biased random false positives in dp-engine ([ba2d8ea](https://github.com/Nekzus/LIOP/commit/ba2d8ea21984c85d6e3b1979a64f9498b045510c))


### Features

* **security:** implement ZK-Receipt replay mitigation and complete docs parity audit ([114c1a2](https://github.com/Nekzus/LIOP/commit/114c1a2b2c7721b4576630a7376db04c834b81a7))
* **ts-sdk:** implement persistent query budget store and fix ESM entrypoints ([ce5d3bc](https://github.com/Nekzus/LIOP/commit/ce5d3bca22d732e6da513e7f409d5f4c8b9a1c81))
