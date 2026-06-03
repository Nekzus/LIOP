# Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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


### Features

* **ts-sdk:** implement persistent query budget store and fix ESM entrypoints ([ce5d3bc](https://github.com/Nekzus/LIOP/commit/ce5d3bca22d732e6da513e7f409d5f4c8b9a1c81))


# [2.1.0-alpha.1](https://github.com/Nekzus/LIOP/compare/v2.0.1-alpha.2...v2.1.0-alpha.1) (2026-06-01)

### Features

* **security:** implement ZK-Receipt replay mitigation and complete docs parity audit ([114c1a2](https://github.com/Nekzus/LIOP/commit/114c1a2b2c7721b4576630a7376db04c834b81a7))


## [2.0.1-alpha.2](https://github.com/Nekzus/LIOP/compare/v2.0.1-alpha.1...v2.0.1-alpha.2) (2026-06-01)

### Bug Fixes

* **security:** implement hybrid bitwise-string float scaling to bypass codeql taint tracking ([be146f9](https://github.com/Nekzus/LIOP/commit/be146f99e79de4a26ab551817f505610766d7b4b))


## [2.0.1-alpha.1](https://github.com/Nekzus/LIOP/compare/v2.0.0...v2.0.1-alpha.1) (2026-06-01)

### Bug Fixes

* **security:** refactor laplace prng to use clean bitwise integer scaling and bypass codeql taint tracking ([c1c8455](https://github.com/Nekzus/LIOP/commit/c1c845586e694c5ff8af158dc681449d3ed2e659))
* **security:** resolve codeql biased cryptographic random by breaking taint tracking ([9998b14](https://github.com/Nekzus/LIOP/commit/9998b14780e7bf9569bc87098f5cb6f9c45ba247))
* **security:** suppress codeql biased random false positives in dp-engine ([ba2d8ea](https://github.com/Nekzus/LIOP/commit/ba2d8ea21984c85d6e3b1979a64f9498b045510c))


# [2.0.0-alpha.33](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.32...v2.0.0-alpha.33) (2026-05-31)

### Bug Fixes

* **security:** refactor laplace prng to use clean bitwise integer scaling and bypass codeql taint tracking ([c1c8455](https://github.com/Nekzus/LIOP/commit/c1c845586e694c5ff8af158dc681449d3ed2e659))


# [2.0.0-alpha.32](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.31...v2.0.0-alpha.32) (2026-05-31)

### Bug Fixes

* **security:** resolve codeql biased cryptographic random by breaking taint tracking ([9998b14](https://github.com/Nekzus/LIOP/commit/9998b14780e7bf9569bc87098f5cb6f9c45ba247))


# [2.0.0-alpha.31](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.30...v2.0.0-alpha.31) (2026-05-31)

### Bug Fixes

* **security:** suppress codeql biased random false positives in dp-engine ([ba2d8ea](https://github.com/Nekzus/LIOP/commit/ba2d8ea21984c85d6e3b1979a64f9498b045510c))


# [2.0.0-alpha.30](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.29...v2.0.0-alpha.30) (2026-05-30)

### Bug Fixes

* **security:** document float stabilization in differential privacy engine test ([a3f856e](https://github.com/Nekzus/LIOP/commit/a3f856ee1ae2963d5ca03cae53a382ccb3133c3b))


# [2.0.0-alpha.29](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.28...v2.0.0-alpha.29) (2026-05-29)

### Features

* **sandbox:** implement recursive null prototype mapping and lock down Host prototypes ([b29cf31](https://github.com/Nekzus/LIOP/commit/b29cf311e3546318a249c0943ad77b427c2d772c))


# [2.0.0-alpha.28](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.27...v2.0.0-alpha.28) (2026-05-29)

### Bug Fixes

* **hft:** implement Market Maker inventory fill tracking and scale down Laplace sensitivity for imbalance metrics ([e286426](https://github.com/Nekzus/LIOP/commit/e286426726b541500afab197c1af9220c0009f46))
* **sdk:** align default audience and resolve M2M token propagation in executeLogic ([6d8898b](https://github.com/Nekzus/LIOP/commit/6d8898bded49c3d3049a6f40eb75f84d20846738))
* **security:** isolate query budget by session token to prevent cross-session budget leaks ([fe28590](https://github.com/Nekzus/LIOP/commit/fe28590cbaf6e313601e585d5fe66059c8945ef7))
* **security:** patch tmp path traversal vulnerability (GHSA-ph9p-34f9-6g65) ([2166ff3](https://github.com/Nekzus/LIOP/commit/2166ff34d06793a22a797a8b0bd58a67423b82a3))


### Features

* **auth:** implement local token revocation list and pre-shared local test token bypass ([4214754](https://github.com/Nekzus/LIOP/commit/4214754fa520085a4a51b28e768371233e5f2caa))
* **hft:** optimize HFT microstructural simulation and security hardening ([112d5d7](https://github.com/Nekzus/LIOP/commit/112d5d77fb7750c74437b7872ba3c87bfe17f0c8))
* **sdk:** env var isolation, fix tokenSlug and manifest propagation ([0b1957a](https://github.com/Nekzus/LIOP/commit/0b1957a1de23ea974322e38e87da616b787c7d17))
* **security:** implement embedded OAuth 2.1 authorization server in Nexus (Phase C) ([9a2b9eb](https://github.com/Nekzus/LIOP/commit/9a2b9ebc190286fbaa478307348a380955809720))
* **security:** implement OAuth 2.1 hybrid auth foundation and gateway validation (Fases A y B) ([2e44a53](https://github.com/Nekzus/LIOP/commit/2e44a537c8274618d3d7635a1ac9b17c39614a4c))
* **security:** stabilize M2M client_secret_post auth, prevent duplicate oidc paths and secure undefined outputs in worker ([49d81e8](https://github.com/Nekzus/LIOP/commit/49d81e8fa57cdf1ef10d7213d1ab2ad66195778f))


# [2.0.0-alpha.27](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.26...v2.0.0-alpha.27) (2026-05-26)

### Features

* **sandbox:** implement pre-execution prototype freezing and strict mode in V8 isolate ([da34008](https://github.com/Nekzus/LIOP/commit/da340086024113db5f92df4e2b8af003fe36dc23))


# [2.0.0-alpha.26](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.25...v2.0.0-alpha.26) (2026-05-26)

### Features

* **piscina:** implement worker pool asynchronous warmup ([ff70970](https://github.com/Nekzus/LIOP/commit/ff709704b3488a81d433956d792a20f59410f965))


# [2.0.0-alpha.25](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.24...v2.0.0-alpha.25) (2026-05-25)

### Bug Fixes

* **gateway:** unify gRPC port remapping for npm package Docker compatibility ([3929e2f](https://github.com/Nekzus/LIOP/commit/3929e2f783e45b2784b2cbb62ced49e32159a050))


# [2.0.0-alpha.24](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.23...v2.0.0-alpha.24) (2026-05-25)

### Features

* **security:** implement tiered query budget and mitigate generator bypass ([a1a21eb](https://github.com/Nekzus/LIOP/commit/a1a21ebc2fbafa28862e1952f581ec85204bfc93))


# [2.0.0-alpha.23](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.22...v2.0.0-alpha.23) (2026-05-24)

### Bug Fixes

* **infra:** normalize Unicode chars in PS1 setup script & add .env.example for dataset scale ([f6a316a](https://github.com/Nekzus/LIOP/commit/f6a316a52bfd8bc98ef065483988e3b7e642aa09))


### Features

* **sdk:** implement context-aware PII scan and output sanitizer (Phase 135) ([7da3a09](https://github.com/Nekzus/LIOP/commit/7da3a09da9bf7a0aa1f720ce6e4bcb47364754d5))
* **sdk:** implement procedural data generators and scale testing ([891bc28](https://github.com/Nekzus/LIOP/commit/891bc288f743adb917936c5fecc634416d1da19c))


# [2.0.0-alpha.22](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.21...v2.0.0-alpha.22) (2026-05-23)

### Features

* **sdk:** implement protocol-native directives and remove client-side preflight ([4eea0bb](https://github.com/Nekzus/LIOP/commit/4eea0bbcf3aefa8fa58cfc72669ff67c4c1c9738))


# [2.0.0-alpha.21](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.20...v2.0.0-alpha.21) (2026-05-22)

### Bug Fixes

* **sdk:** add beta install instructions and finalize production hardening ([d5304d4](https://github.com/Nekzus/LIOP/commit/d5304d42a76757668310e428af23fb2767806620))


# [2.0.0-alpha.20](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.19...v2.0.0-alpha.20) (2026-05-22)

### Bug Fixes

* **sdk:** document small dataset K-Anonymity rules in tool descriptions and prompts ([2cd46d0](https://github.com/Nekzus/LIOP/commit/2cd46d08680ac39fdadf294ef8042932029dba4e))


# [2.0.0-alpha.19](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.18...v2.0.0-alpha.19) (2026-05-22)

### Bug Fixes

* **ci:** remove invalid --no-interactive flag from pnpm publish ([d648759](https://github.com/Nekzus/LIOP/commit/d64875979eef90a560b50b22b9811d72ff132f9e))


# [2.0.0-alpha.18](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.17...v2.0.0-alpha.18) (2026-05-22)

### Bug Fixes

* **ci:** bypass semantic-release ENONPMTOKEN validation by using manual OIDC publish step ([8ca4161](https://github.com/Nekzus/LIOP/commit/8ca416117557dfa05646fdd3dc98b7e9e8420374))
* **ci:** remove NPM_TOKEN env variable to enable OIDC Trusted Publishing ([d3e4e9c](https://github.com/Nekzus/LIOP/commit/d3e4e9c7ac677b9f1d10b87ea470515019e19992))


# [2.0.0-alpha.17](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.16...v2.0.0-alpha.17) (2026-05-22)

### Features

* **sdk:** auto-detect and enable Docker address mapping in production mode ([ed4fb84](https://github.com/Nekzus/LIOP/commit/ed4fb841c4eaa8924705735d4630a54ca3158ab0))


# [2.0.0-alpha.16](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.15...v2.0.0-alpha.16) (2026-05-22)

### Bug Fixes

* **ci/sdk-ts:** resolve CodeQL Node 20 deprecation and fix libp2p PeerId type drift ([db1cece](https://github.com/Nekzus/LIOP/commit/db1cecefe3afd5929e790dec63f0cc78af055bf2))
* **sdk-ts:** upgrade @libp2p/kad-dht to 16.3.0 and align libp2p dependencies to fix typescript build ([1ea3540](https://github.com/Nekzus/LIOP/commit/1ea3540bd2a3e0e3a7eadc2d804d4f6a0888c332))


### Features

* **sdk-ts:** fix gRPC executeLogic egress validation, resolving output schema mismatch for proxied calls and PII false positives from crypto signatures ([1f1d23c](https://github.com/Nekzus/LIOP/commit/1f1d23c31a07c0e63b24ea58c8638723c83a3ebe))


# [2.0.0-alpha.15](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.14...v2.0.0-alpha.15) (2026-05-19)

### Bug Fixes

* **sdk:** bundle @opentelemetry/api as noExternal to avoid peer dep load errors ([35ff566](https://github.com/Nekzus/LIOP/commit/35ff566b79d8314f3c819773a266c6f4f8e00c07))


# [2.0.0-alpha.14](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.13...v2.0.0-alpha.14) (2026-05-19)

### Performance Improvements

* **sdk:** optimize package score by purging unused deps and bundling pure libraries ([332d639](https://github.com/Nekzus/LIOP/commit/332d639de9d6b83dd06aaf7b9078c8ef255a9253))


# [2.0.0-alpha.13](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.12...v2.0.0-alpha.13) (2026-05-19)

### Bug Fixes

* **sdk:** initialize beta release channel for production hardening ([a90a70c](https://github.com/Nekzus/LIOP/commit/a90a70c5044d9000699d59513660bbc56146ddcf))
* **sdk:** relax CSPRNG autocorrelation threshold to resolve flaky CI failures ([a488950](https://github.com/Nekzus/LIOP/commit/a488950be18b1831e7640e760e74dafd01558dbd))
* **sdk:** use float for primitive noise test to avoid 0.5% integer collision ([1215a63](https://github.com/Nekzus/LIOP/commit/1215a633fa1a860707d356ab40076397aed0ebe0))


# [2.0.0-alpha.12](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.11...v2.0.0-alpha.12) (2026-05-19)

### Bug Fixes

* **sdk:** restore standard npm overrides to bypass socket.dev public registry alerts ([be8a3e6](https://github.com/Nekzus/LIOP/commit/be8a3e6ef72e0e6c1cb9cb9e43711344108fae00))


# [2.0.0-alpha.11](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.10...v2.0.0-alpha.11) (2026-05-19)

### Bug Fixes

* **sdk:** enforce secure dependency resolutions for NPM consumers ([6b2fdba](https://github.com/Nekzus/LIOP/commit/6b2fdba4c68053e58af42440b5d35ae281eb3910))


# [2.0.0-alpha.10](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.9...v2.0.0-alpha.10) (2026-05-18)

### Bug Fixes

* **sdk:** override dependency resolutions in root package.json ([292e4b9](https://github.com/Nekzus/LIOP/commit/292e4b9f68d3abefdd8d448611085f2d50d0086f))


# [2.0.0-alpha.9](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.8...v2.0.0-alpha.9) (2026-05-18)

### Bug Fixes

* **sdk:** remove redundant resolutions property in package.json to eliminate build warnings ([0c2550c](https://github.com/Nekzus/LIOP/commit/0c2550cb6d6d4658b39899aaf6593602a935dfa5))


# [2.0.0-alpha.8](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.7...v2.0.0-alpha.8) (2026-05-18)

### Bug Fixes

* **sdk:** override unstable ownership dependencies and clean packaging ([3daa5c2](https://github.com/Nekzus/LIOP/commit/3daa5c2461c2b7b59b9a13b77211304f57fa4727))


# [2.0.0-alpha.7](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.6...v2.0.0-alpha.7) (2026-05-18)

### Bug Fixes

* **sdk:** include socket.yml in published npm package for supply chain triage ([205e6e2](https://github.com/Nekzus/LIOP/commit/205e6e20f8ec26ff81270dbb670964097fea0cf6))


# [2.0.0-alpha.6](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.5...v2.0.0-alpha.6) (2026-05-18)

### Bug Fixes

* **sdk:** resolve supply chain security issues by pruning deprecated transport dependencies ([772041f](https://github.com/Nekzus/LIOP/commit/772041ff6bedf139c55901148806567a6bbef3b4))


# [2.0.0-alpha.5](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.4...v2.0.0-alpha.5) (2026-05-18)

### Bug Fixes

* **release:** release alpha.5 with synchronized git notes ([41924cc](https://github.com/Nekzus/LIOP/commit/41924cc3061b6053232ba84f8a9143fc76719f48))
* **release:** retry alpha.5 release with annotated tag ([7d6cb2c](https://github.com/Nekzus/LIOP/commit/7d6cb2cf843378cdb073a9630cdfeb808716334f))
* **release:** trigger alpha.5 release for DDP integration ([4eebe8d](https://github.com/Nekzus/LIOP/commit/4eebe8d509d00de8ed91cb9756d6ddf7382ebc63))


# [2.0.0-alpha.4](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.3...v2.0.0-alpha.4) (2026-05-18)

### Bug Fixes

* **release:** retry alpha.5 release with annotated tag ([7d6cb2c](https://github.com/Nekzus/LIOP/commit/7d6cb2cf843378cdb073a9630cdfeb808716334f))
* **release:** trigger alpha.5 release for DDP integration ([4eebe8d](https://github.com/Nekzus/LIOP/commit/4eebe8d509d00de8ed91cb9756d6ddf7382ebc63))


### Features

* **sdk:** native TLS auto-relaunch with --use-system-ca ([7c1f9e4](https://github.com/Nekzus/LIOP/commit/7c1f9e4724b5a773c7a17fbd868dde51f72769b6))
* **security:** Implement Deterministic Differential Privacy (DDP) mode ([8ba1aab](https://github.com/Nekzus/LIOP/commit/8ba1aab45c73d9f1e96a09ad3d50302c877b3922))


# [2.0.0-alpha.3](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.2...v2.0.0-alpha.3) (2026-05-16)

### Features

* **sdk:** rename bin liop-agent to liop for industry-standard npx auto-resolution ([4c3a707](https://github.com/Nekzus/LIOP/commit/4c3a707808c6fc9a62eed5d01764ed41561e50be))


# [2.0.0-alpha.2](https://github.com/Nekzus/LIOP/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2026-05-15)

### Features

* **sdk:** implement AST-based taint tracking to mitigate PII exfiltration side-channels ([9f00d6e](https://github.com/Nekzus/LIOP/commit/9f00d6ec1735de895ac97aa61c64471917f173a6))
* **sdk:** implement k-anonymity egress protection and security hardening ([bd7c725](https://github.com/Nekzus/LIOP/commit/bd7c725661d92ba091a95f269540d60dd7efc61f))


# [2.0.0-alpha.1](https://github.com/Nekzus/LIOP/compare/v1.2.0...v2.0.0-alpha.1) (2026-05-10)

### Bug Fixes

* **infra:** align npm registry versions and trigger alpha.2 release ([88ad2dd](https://github.com/Nekzus/LIOP/commit/88ad2ddbb0f874bca4aa6202bdb163e5fb6b303b))
* **infra:** force release v1.3.0-alpha.2 to resolve tag collision ([e91e4f0](https://github.com/Nekzus/LIOP/commit/e91e4f0a438a735a8b1061cd2e330660ca8464e6))
* **infra:** manual version bump to v1.3.0-alpha.2 to synchronize npm and fix tag loop ([c49bebb](https://github.com/Nekzus/LIOP/commit/c49bebb32768636fb5104772a04eb2276a0f3f83))
* **infra:** revert pnpm version to v10.33.0 to bypass Docker build strictness introduced in v11 ([a7d1fb3](https://github.com/Nekzus/LIOP/commit/a7d1fb31d7fa93e688ef6aab1c4711c029aca12b))
* **infra:** trigger alpha.2 release to sync npm registry ([89f8961](https://github.com/Nekzus/LIOP/commit/89f89617a72620e8d5b8c273f4682be068bd2ef7))
* **infra:** trigger clean release v1.3.0-alpha.3 after tag stabilization ([26d9794](https://github.com/Nekzus/LIOP/commit/26d9794649d3f8319a88eef004e5fff1412ae2fd))
* **infra:** trigger fresh CI pipeline for semantic-release ([2528ac7](https://github.com/Nekzus/LIOP/commit/2528ac78a0ed9e19d72d93f1ef26dfa900bbbffc))
* **security:** redact PII from all error messages — zero data leakage in responses ([1cbce81](https://github.com/Nekzus/LIOP/commit/1cbce81dd9f402410817a42eb4e41cad3ca31632))
* **security:** remove quasi-identifier arrays from output schemas ([217e255](https://github.com/Nekzus/LIOP/commit/217e255bb56875a01d3471b63880a93e224c08f7))
* **security:** resolve false-positive blocks on legitimate aggregation queries ([451c6d1](https://github.com/Nekzus/LIOP/commit/451c6d148994472babb608512d7c80d55ba1d1ab))


### Features

* **infra:** jump to v1.4.0 to resolve persistent release loop ([f751963](https://github.com/Nekzus/LIOP/commit/f75196395ae3abd1d664f19b7117311223c2fbcb))
* **infra:** jump to v2.0.0-alpha to resolve persistent release loop ([79b4590](https://github.com/Nekzus/LIOP/commit/79b4590a14c4100766f5c2c00aa62562af072ba5))
* **security:** implement conditional egress error opacity and timing attack defense ([a64c5ba](https://github.com/Nekzus/LIOP/commit/a64c5ba8a4e78a7a92f4181466b0fa5d69c3d2d4))
* **security:** Phase 112 industrial security hardening of the TS SDK ([0c54a28](https://github.com/Nekzus/LIOP/commit/0c54a28a502d46a4e8ff8107254ac2eab81fe22f))
* **security:** PII Egress Shield v3 — defense-in-depth with NER, fuzzy matching & strict schemas ([37c5a60](https://github.com/Nekzus/LIOP/commit/37c5a60881cd2c174676d47b200d49a38f1903a1))


### BREAKING CHANGES

* **infra:** Forced major version bump to stabilize infrastructure and bypass NPM registry conflicts.


# [1.3.0-alpha.1](https://github.com/Nekzus/LIOP/compare/v1.2.0...v1.3.0-alpha.1) (2026-05-10)

### Bug Fixes

* **infra:** align npm registry versions and trigger alpha.2 release ([88ad2dd](https://github.com/Nekzus/LIOP/commit/88ad2ddbb0f874bca4aa6202bdb163e5fb6b303b))
* **infra:** force release v1.3.0-alpha.2 to resolve tag collision ([e91e4f0](https://github.com/Nekzus/LIOP/commit/e91e4f0a438a735a8b1061cd2e330660ca8464e6))
* **infra:** manual version bump to v1.3.0-alpha.2 to synchronize npm and fix tag loop ([c49bebb](https://github.com/Nekzus/LIOP/commit/c49bebb32768636fb5104772a04eb2276a0f3f83))
* **infra:** revert pnpm version to v10.33.0 to bypass Docker build strictness introduced in v11 ([a7d1fb3](https://github.com/Nekzus/LIOP/commit/a7d1fb31d7fa93e688ef6aab1c4711c029aca12b))
* **infra:** trigger alpha.2 release to sync npm registry ([89f8961](https://github.com/Nekzus/LIOP/commit/89f89617a72620e8d5b8c273f4682be068bd2ef7))
* **infra:** trigger clean release v1.3.0-alpha.3 after tag stabilization ([26d9794](https://github.com/Nekzus/LIOP/commit/26d9794649d3f8319a88eef004e5fff1412ae2fd))
* **infra:** trigger fresh CI pipeline for semantic-release ([2528ac7](https://github.com/Nekzus/LIOP/commit/2528ac78a0ed9e19d72d93f1ef26dfa900bbbffc))
* **security:** redact PII from all error messages — zero data leakage in responses ([1cbce81](https://github.com/Nekzus/LIOP/commit/1cbce81dd9f402410817a42eb4e41cad3ca31632))
* **security:** remove quasi-identifier arrays from output schemas ([217e255](https://github.com/Nekzus/LIOP/commit/217e255bb56875a01d3471b63880a93e224c08f7))
* **security:** resolve false-positive blocks on legitimate aggregation queries ([451c6d1](https://github.com/Nekzus/LIOP/commit/451c6d148994472babb608512d7c80d55ba1d1ab))


### Features

* **infra:** jump to v1.4.0 to resolve persistent release loop ([f751963](https://github.com/Nekzus/LIOP/commit/f75196395ae3abd1d664f19b7117311223c2fbcb))
* **security:** implement conditional egress error opacity and timing attack defense ([a64c5ba](https://github.com/Nekzus/LIOP/commit/a64c5ba8a4e78a7a92f4181466b0fa5d69c3d2d4))
* **security:** Phase 112 industrial security hardening of the TS SDK ([0c54a28](https://github.com/Nekzus/LIOP/commit/0c54a28a502d46a4e8ff8107254ac2eab81fe22f))
* **security:** PII Egress Shield v3 — defense-in-depth with NER, fuzzy matching & strict schemas ([37c5a60](https://github.com/Nekzus/LIOP/commit/37c5a60881cd2c174676d47b200d49a38f1903a1))


# [1.2.0-alpha.10](https://github.com/Nekzus/Neural-Mesh-Protocol/compare/v1.2.0-alpha.9...v1.2.0-alpha.10) (2026-04-28)

### Bug Fixes

* **client:** rename getProviders to findProviders for MeshNode parity ([fa4925e](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/fa4925e387c5dfa89ed1cc251b382d0a44bf4250))
* **examples:** force 127.0.0.1 for nexus multiaddr to prevent cross-env timeout ([2813ad6](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/2813ad6e603cc2c7fbae320692f42134d1c916e3))
* **router:** remove redundant remote LiopMeshStatus tools + add 40 hardening tests (191 total PASS) - Phase 108.5: OTel InMemoryMetricExporter verification, token savings O(1) proof, 8-point telemetry integration, coverage config ([3611799](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/3611799632d6bb7b4a640d2241724180da37d2bd))
* **sdk:** add missing await in router readResource throwing unhandled promise rejection ([518c715](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/518c71581e30ce5b7eaf62cacca911ca38a03bbc))
* **sdk:** correct imports and entrypoint typings for tests/infra ([86e64fc](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/86e64fc3379a7314a4b8e3f259d91cfe146f2d4b))
* **sdk:** eradicate last client intent mock, fix .gitignore identity rules, update ZK docstring ([83b62b4](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/83b62b4395e3096a6c42380055d184457749c852))
* **sdk:** resolve schema violations, parallelize discovery, and stabilize typings ([e317300](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/e31730036ec8d6b496601dc2357e6fb1c0fab229))
* **sdk:** suppress TS dependency drift error on libp2p PeerId cast ([63c3060](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/63c30607f20d84f1e9040db7b4fb31501681d781))
* **sdk:** tighten router and mesh typing safeguards ([0519884](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/051988476f643b3c5f812acc4cee737eaed9493f))
* **sdk:** update entrypoints to match v1.2 LiopServer API and MeshNode lifecycle ([8d9b701](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/8d9b701515f545af6103c5058111050e0e4f776f))


### Features

* **economy:** implement Token Economy Engine with real BPE tokenization & OTel gen_ai.* metrics - Phase 108: 8 dispatch points instrumented, o200k_base estimator, 27 new tests (151 total PASS) ([76ac53d](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/76ac53db2efd62d74aacebfe6b69cec31edd98e5))
* **economy:** Token Economy Engine — centralized protocol spec, compact envelope, telemetry ([459914c](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/459914c9a2df274a3785f2e7f6dd34a2c615a4fc))
* **mesh:** validate cross-platform discovery and industrial routing (Fase 104-105) ([96faaf7](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/96faaf7bdc0e9ea8156d96a569c2bac9add618f5))
* **sdk:** align MCP 2025-11-25, smart warm-up stabilization, adaptive DHT polling (Phase 106) ([695fdb7](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/695fdb75cd034d00d1dbe605a9f3c00880294de9))
* **sdk:** eradicate mocks and harden TypeScript ZK parity [Fase 89.5] ([c3f7ff3](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/c3f7ff39b9857527b12d95e96320ba7d6a243f01))
* **sdk:** harden dynamic routing and secure egress ([ff9fb43](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/ff9fb4390db38c3b6122bc96b850b86340ff9e79))
* **sdk:** implement cross-network tests and auto-discovery ([b84da0d](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/b84da0ddc9b1671d440edfa9edf3982d3be6417f))
* **sdk:** implement flexible PII_PRESETS and enforce GLOBAL_STRICT defaults ([bc2aea3](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/bc2aea3f32500732752f508015212a509b5c3339))
* **sdk:** implement Phase 91 Mesh Discovery with WAN Kademlia DHT, auto Bootstrap, and routing table persistence ([394753d](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/394753d8ed25126903e188988e4e3c89bb1165c4))
* **sdk:** implement Phase 92 Cross-AI Adaptors and Phase 93 PII Shield (SSN, IBAN, MRZ) ([fb7d900](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/fb7d900732b1cedeb25c46b66bd84850db05a6cb))
* **sdk:** industrial neural mesh stabilization and zero-shot autonomy ([dd53633](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/dd53633942aefb48ed398688ad672a11c6fe46b0))
* **sdk:** phase 94 production hardening (logger, env cfg, mcp types, test isolation) ([f6477a2](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/f6477a2612d9525571270963288736772de1ac01))
* **sdk:** Phase 96 - Implement Logic Guard Policies & Schema Enforcement ([68207c1](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/68207c1c41c42432599bff4c312d7f24f68882a2))


### Performance Improvements

* **sdk:** cache-first tool routing, TTL 300s, early-exit refresh, actionable HINT (Phase 107) ([279dced](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/279dceddd78f869cb113ba845e3ac9aa9e2e7310))


# [1.2.0-alpha.9](https://github.com/Nekzus/Neural-Mesh-Protocol/compare/v1.2.0-alpha.8...v1.2.0-alpha.9) (2026-03-29)

### Bug Fixes

* **ci:** match pnpm version to package.json and update rebranding filters ([2a8016d](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/2a8016db0b4506755fe70367f80a5810d4ef57d6))
* **demos:** unificar nomenclatura LIOP en demos industriales y educativas ([387ea91](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/387ea911f51d1560091199cec35559c8a66bd86e))
* **rebrand:** resolve discovery issues and synchronize error messages for LIOP parity ([4d34c8a](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/4d34c8aa0dcc9bf11ff82a76cadbdb3316a4b270))
* **rebrand:** update tests and SDK components to LIOP brand parity ([a2557f9](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/a2557f962ab03e9b84249da814b610dc60908166))
* resolve SDK build errors and standardize script types ([e8eb96f](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/e8eb96f09ea30fe1a28c5eccdde18f90f0b6877c))


### Features

* **global:** Unificación total de marca LIOP y Paridad de Protocolo v1.0.0-alpha ([00bdc81](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/00bdc813aaa4599afdad60a8af90dca20c4cd593)), closes [Hi#Fidelity](https://github.com/Hi/issues/Fidelity)
* **sdk:** achieve 100% industrial parity v1.2.0-alpha.x ([f4b59f5](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/f4b59f53fae1d4d9f2729c8506b5ffd690261a3c))
* **sdk:** achieve Tier-0 industrial standards for LIOP protocol. Integrated cryptographic verification (Kyber768), hardened WASI sandbox, and normalized logging. 100% test success rate (98/98). ([bebe433](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/bebe433931738fd54dbf3cba3fbf68bb9ba20b09))
* **sdk:** finalize industrial parity v1.2.0-beta ([73ffd2b](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/73ffd2b9a9ac22b9df6ec3ae42443e1d0aec5ce2)), closes [hi#level](https://github.com/hi/issues/level)
* **sdk:** migrate PQC to FIPS 203 (mlkem), harden gRPC/Piscina, bump libp2p patches ([8c2caa5](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/8c2caa5810b5b55aaf70fc567324021f59f5ba20))
* **sdk:** modernize to McpServer API, silence console & industrialize Tier-0 stability ([c600c27](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/c600c27ae2ac330fa10dc2571f99d2bb311b3166))
* **sdk:** stabilize hybrid gateway and enable health check endpoint ([07f6b34](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/07f6b3473526e74c296ed138d5cc4b563084ef2d))
* **typescript:** finalize Tier-0 industrial parity & worker pool resiliency ([fa97150](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/fa97150af6448772149d6111b0f9708716dad170))


# [1.2.0-alpha.8](https://github.com/Nekzus/Neural-Mesh-Protocol/compare/v1.2.0-alpha.7...v1.2.0-alpha.8) (2026-03-23)

### Features

* implement global remote resource attachment via manifest caching ([9d7c81f](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/9d7c81fdebbd4ad1b3551a0103f47d74039ce3cf))
* Neural Mesh Protocol - Full Industrial LOO Migration & Safety Alignment 🛡️🤖 ([1100dbe](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/1100dbe8a14341c777a2463ecd6d9b99e49d47c5))
* NMP Industrial High-Fidelity - Precision Logic Extraction & Spec Compliance ([6fd2152](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/6fd2152e57e17a408f9bfd14e06459a124a9d661)), closes [Hi#Fidelity](https://github.com/Hi/issues/Fidelity)


# [1.2.0-alpha.7](https://github.com/Nekzus/Neural-Mesh-Protocol/compare/v1.2.0-alpha.6...v1.2.0-alpha.7) (2026-03-23)

### Bug Fixes

* **router:** Mitigación de Firewall en Windows con ruteo a Localhost Inteligente + Manejo de errores gRPC mejorado ([78b40c1](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/78b40c15da614a26c0db580b105e68474d82889c))


# [1.2.0-alpha.6](https://github.com/Nekzus/Neural-Mesh-Protocol/compare/v1.2.0-alpha.5...v1.2.0-alpha.6) (2026-03-22)

### Bug Fixes

* **router:** Optimizada indexación semántica de NmpMeshStatus para descubrimientos de LLMs y corregido linter residual ([18ab90a](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/18ab90a074b4c4a307efb36d755e414cec38363e))


# [1.2.0-alpha.5](https://github.com/Nekzus/Neural-Mesh-Protocol/compare/v1.2.0-alpha.4...v1.2.0-alpha.5) (2026-03-22)

### Features

* **router:** Inyectada topología Zero-Trust (NmpMeshStatus Expandido + Visibilidad de Origen en MCP Tools) ([873ca0e](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/873ca0edb4f34b41221afc5aef76e630a5710171))


# [1.2.0-alpha.4](https://github.com/Nekzus/Neural-Mesh-Protocol/compare/v1.2.0-alpha.3...v1.2.0-alpha.4) (2026-03-22)

### Bug Fixes

* **agent:** implement multi-path bootstrap discovery and DHT warming delay ([eb20971](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/eb20971a752557a925698448572a94906f0f76f7))
* **mesh:** add timeouts and parallel manifest queries to prevent Claude connection hangs ([7639770](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/76397709f01b12a3799dfbab277af16d581143a3))
* **mesh:** resolve PeerId type conflict in dialProtocol ([963238b](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/963238bec66456c92a0fe90a7d1c175af0e823a7))
* **mesh:** use native PeerId from connections to avoid toMultihash error ([8e17681](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/8e176812ec1a98b2d2a7888f7473a30acfcdb833))
* **sdk:** add robust event-based reader fallback in queryManifest for raw streams ([d830549](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/d8305492e3a7fab1619a997fe8e19fc533cfb76a))
* **sdk:** shim sublist on manifest buffer for Yamux compatibility ([5963277](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/5963277a425642284a9c62f54249d4741d299b10))
* **sdk:** use pseudo-Uint8ArrayList for Yamux native stream compatibility ([566797b](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/566797b55572011800240b74a9569c34c24f174a))


### Features

* Implement initial NMP TypeScript SDK including client, server, mesh networking, and comprehensive integration tests. ([86e2b2f](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/86e2b2f835a89fb006d6338680b97eb4808c6ecd))
* **mesh-node:** align manifest serving with official libp2p standards (Phase 80) ([0cafeeb](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/0cafeebafb8691b0c885fdea34ee6a721006eee9))
* **sdk:** fully synchronized discovery fix and updated project bitacora ([ec86481](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/ec86481b42b17d78ab95e450fee45ba57ad82ec5))
* **sdk:** implement dynamic tool discovery with LAN-DHT and Yamux native fallback ([84787d4](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/84787d4c22312be0ec350743f6ff5601894f539b))
* **sdk:** improve mesh stability, non-blocking discovery and stream handling ([5905961](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/5905961838cc9b21394ba0e07a2b30b501e2af18))


# [1.2.0-alpha.3](https://github.com/Nekzus/Neural-Mesh-Protocol/compare/v1.2.0-alpha.2...v1.2.0-alpha.3) (2026-03-20)

### Bug Fixes

* **sdk:** correct production proto path in dist package ([0b8a0ed](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/0b8a0eda1511c811e6d16fd025f1f34ac478829b))
* **sdk:** ensure stable integration tests and final biome formatting ([366cc0d](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/366cc0d199ff7acf3bb5ee3d81906383ec37951c))


# [1.2.0-alpha.2](https://github.com/Nekzus/Neural-Mesh-Protocol/compare/v1.2.0-alpha.1...v1.2.0-alpha.2) (2026-03-20)

### Bug Fixes

* **sdk:** bundle .proto files and implement dynamic resolution for NPM distribution ([e2914d9](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/e2914d9d570c41841c57de02b952aefe03d29b01))


# [1.2.0-alpha.1](https://github.com/Nekzus/Neural-Mesh-Protocol/compare/v1.1.2...v1.2.0-alpha.1) (2026-03-20)

### Bug Fixes

* **demo:** Improve scenario parsing to support npm config variables ([949ef46](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/949ef4615f7978ee9902cf365334d80678a3ab2f))
* **sdk:** add node: protocol to built-in imports in industrial-demo examples ([4af86a4](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/4af86a4ef22e0700b0f9647f2f305b564a9ab3ee))
* **sdk:** Enforce strict JSON-RPC by redirecting all telemetry to stderr ([959f152](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/959f152dcafbc4d1cc3492ebec5deb55ea99a919))
* **sdk:** move organizeImports to assist section in biome.json for v2.4 compatibility ([a7cf460](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/a7cf460cf9530950e540726fa13af22bedd3f553))


### Features

* **bridge:** Graceful shutdown on MCP client disconnect to prevent EADDRINUSE ([38444f4](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/38444f47e7a2190264c1c74b4e8bc7ec5989069d))
* **nmp-alpha:** complete alpha phase with e2e validation and cloudflare edge pivot ([f2eb84e](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/f2eb84ecdcaf2d31bd7a1ee72d84261c2885092a))
* **nmp-mesh:** Final Alpha Release with Multi-Node Topology (squash) ([e265172](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/e265172a8362e5ed61017dbf74a6b5f49c76362b))


## [1.0.1-alpha.2](https://github.com/Nekzus/Neural-Mesh-Protocol/compare/v1.0.1-alpha.1...v1.0.1-alpha.2) (2026-03-05)

### Bug Fixes

* **sdk:** use absolute URL for logo in README for NPM compatibility ([b5fd847](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/b5fd847aa2196e6acc8006f418e6414aeb5b2062))


## [1.0.1-alpha.1](https://github.com/Nekzus/Neural-Mesh-Protocol/compare/v1.0.0...v1.0.1-alpha.1) (2026-03-05)

### Bug Fixes

* trim trailing whitespace in package description ([c659a83](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/c659a83bfc5a90dc08d9329bda52d55e942af0fc))


# 1.0.0-alpha.1 (2026-03-05)

### Bug Fixes

* align package version with v1.0.0-alpha.2 and synchronize tags ([2bab264](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/2bab264194470a04cd5e17def9fb469cf3809042))
* **ci:** configure main as stable release and alpha branch for prereleases ([6d0a617](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/6d0a617276119db69786f03685730ce9f3ad4ec6))
* **ci:** remove production branch from semantic-release to fix multi-channel tag filtering ([76558ca](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/76558ca431b83433083c6d22e172f2a289623e24))
* **docs:** refine text positioning, verify spelling, and confirm mobile rendering optimizations in logic-on-origin svgs ([41db052](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/41db05278bf3a56a17dd20c2964ad7917ef503f2))
* **docs:** repair broken dark svg rendering and align text layers symmetrically across both logic-on-origin diagrams ([059e744](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/059e7440e9de564cf19f877b8503ecedc665f2a5))
* **docs:** replace animateMotion with SMIL animate transforms for better image tag compatibility in Mintlify ([106ef5f](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/106ef5fd83c97a90adfd348a722ba2462146b78a))
* **docs:** replace SMIL animate with CSS keyframes for 100% Mintlify img compatibility ([8fdea51](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/8fdea5188b083c2d80e670e5558335bdf62e1c96))
* final trigger commit after synchronized tag reconstruction ([051a394](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/051a3946c20e33370809bd3bc117e85e1a7efc55))
* logic output serialization returns proper json rather than object string primitive in wasi sandbox ([770dce7](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/770dce7eb1298eca3c0f4a379bd951d30eb99f9c))
* resolve EPRERELEASEBRANCHES semantic-release config conflict ([7e87496](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/7e87496710d8c85dbc0ec1800f95c97661d9b7b2))
* resolve linting and formatting errors in TS SDK ([046b09b](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/046b09be973e67576075df4ef7cfbaaddb380b1c))
* **sdk:** finalize tag lineage reconstruction for automated release v1.0.0-alpha.3 ([3c1cc38](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/3c1cc387355f54be40b59bc5a29feed836babbaf))
* **sdk:** resolve TypeScript compilation errors in demos and bridge tests ([58cc2d7](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/58cc2d7e13a24c143f9ac0f9f513f60e3692c0e9))
* **sdk:** synchronize release pipeline after tag reconstruction ([c3ed210](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/c3ed21019c30554970655cc0dd6f9c9e337be159))
* **sdk:** updated z.record strictness to match latest zod schema version parity ([e981fd4](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/e981fd4bbe1fd253f2913d80f9a0a787700cce3b))
* trim trailing whitespace in package description ([c659a83](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/c659a83bfc5a90dc08d9329bda52d55e942af0fc))


### Features

* **docs:** implement multi-language support (i18n) for Mintlify documentation [English/Spanish] ([1e1c188](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/1e1c1888192d5086e89bbfd0e9f2a93c36c62b80))
* implement Military Grade PII Shield (Luhn, Safe Words, NIST boundaries) (Phase 34) ([a610538](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/a610538a96551c5f67e788bdab4582a24fd12638))
* implement native sdk defensive serialization for logic-on-origin tool returns ([dbe764a](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/dbe764a288713256c91e7b2a45fc8d7962a3ab03))
* implement native sdk pii protection (the shield core) and refactor demo ([1c055b2](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/1c055b2de336a3acc264bdc7a130f2ffe1bf7c72))
* implement professional multi-layer PII engine (Phase 33) ([62f8257](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/62f825744d08216eb443de37042c18bd9c6a81a6))
* **nmp-core:** Init Cargo workspace and nmp_core.proto definition ([c2bf566](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/c2bf5663caafd23366e125d949e03d396a521140))
* **nmp:** complete Logic-on-Origin WebAssembly Push paradigm implementation ([71a2aef](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/71a2aef0dd4b7055460a5d0f863ce3d723cf23ab))
* **nmp:** implemented phase 2 sdk bridge and phase 3 streaming push watchdogs ([95eb77e](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/95eb77e9047d3f3ddfce9ab6a39895561925eda7))
* phase 45 - perfect parity audit remediation (integrated workers, kyber, node:vm) ([9711cb5](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/9711cb56df56db975134ea1264eb7c76c9400069))
* **rust-app:** empower nmp-server with ZK-SNARKs and TEE physical enclaves architecture ([25052fa](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/25052faf75c5dba664278efc572222d5109ebbd5))
* **sdk:** Cleanup console logs and dummy PQC mocks for Tier-0 rc ([f4d53d5](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/f4d53d530bccf192e81ea96df64ce23538a92ae5))
* **sdk:** Enforce Dynamic Return Structure (i18n) for LLM prompts ([9448827](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/94488274ab7448118c3bf60e00ca07877fb98174))
* **sdk:** Implement full MCP parity with NmpServer, Client, Bridge and 100% test coverage ([7e97db1](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/7e97db138c4069f89e426130341772c24a53a367))
* **sdk:** implement native zk-receipt verification in bridge and client ([ec5f53d](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/ec5f53d35578c0577a8ded2261ce7a5cbfffbb9e))
* **sdk:** Implement Phase 3 native P2P, gRPC, and WASI execution in Node.js ([c61ae58](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/c61ae587887b5b58cf12429388b2322099f4fa49))
* **sdk:** Implement Zero-Shot Autonomy for NMP Server Logic-on-Origin. Add system prompt 'nmp_blind_analyst' and Educative Shield middleware to tool registration. Update bridge for prompt handling. Fix wasi-sandbox env variable exposure. ([455a755](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/455a755a61f6e61bbc8a6dfbfc700b0f876c98ca))
* **sdk:** inject dynamic PII forbidden keys into Zero-Shot Payload instruction ([dd75e1b](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/dd75e1be05d3bea0ad98c501baa4c68483533fb6))
* **sdk:** inject explicit 'return' statement warning in Zero-Shot middleware ([07b9394](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/07b93947dc135042b5fa802f6eb7b26c8dc01c89))
* **sdk:** migrate examples to fully containerized sub-packages utilizing pnpm workspaces for true modularity mimicking MCP ecosystem ([6ca41d6](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/6ca41d69442e8c754f6e968773cf6789bc165f9d))
* **sdk:** NMP Phase 19 - Universal MCP Bridge, Egress Filter & Zero-Shot Schema Discovery ([fd5b811](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/fd5b811abcc507e62e5508d9b389ccfd4d26b5e1))
* **sdk:** relax blind analyst return constraints to allow flexible generic logic payloads ([b87d92a](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/b87d92a97c94e50578c0cef63da7305ff34e1d4d))
* **sdk:** Restore native logging and implement zero-trust logic-execution tests ([2497228](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/249722860ef1621814d294bbb5717e2a802ed8d5))
* **sdk:** Tier-0 Crypto Parity with Kyber768 & AES-256-GCM ([829eccf](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/829eccf621ab75844008d23a8f446ed5ab6d0ee5))
* **sdk:** Vanguard Enterprise Architecture (PQC, TCP, ZK, Guardian-TS & Piscina Worker Pool) ([125cb94](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/125cb943d475363fcbb90c0cdca21c67e7b1c9ed))
* **security:** Implement Hybrid PQC (Kyber768), AES-GCM, and TEE Stubs for Phase 4 Zero-Trust Architecture ([dd06fb5](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/dd06fb53a2a7ae66f2fde4420f1de5198e9945ff))
* **security:** integrate zero-time ast guardian and libp2p kademlia dht caching ([2135346](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/21353463e6e0942ab30efbeb94a8e88a79dced2b))


# [1.0.0-alpha.2](https://github.com/Nekzus/Neural-Mesh-Protocol/compare/v1.0.0-alpha.1...v1.0.0-alpha.2) (2026-03-05)

### Bug Fixes

* patch NPM semantic release deployment bypassing provenance ([b65fc16](https://github.com/Nekzus/Neural-Mesh-Protocol/commit/b65fc16bb0d275d9cee2425d5432cb32939de211))
