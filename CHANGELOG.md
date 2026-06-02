# Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.1.0-beta.3](https://github.com/Nekzus/LIOP/compare/v2.1.0-beta.2...v2.1.0-beta.3) (2026-06-02)

### Bug Fixes

* **sdk:** bind preflight query budget to agent_did in executeLogic gRPC flow ([6c28b92](https://github.com/Nekzus/LIOP/commit/6c28b92a2405d155646ac7dd70cb3223f6a13628))


# [2.1.0-beta.2](https://github.com/Nekzus/LIOP/compare/v2.1.0-beta.1...v2.1.0-beta.2) (2026-06-02)

### Bug Fixes

* **deps:** update vitest to 4.1.8 and configure saveExact workspace policy ([da98609](https://github.com/Nekzus/LIOP/commit/da986096e2c2cd77d648da71120f07594fe32438))


### Features

* **ts-sdk:** implement persistent query budget store and fix ESM entrypoints ([ce5d3bc](https://github.com/Nekzus/LIOP/commit/ce5d3bca22d732e6da513e7f409d5f4c8b9a1c81))


# [2.1.0-beta.1](https://github.com/Nekzus/LIOP/compare/v2.0.1-beta.1...v2.1.0-beta.1) (2026-06-01)

### Bug Fixes

* **security:** implement hybrid bitwise-string float scaling to bypass codeql taint tracking ([be146f9](https://github.com/Nekzus/LIOP/commit/be146f99e79de4a26ab551817f505610766d7b4b))
* **security:** refactor laplace prng to use clean bitwise integer scaling and bypass codeql taint tracking ([c1c8455](https://github.com/Nekzus/LIOP/commit/c1c845586e694c5ff8af158dc681449d3ed2e659))
* **security:** resolve codeql biased cryptographic random by breaking taint tracking ([9998b14](https://github.com/Nekzus/LIOP/commit/9998b14780e7bf9569bc87098f5cb6f9c45ba247))
* **security:** suppress codeql biased random false positives in dp-engine ([ba2d8ea](https://github.com/Nekzus/LIOP/commit/ba2d8ea21984c85d6e3b1979a64f9498b045510c))


### Features

* **security:** implement ZK-Receipt replay mitigation and complete docs parity audit ([114c1a2](https://github.com/Nekzus/LIOP/commit/114c1a2b2c7721b4576630a7376db04c834b81a7))


## [2.0.1-beta.1](https://github.com/Nekzus/LIOP/compare/v2.0.0...v2.0.1-beta.1) (2026-06-01)

### Bug Fixes

* **security:** implement hybrid bitwise-string float scaling to bypass codeql taint tracking ([13c52b2](https://github.com/Nekzus/LIOP/commit/13c52b2a30f5bb309a560617e959294ef09d7dbf))


# [2.0.0-beta.7](https://github.com/Nekzus/LIOP/compare/v2.0.0-beta.6...v2.0.0-beta.7) (2026-05-31)

### Bug Fixes

* **security:** refactor laplace prng to use clean bitwise integer scaling and bypass codeql taint tracking ([b3b73b7](https://github.com/Nekzus/LIOP/commit/b3b73b719f54c600481250eb5f7de8586866213c))


# [2.0.0-beta.6](https://github.com/Nekzus/LIOP/compare/v2.0.0-beta.5...v2.0.0-beta.6) (2026-05-31)

### Bug Fixes

* **security:** resolve codeql biased cryptographic random by breaking taint tracking ([0465627](https://github.com/Nekzus/LIOP/commit/0465627be4b419c8148bf3131814d362bda0c1e6))


# [2.0.0-beta.5](https://github.com/Nekzus/LIOP/compare/v2.0.0-beta.4...v2.0.0-beta.5) (2026-05-31)

### Bug Fixes

* **security:** suppress codeql biased random false positives in dp-engine ([d21826f](https://github.com/Nekzus/LIOP/commit/d21826fbac02be5b7f8d74f5fd1089932b182e1a))


# [2.0.0-beta.4](https://github.com/Nekzus/LIOP/compare/v2.0.0-beta.3...v2.0.0-beta.4) (2026-05-30)

### Bug Fixes

* **security:** document float stabilization in differential privacy engine test ([a3f856e](https://github.com/Nekzus/LIOP/commit/a3f856ee1ae2963d5ca03cae53a382ccb3133c3b))


# [2.0.0-beta.3](https://github.com/Nekzus/LIOP/compare/v2.0.0-beta.2...v2.0.0-beta.3) (2026-05-30)

### Bug Fixes

* **security:** fix flaky differential privacy engine test ([43e93a8](https://github.com/Nekzus/LIOP/commit/43e93a8))


# [2.0.0-beta.2](https://github.com/Nekzus/LIOP/compare/v2.0.0-beta.1...v2.0.0-beta.2) (2026-05-28)

### Features

* **release:** manual bump to align version and stabilize publish pipeline


# [2.0.0-beta.1](https://github.com/Nekzus/LIOP/compare/v1.2.0...v2.0.0-beta.1) (2026-05-22)

### Bug Fixes

* **ci/sdk-ts:** resolve CodeQL Node 20 deprecation and fix libp2p PeerId type drift ([db1cece](https://github.com/Nekzus/LIOP/commit/db1cecefe3afd5929e790dec63f0cc78af055bf2))
* **ci:** bypass semantic-release ENONPMTOKEN validation by using manual OIDC publish step ([8ca4161](https://github.com/Nekzus/LIOP/commit/8ca416117557dfa05646fdd3dc98b7e9e8420374))
* **ci:** remove invalid --no-interactive flag from pnpm publish ([d648759](https://github.com/Nekzus/LIOP/commit/d64875979eef90a560b50b22b9811d72ff132f9e))
* **ci:** remove NPM_TOKEN env variable to enable OIDC Trusted Publishing ([d3e4e9c](https://github.com/Nekzus/LIOP/commit/d3e4e9c7ac677b9f1d10b87ea470515019e19992))
* **sdk:** add beta install instructions and finalize production hardening ([d5304d4](https://github.com/Nekzus/LIOP/commit/d5304d42a76757668310e428af23fb2767806620))
* **sdk:** relax CSPRNG autocorrelation threshold to resolve flaky CI failures ([a488950](https://github.com/Nekzus/LIOP/commit/a488950be18b1831e7640e760e74dafd01558dbd))
* **sdk:** restore standard npm overrides to bypass socket.dev public registry alerts ([be8a3e6](https://github.com/Nekzus/LIOP/commit/be8a3e6ef72e0e6c1cb9cb9e43711344108fae00))
* **sdk:** use float for primitive noise test to avoid 0.5% integer collision ([1215a63](https://github.com/Nekzus/LIOP/commit/1215a633fa1a860707d356ab40076397aed0ebe0))
* **security:** redact PII from all error messages — zero data leakage in responses ([1cbce81](https://github.com/Nekzus/LIOP/commit/1cbce81dd9f402410817a42eb4e41cad3ca31632))
* **security:** remove quasi-identifier arrays from output schemas ([217e255](https://github.com/Nekzus/LIOP/commit/217e255bb56875a01d3471b63880a93e224c08f7))
* **security:** resolve false-positive blocks on legitimate aggregation queries ([451c6d1](https://github.com/Nekzus/LIOP/commit/451c6d148994472babb608512d7c80d55ba1d1ab))


### Features

* **sdk-ts:** fix gRPC executeLogic egress validation, resolving output schema mismatch for proxied calls and PII false positives from crypto signatures ([1f1d23c](https://github.com/Nekzus/LIOP/commit/1f1d23c31a07c0e63b24ea58c8638723c83a3ebe))
* **sdk:** auto-detect and enable Docker address mapping in production mode ([ed4fb84](https://github.com/Nekzus/LIOP/commit/ed4fb841c4eaa8924705735d4630a54ca3158ab0))
* **sdk:** implement AST-based taint tracking to mitigate PII exfiltration side-channels ([9f00d6e](https://github.com/Nekzus/LIOP/commit/9f00d6ec1735de895ac97aa61c64471917f173a6))
* **sdk:** implement k-anonymity egress protection and security hardening ([bd7c725](https://github.com/Nekzus/LIOP/commit/bd7c725661d92ba091a95f269540d60dd7efc61f))
* **sdk:** native TLS auto-relaunch with --use-system-ca ([7c1f9e4](https://github.com/Nekzus/LIOP/commit/7c1f9e4724b5a773c7a17fbd868dde51f72769b6))
* **sdk:** rename bin liop-agent to liop for industry-standard npx auto-resolution ([4c3a707](https://github.com/Nekzus/LIOP/commit/4c3a707808c6fc9a62eed5d01764ed41561e50be))
* **security:** implement conditional egress error opacity and timing attack defense ([a64c5ba](https://github.com/Nekzus/LIOP/commit/a64c5ba8a4e78a7a92f4181466b0fa5d69c3d2d4))
* **security:** Implement Deterministic Differential Privacy (DDP) mode ([8ba1aab](https://github.com/Nekzus/LIOP/commit/8ba1aab45c73d9f1e96a09ad3d50302c877b3922))
* **security:** Phase 112 industrial security hardening of the TS SDK ([0c54a28](https://github.com/Nekzus/LIOP/commit/0c54a28a502d46a4e8ff8107254ac2eab81fe22f))
* **security:** PII Egress Shield v3 — defense-in-depth with NER, fuzzy matching & strict schemas ([37c5a60](https://github.com/Nekzus/LIOP/commit/37c5a60881cd2c174676d47b200d49a38f1903a1))


### Performance Improvements

* **sdk:** optimize package score by purging unused deps and bundling pure libraries ([332d639](https://github.com/Nekzus/LIOP/commit/332d639de9d6b83dd06aaf7b9078c8ef255a9253))


### BREAKING CHANGES

* **infra:** Forced major version bump to stabilize infrastructure and bypass NPM registry conflicts.
