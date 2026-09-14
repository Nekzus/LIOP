# Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 1.0.0-alpha.1 (2026-09-14)


### Bug Fixes

* **agent:** implement multi-path bootstrap discovery and DHT warming delay ([eb20971](https://github.com/Nekzus/LIOP/commit/eb20971a752557a925698448572a94906f0f76f7))
* align package version with v1.0.0-alpha.2 and synchronize tags ([2bab264](https://github.com/Nekzus/LIOP/commit/2bab264194470a04cd5e17def9fb469cf3809042))
* **audit:** harden docker entrypoint wrapper and declare default CMD for test runner ([4e146db](https://github.com/Nekzus/LIOP/commit/4e146db70911aed1a0df922984903a3389e38e54))
* **ci/sdk-ts:** resolve CodeQL Node 20 deprecation and fix libp2p PeerId type drift ([db1cece](https://github.com/Nekzus/LIOP/commit/db1cecefe3afd5929e790dec63f0cc78af055bf2))
* **ci:** bypass semantic-release ENONPMTOKEN validation by using manual OIDC publish step ([8ca4161](https://github.com/Nekzus/LIOP/commit/8ca416117557dfa05646fdd3dc98b7e9e8420374))
* **ci:** configure main as stable release and alpha branch for prereleases ([6d0a617](https://github.com/Nekzus/LIOP/commit/6d0a617276119db69786f03685730ce9f3ad4ec6))
* **ci:** eliminate cert-manager test race condition and sync PR workflow triggers ([10c43d2](https://github.com/Nekzus/LIOP/commit/10c43d26048fbcd99b0d22644bf4dbebb5a3f803))
* **ci:** match pnpm version to package.json and update rebranding filters ([2a8016d](https://github.com/Nekzus/LIOP/commit/2a8016db0b4506755fe70367f80a5810d4ef57d6))
* **ci:** remove invalid --no-interactive flag from pnpm publish ([d648759](https://github.com/Nekzus/LIOP/commit/d64875979eef90a560b50b22b9811d72ff132f9e))
* **ci:** remove NPM_TOKEN env variable to enable OIDC Trusted Publishing ([d3e4e9c](https://github.com/Nekzus/LIOP/commit/d3e4e9c7ac677b9f1d10b87ea470515019e19992))
* **ci:** remove production branch from semantic-release to fix multi-channel tag filtering ([76558ca](https://github.com/Nekzus/LIOP/commit/76558ca431b83433083c6d22e172f2a289623e24))
* **client:** adaptive OAuth 2.1 M2M token auto-refresh and resilient intent negotiation ([16257c7](https://github.com/Nekzus/LIOP/commit/16257c7d3e87c5db6db3cf760b7386801c02b0b8))
* **client:** rename getProviders to findProviders for MeshNode parity ([fa4925e](https://github.com/Nekzus/LIOP/commit/fa4925e387c5dfa89ed1cc251b382d0a44bf4250))
* **demo:** Improve scenario parsing to support npm config variables ([949ef46](https://github.com/Nekzus/LIOP/commit/949ef4615f7978ee9902cf365334d80678a3ab2f))
* **demos:** unificar nomenclatura LIOP en demos industriales y educativas ([387ea91](https://github.com/Nekzus/LIOP/commit/387ea911f51d1560091199cec35559c8a66bd86e))
* **deps:** bump lodash override to >=4.18.1 for CVE-2026-4800 remediation ([c2dc3bd](https://github.com/Nekzus/LIOP/commit/c2dc3bd5be41b69779d33933019299ebfc0e14b3))
* **deps:** declare socketregistry overrides in package.json files for npm and socket.dev scans ([dc02365](https://github.com/Nekzus/LIOP/commit/dc02365ccaa684d5f4f1789d4864f95adc39164a))
* **deps:** map lodash-es to lodash >=4.18.1 and add dependabot configuration ([3e53097](https://github.com/Nekzus/LIOP/commit/3e53097ec3b2f0f34e9a8de374b9e52f536dda73))
* **deps:** override browserslist to >=4.28.7 resolving GHSA-c83g-rgw3-j3cx and GHSA-73wf-gq98-2v4g ([e6cbf0c](https://github.com/Nekzus/LIOP/commit/e6cbf0c22f78dbdea0826dd81ee8d77473f60773))
* **deps:** restore pure ESM lodash-es >=4.17.21 for semantic-release compatibility ([db1141b](https://github.com/Nekzus/LIOP/commit/db1141bab4a8b33b87fc6b9d1451cc59649a5bbb))
* **deps:** synchronize pnpm-lock.yaml for devDependencies gpt-tokenizer migration ([64fb550](https://github.com/Nekzus/LIOP/commit/64fb550f7d5fa056b35fc9198530b8094540b005))
* **deps:** update vitest to 4.1.8 and configure saveExact workspace policy ([da98609](https://github.com/Nekzus/LIOP/commit/da986096e2c2cd77d648da71120f07594fe32438))
* **docs:** refine text positioning, verify spelling, and confirm mobile rendering optimizations in logic-on-origin svgs ([41db052](https://github.com/Nekzus/LIOP/commit/41db05278bf3a56a17dd20c2964ad7917ef503f2))
* **docs:** repair broken dark svg rendering and align text layers symmetrically across both logic-on-origin diagrams ([059e744](https://github.com/Nekzus/LIOP/commit/059e7440e9de564cf19f877b8503ecedc665f2a5))
* **docs:** replace animateMotion with SMIL animate transforms for better image tag compatibility in Mintlify ([106ef5f](https://github.com/Nekzus/LIOP/commit/106ef5fd83c97a90adfd348a722ba2462146b78a))
* **docs:** replace SMIL animate with CSS keyframes for 100% Mintlify img compatibility ([8fdea51](https://github.com/Nekzus/LIOP/commit/8fdea5188b083c2d80e670e5558335bdf62e1c96))
* **examples:** force 127.0.0.1 for nexus multiaddr to prevent cross-env timeout ([2813ad6](https://github.com/Nekzus/LIOP/commit/2813ad6e603cc2c7fbae320692f42134d1c916e3))
* final trigger commit after synchronized tag reconstruction ([051a394](https://github.com/Nekzus/LIOP/commit/051a3946c20e33370809bd3bc117e85e1a7efc55))
* **gateway:** unify gRPC port remapping for npm package Docker compatibility ([3929e2f](https://github.com/Nekzus/LIOP/commit/3929e2f783e45b2784b2cbb62ced49e32159a050))
* **hft:** implement Market Maker inventory fill tracking and scale down Laplace sensitivity for imbalance metrics ([e286426](https://github.com/Nekzus/LIOP/commit/e286426726b541500afab197c1af9220c0009f46))
* **infra:** align npm registry versions and trigger alpha.2 release ([88ad2dd](https://github.com/Nekzus/LIOP/commit/88ad2ddbb0f874bca4aa6202bdb163e5fb6b303b))
* **infra:** force release v1.3.0-alpha.2 to resolve tag collision ([e91e4f0](https://github.com/Nekzus/LIOP/commit/e91e4f0a438a735a8b1061cd2e330660ca8464e6))
* **infra:** manual version bump to v1.3.0-alpha.2 to synchronize npm and fix tag loop ([c49bebb](https://github.com/Nekzus/LIOP/commit/c49bebb32768636fb5104772a04eb2276a0f3f83))
* **infra:** normalize Unicode chars in PS1 setup script & add .env.example for dataset scale ([f6a316a](https://github.com/Nekzus/LIOP/commit/f6a316a52bfd8bc98ef065483988e3b7e642aa09))
* **infra:** revert pnpm version to v10.33.0 to bypass Docker build strictness introduced in v11 ([a7d1fb3](https://github.com/Nekzus/LIOP/commit/a7d1fb31d7fa93e688ef6aab1c4711c029aca12b))
* **infra:** trigger alpha.2 release to sync npm registry ([89f8961](https://github.com/Nekzus/LIOP/commit/89f89617a72620e8d5b8c273f4682be068bd2ef7))
* **infra:** trigger clean release v1.3.0-alpha.3 after tag stabilization ([26d9794](https://github.com/Nekzus/LIOP/commit/26d9794649d3f8319a88eef004e5fff1412ae2fd))
* **infra:** trigger fresh CI pipeline for semantic-release ([2528ac7](https://github.com/Nekzus/LIOP/commit/2528ac78a0ed9e19d72d93f1ef26dfa900bbbffc))
* **liop-studio:** enforce radical zero-trust offline network transparency and eliminate fallback mocks ([1a3d22d](https://github.com/Nekzus/LIOP/commit/1a3d22d7d161d1ea3dacef620dcd31da678ec50f))
* logic output serialization returns proper json rather than object string primitive in wasi sandbox ([770dce7](https://github.com/Nekzus/LIOP/commit/770dce7eb1298eca3c0f4a379bd951d30eb99f9c))
* **mesh:** add timeouts and parallel manifest queries to prevent Claude connection hangs ([7639770](https://github.com/Nekzus/LIOP/commit/76397709f01b12a3799dfbab277af16d581143a3))
* **mesh:** resolve PeerId type conflict in dialProtocol ([963238b](https://github.com/Nekzus/LIOP/commit/963238bec66456c92a0fe90a7d1c175af0e823a7))
* **mesh:** use native PeerId from connections to avoid toMultihash error ([8e17681](https://github.com/Nekzus/LIOP/commit/8e176812ec1a98b2d2a7888f7473a30acfcdb833))
* **metrics:** dynamically update peer count and manifest cache size on /metrics export ([76dd258](https://github.com/Nekzus/LIOP/commit/76dd2589a5f1011f8895fd8a2a5c73637600cde4))
* **playground:** eliminate hardcoded node counts and synchronize dynamic topology stats ([743205a](https://github.com/Nekzus/LIOP/commit/743205a07342528c3d27d02fb3a06aa8aa4cf335))
* **playground:** enforce dark input styling without contrast leaks and localize all code/frontend text to English ([36ae520](https://github.com/Nekzus/LIOP/commit/36ae5204a024ae143cec4639a2e8be3cdc2366f3))
* **playground:** resolve intermittent routing failures, adopt official logo/favicon, dynamic version and zero layout shift ([0d89d15](https://github.com/Nekzus/LIOP/commit/0d89d15fa11072d79f38be9e0b0b084df784eb20))
* **rebrand:** resolve discovery issues and synchronize error messages for LIOP parity ([4d34c8a](https://github.com/Nekzus/LIOP/commit/4d34c8aa0dcc9bf11ff82a76cadbdb3316a4b270))
* **rebrand:** update tests and SDK components to LIOP brand parity ([a2557f9](https://github.com/Nekzus/LIOP/commit/a2557f962ab03e9b84249da814b610dc60908166))
* **release:** release alpha.5 with synchronized git notes ([41924cc](https://github.com/Nekzus/LIOP/commit/41924cc3061b6053232ba84f8a9143fc76719f48))
* **release:** retry alpha.5 release with annotated tag ([7d6cb2c](https://github.com/Nekzus/LIOP/commit/7d6cb2cf843378cdb073a9630cdfeb808716334f))
* **release:** trigger alpha.5 release for DDP integration ([4eebe8d](https://github.com/Nekzus/LIOP/commit/4eebe8d509d00de8ed91cb9756d6ddf7382ebc63))
* resolve EPRERELEASEBRANCHES semantic-release config conflict ([7e87496](https://github.com/Nekzus/LIOP/commit/7e87496710d8c85dbc0ec1800f95c97661d9b7b2))
* resolve linting and formatting errors in TS SDK ([046b09b](https://github.com/Nekzus/LIOP/commit/046b09be973e67576075df4ef7cfbaaddb380b1c))
* resolve SDK build errors and standardize script types ([e8eb96f](https://github.com/Nekzus/LIOP/commit/e8eb96f09ea30fe1a28c5eccdde18f90f0b6877c))
* **router:** Mitigación de Firewall en Windows con ruteo a Localhost Inteligente + Manejo de errores gRPC mejorado ([78b40c1](https://github.com/Nekzus/LIOP/commit/78b40c15da614a26c0db580b105e68474d82889c))
* **router:** Optimizada indexación semántica de NmpMeshStatus para descubrimientos de LLMs y corregido linter residual ([18ab90a](https://github.com/Nekzus/LIOP/commit/18ab90a074b4c4a307efb36d755e414cec38363e))
* **router:** remove redundant remote LiopMeshStatus tools + add 40 hardening tests (191 total PASS) - Phase 108.5: OTel InMemoryMetricExporter verification, token savings O(1) proof, 8-point telemetry integration, coverage config ([3611799](https://github.com/Nekzus/LIOP/commit/3611799632d6bb7b4a640d2241724180da37d2bd))
* **sdk-ts:** upgrade @libp2p/kad-dht to 16.3.0 and align libp2p dependencies to fix typescript build ([1ea3540](https://github.com/Nekzus/LIOP/commit/1ea3540bd2a3e0e3a7eadc2d804d4f6a0888c332))
* **sdk:** add beta install instructions and finalize production hardening ([d5304d4](https://github.com/Nekzus/LIOP/commit/d5304d42a76757668310e428af23fb2767806620))
* **sdk:** add missing await in router readResource throwing unhandled promise rejection ([518c715](https://github.com/Nekzus/LIOP/commit/518c71581e30ce5b7eaf62cacca911ca38a03bbc))
* **sdk:** add node: protocol to built-in imports in industrial-demo examples ([4af86a4](https://github.com/Nekzus/LIOP/commit/4af86a4ef22e0700b0f9647f2f305b564a9ab3ee))
* **sdk:** add robust event-based reader fallback in queryManifest for raw streams ([d830549](https://github.com/Nekzus/LIOP/commit/d8305492e3a7fab1619a997fe8e19fc533cfb76a))
* **sdk:** align default audience and resolve M2M token propagation in executeLogic ([6d8898b](https://github.com/Nekzus/LIOP/commit/6d8898bded49c3d3049a6f40eb75f84d20846738))
* **sdk:** apply biome formatting and linting fixes to server module ([73a4ec6](https://github.com/Nekzus/LIOP/commit/73a4ec6baf653f6bcfa1f64205e3b816149243b2))
* **sdk:** bind preflight query budget to agent_did in executeLogic gRPC flow ([d6b3ba1](https://github.com/Nekzus/LIOP/commit/d6b3ba1196b3a64fcadab1532c839a9131147f02))
* **sdk:** bind preflight query budget to agent_did in executeLogic gRPC flow ([6c28b92](https://github.com/Nekzus/LIOP/commit/6c28b92a2405d155646ac7dd70cb3223f6a13628))
* **sdk:** bundle .proto files and implement dynamic resolution for NPM distribution ([e2914d9](https://github.com/Nekzus/LIOP/commit/e2914d9d570c41841c57de02b952aefe03d29b01))
* **sdk:** bundle @opentelemetry/api as noExternal to avoid peer dep load errors ([35ff566](https://github.com/Nekzus/LIOP/commit/35ff566b79d8314f3c819773a266c6f4f8e00c07))
* **sdk:** bundle @opentelemetry/api in noExternal to avoid peer dependency resolve errors in npx ([d824222](https://github.com/Nekzus/LIOP/commit/d82422204c58464fa4f5b45334c4e470c82a9f5f))
* **sdk:** correct imports and entrypoint typings for tests/infra ([86e64fc](https://github.com/Nekzus/LIOP/commit/86e64fc3379a7314a4b8e3f259d91cfe146f2d4b))
* **sdk:** correct production proto path in dist package ([0b8a0ed](https://github.com/Nekzus/LIOP/commit/0b8a0eda1511c811e6d16fd025f1f34ac478829b))
* **sdk:** document small dataset K-Anonymity rules in tool descriptions and prompts ([2cd46d0](https://github.com/Nekzus/LIOP/commit/2cd46d08680ac39fdadf294ef8042932029dba4e))
* **sdk:** enable npm provenance with id-token permissions and restore dynamic badge ([dfd6300](https://github.com/Nekzus/LIOP/commit/dfd630084b837e1f2d4ca742dced16e69453424c))
* **sdk:** enforce secure dependency resolutions for NPM consumers ([6b2fdba](https://github.com/Nekzus/LIOP/commit/6b2fdba4c68053e58af42440b5d35ae281eb3910))
* **sdk:** Enforce strict JSON-RPC by redirecting all telemetry to stderr ([959f152](https://github.com/Nekzus/LIOP/commit/959f152dcafbc4d1cc3492ebec5deb55ea99a919))
* **sdk:** ensure stable integration tests and final biome formatting ([366cc0d](https://github.com/Nekzus/LIOP/commit/366cc0d199ff7acf3bb5ee3d81906383ec37951c))
* **sdk:** eradicate last client intent mock, fix .gitignore identity rules, update ZK docstring ([83b62b4](https://github.com/Nekzus/LIOP/commit/83b62b4395e3096a6c42380055d184457749c852))
* **sdk:** final biome linting and formatting fixes for provenance release ([6887614](https://github.com/Nekzus/LIOP/commit/68876149972d70807d6c7b06c7b4763240065c67))
* **sdk:** finalize tag lineage reconstruction for automated release v1.0.0-alpha.3 ([3c1cc38](https://github.com/Nekzus/LIOP/commit/3c1cc387355f54be40b59bc5a29feed836babbaf))
* **sdk:** include LICENSE file in NPM and Cargo distribution packages ([923e6ee](https://github.com/Nekzus/LIOP/commit/923e6ee2a05d28d30583a7b2822278f60dcc67fc))
* **sdk:** include socket.yml in published npm package for supply chain triage ([205e6e2](https://github.com/Nekzus/LIOP/commit/205e6e20f8ec26ff81270dbb670964097fea0cf6))
* **sdk:** initialize beta release channel for production hardening ([a90a70c](https://github.com/Nekzus/LIOP/commit/a90a70c5044d9000699d59513660bbc56146ddcf))
* **sdk:** move organizeImports to assist section in biome.json for v2.4 compatibility ([a7cf460](https://github.com/Nekzus/LIOP/commit/a7cf460cf9530950e540726fa13af22bedd3f553))
* **sdk:** override dependency resolutions in root package.json ([292e4b9](https://github.com/Nekzus/LIOP/commit/292e4b9f68d3abefdd8d448611085f2d50d0086f))
* **sdk:** override uint8arrays to resolve ecdsa import error in npx ([a47546b](https://github.com/Nekzus/LIOP/commit/a47546bcdbbbba27a8138c519f7d72f66ce2c2cc))
* **sdk:** override unstable ownership dependencies and clean packaging ([3daa5c2](https://github.com/Nekzus/LIOP/commit/3daa5c2461c2b7b59b9a13b77211304f57fa4727))
* **sdk:** relax CSPRNG autocorrelation threshold to resolve flaky CI failures ([a488950](https://github.com/Nekzus/LIOP/commit/a488950be18b1831e7640e760e74dafd01558dbd))
* **sdk:** remove redundant resolutions property in package.json to eliminate build warnings ([0c2550c](https://github.com/Nekzus/LIOP/commit/0c2550cb6d6d4658b39899aaf6593602a935dfa5))
* **sdk:** resolve biome linting and formatting issues ([3c9542d](https://github.com/Nekzus/LIOP/commit/3c9542de8d54b9071e7838a7524cc0b9a86a9bb3))
* **sdk:** resolve schema violations, parallelize discovery, and stabilize typings ([e317300](https://github.com/Nekzus/LIOP/commit/e31730036ec8d6b496601dc2357e6fb1c0fab229))
* **sdk:** resolve supply chain security issues by pruning deprecated transport dependencies ([772041f](https://github.com/Nekzus/LIOP/commit/772041ff6bedf139c55901148806567a6bbef3b4))
* **sdk:** resolve TypeScript compilation errors in demos and bridge tests ([58cc2d7](https://github.com/Nekzus/LIOP/commit/58cc2d7e13a24c143f9ac0f9f513f60e3692c0e9))
* **sdk:** restore standard npm overrides to bypass socket.dev public registry alerts ([be8a3e6](https://github.com/Nekzus/LIOP/commit/be8a3e6ef72e0e6c1cb9cb9e43711344108fae00))
* **sdk:** shim sublist on manifest buffer for Yamux compatibility ([5963277](https://github.com/Nekzus/LIOP/commit/5963277a425642284a9c62f54249d4741d299b10))
* **sdk:** suppress TS dependency drift error on libp2p PeerId cast ([63c3060](https://github.com/Nekzus/LIOP/commit/63c30607f20d84f1e9040db7b4fb31501681d781))
* **sdk:** synchronize release pipeline after tag reconstruction ([c3ed210](https://github.com/Nekzus/LIOP/commit/c3ed21019c30554970655cc0dd6f9c9e337be159))
* **sdk:** tighten router and mesh typing safeguards ([0519884](https://github.com/Nekzus/LIOP/commit/051988476f643b3c5f812acc4cee737eaed9493f))
* **sdk:** update documentation, keywords, and add code of conduct ([4e58ea0](https://github.com/Nekzus/LIOP/commit/4e58ea0b0f5807fb118cbddd5cc5a81a70d3a0c0))
* **sdk:** update entrypoints to match v1.2 LiopServer API and MeshNode lifecycle ([8d9b701](https://github.com/Nekzus/LIOP/commit/8d9b701515f545af6103c5058111050e0e4f776f))
* **sdk:** updated z.record strictness to match latest zod schema version parity ([e981fd4](https://github.com/Nekzus/LIOP/commit/e981fd4bbe1fd253f2913d80f9a0a787700cce3b))
* **sdk:** use absolute URL for logo in README for NPM compatibility ([b5fd847](https://github.com/Nekzus/LIOP/commit/b5fd847aa2196e6acc8006f418e6414aeb5b2062))
* **sdk:** use float for primitive noise test to avoid 0.5% integer collision ([1215a63](https://github.com/Nekzus/LIOP/commit/1215a633fa1a860707d356ab40076397aed0ebe0))
* **sdk:** use pseudo-Uint8ArrayList for Yamux native stream compatibility ([566797b](https://github.com/Nekzus/LIOP/commit/566797b55572011800240b74a9569c34c24f174a))
* **security:** document float stabilization in differential privacy engine test ([a3f856e](https://github.com/Nekzus/LIOP/commit/a3f856ee1ae2963d5ca03cae53a382ccb3133c3b))
* **security:** implement hybrid bitwise-string float scaling to bypass codeql taint tracking ([13c52b2](https://github.com/Nekzus/LIOP/commit/13c52b2a30f5bb309a560617e959294ef09d7dbf))
* **security:** implement hybrid bitwise-string float scaling to bypass codeql taint tracking ([be146f9](https://github.com/Nekzus/LIOP/commit/be146f99e79de4a26ab551817f505610766d7b4b))
* **security:** isolate query budget by session token to prevent cross-session budget leaks ([fe28590](https://github.com/Nekzus/LIOP/commit/fe28590cbaf6e313601e585d5fe66059c8945ef7))
* **security:** patch tmp path traversal vulnerability (GHSA-ph9p-34f9-6g65) ([2166ff3](https://github.com/Nekzus/LIOP/commit/2166ff34d06793a22a797a8b0bd58a67423b82a3))
* **security:** redact PII from all error messages — zero data leakage in responses ([1cbce81](https://github.com/Nekzus/LIOP/commit/1cbce81dd9f402410817a42eb4e41cad3ca31632))
* **security:** refactor laplace prng to use clean bitwise integer scaling and bypass codeql taint tracking ([c1c8455](https://github.com/Nekzus/LIOP/commit/c1c845586e694c5ff8af158dc681449d3ed2e659))
* **security:** refactor laplace prng to use clean bitwise integer scaling and bypass codeql taint tracking ([b3b73b7](https://github.com/Nekzus/LIOP/commit/b3b73b719f54c600481250eb5f7de8586866213c))
* **security:** remove quasi-identifier arrays from output schemas ([217e255](https://github.com/Nekzus/LIOP/commit/217e255bb56875a01d3471b63880a93e224c08f7))
* **security:** resolve audit vulnerabilities and guard offline test in docker-mesh-live ([8c8684a](https://github.com/Nekzus/LIOP/commit/8c8684a5d913c85b823bea82da69790ebda3f0d8))
* **security:** resolve codeql biased cryptographic random by breaking taint tracking ([9998b14](https://github.com/Nekzus/LIOP/commit/9998b14780e7bf9569bc87098f5cb6f9c45ba247))
* **security:** resolve codeql biased cryptographic random by breaking taint tracking ([0465627](https://github.com/Nekzus/LIOP/commit/0465627be4b419c8148bf3131814d362bda0c1e6))
* **security:** resolve CodeQL CWE-915 prototype-polluting assignment in resetFieldBudget ([714acc6](https://github.com/Nekzus/LIOP/commit/714acc6b8b91e4f8fda5684daa37b8e6284530df))
* **security:** resolve Dependabot vulnerabilities via workspace overrides and wasmtime update ([a662006](https://github.com/Nekzus/LIOP/commit/a662006c977489d49fd050599a37d659d6bf8c4e))
* **security:** resolve false-positive blocks on legitimate aggregation queries ([451c6d1](https://github.com/Nekzus/LIOP/commit/451c6d148994472babb608512d7c80d55ba1d1ab))
* **security:** suppress codeql biased random false positives in dp-engine ([ba2d8ea](https://github.com/Nekzus/LIOP/commit/ba2d8ea21984c85d6e3b1979a64f9498b045510c))
* **security:** suppress codeql biased random false positives in dp-engine ([d21826f](https://github.com/Nekzus/LIOP/commit/d21826fbac02be5b7f8d74f5fd1089932b182e1a))
* **security:** upgrade wasmtime and wasmtime-wasi to 48.0.1 in liop-node to resolve 17 Dependabot advisories ([f432302](https://github.com/Nekzus/LIOP/commit/f4323026012fb9ef214d41c40cdc4ab914320bee))
* **studio-ui:** guard telemetry rendering and inject bandwidth metrics across all transports ([7aebf87](https://github.com/Nekzus/LIOP/commit/7aebf87f0ca89a569c078b3772847af84bf91009))
* **studio:** implement genuine ML-KEM-768 encapsulation and AES-256-GCM sealing for gRPC transport ([5478ce1](https://github.com/Nekzus/LIOP/commit/5478ce18c07952285587e13746a53e1d77ea7eea))
* **studio:** relocate ignoreDeprecations to tsup config resolving IDE schema validation ([c34a408](https://github.com/Nekzus/LIOP/commit/c34a4084ebacc8cdffbfb7ca8d8b3cce2732260d))
* **studio:** resolve node types in tsconfig and explicitly import process across modules ([0068b31](https://github.com/Nekzus/LIOP/commit/0068b31a403ea2b03bfe77df6cf2e54d39ddd32d))
* **studio:** use pathToFileURL for Windows dynamic ESM loader compatibility ([dc68588](https://github.com/Nekzus/LIOP/commit/dc68588b936f5d684cea13049b6022295fb4604a))
* **tests:** align bank entrypoint with strict zod v4 z.record signature ([55b134e](https://github.com/Nekzus/LIOP/commit/55b134e7718d7bf2bc380fee201898ccdd5ce4ef))
* trigger patch release for sdk enhancements ([ad07262](https://github.com/Nekzus/LIOP/commit/ad07262fa756ba56ac53801c5a42ce6dafd88872))
* trim trailing whitespace in package description ([c659a83](https://github.com/Nekzus/LIOP/commit/c659a83bfc5a90dc08d9329bda52d55e942af0fc))


### Features

* **auth:** implement local token revocation list and pre-shared local test token bypass ([4214754](https://github.com/Nekzus/LIOP/commit/4214754fa520085a4a51b28e768371233e5f2caa))
* **bridge:** Graceful shutdown on MCP client disconnect to prevent EADDRINUSE ([38444f4](https://github.com/Nekzus/LIOP/commit/38444f47e7a2190264c1c74b4e8bc7ec5989069d))
* **ci:** implement verified GPG release signatures and clean multi-channel changelog segregation ([b980bb2](https://github.com/Nekzus/LIOP/commit/b980bb2ec27939720c50dc87afd223639e835a76))
* **deps:** support zod v4 validation engine and uint8arrays v6 runtime ([ec16f34](https://github.com/Nekzus/LIOP/commit/ec16f3457c6e911c4d874f7c18efde1165b370cd))
* **docs:** implement multi-language support (i18n) for Mintlify documentation [English/Spanish] ([1e1c188](https://github.com/Nekzus/LIOP/commit/1e1c1888192d5086e89bbfd0e9f2a93c36c62b80))
* **economy:** implement Token Economy Engine with real BPE tokenization & OTel gen_ai.* metrics - Phase 108: 8 dispatch points instrumented, o200k_base estimator, 27 new tests (151 total PASS) ([76ac53d](https://github.com/Nekzus/LIOP/commit/76ac53db2efd62d74aacebfe6b69cec31edd98e5))
* **economy:** Token Economy Engine — centralized protocol spec, compact envelope, telemetry ([459914c](https://github.com/Nekzus/LIOP/commit/459914c9a2df274a3785f2e7f6dd34a2c615a4fc))
* **gateway:** implement dual-era MCP v2 specification and agent guardrails ([9bb47f6](https://github.com/Nekzus/LIOP/commit/9bb47f6485924de89090c6b2c9407dd112635f37))
* **global:** Unificación total de marca LIOP y Paridad de Protocolo v1.0.0-alpha ([00bdc81](https://github.com/Nekzus/LIOP/commit/00bdc813aaa4599afdad60a8af90dca20c4cd593)), closes [Hi#Fidelity](https://github.com/Hi/issues/Fidelity)
* **hft:** optimize HFT microstructural simulation and security hardening ([112d5d7](https://github.com/Nekzus/LIOP/commit/112d5d77fb7750c74437b7872ba3c87bfe17f0c8))
* implement global remote resource attachment via manifest caching ([9d7c81f](https://github.com/Nekzus/LIOP/commit/9d7c81fdebbd4ad1b3551a0103f47d74039ce3cf))
* Implement initial NMP TypeScript SDK including client, server, mesh networking, and comprehensive integration tests. ([86e2b2f](https://github.com/Nekzus/LIOP/commit/86e2b2f835a89fb006d6338680b97eb4808c6ecd))
* implement Military Grade PII Shield (Luhn, Safe Words, NIST boundaries) (Phase 34) ([a610538](https://github.com/Nekzus/LIOP/commit/a610538a96551c5f67e788bdab4582a24fd12638))
* implement native sdk defensive serialization for logic-on-origin tool returns ([dbe764a](https://github.com/Nekzus/LIOP/commit/dbe764a288713256c91e7b2a45fc8d7962a3ab03))
* implement native sdk pii protection (the shield core) and refactor demo ([1c055b2](https://github.com/Nekzus/LIOP/commit/1c055b2de336a3acc264bdc7a130f2ffe1bf7c72))
* implement professional multi-layer PII engine (Phase 33) ([62f8257](https://github.com/Nekzus/LIOP/commit/62f825744d08216eb443de37042c18bd9c6a81a6))
* **infra:** jump to v1.4.0 to resolve persistent release loop ([f751963](https://github.com/Nekzus/LIOP/commit/f75196395ae3abd1d664f19b7117311223c2fbcb))
* **infra:** jump to v2.0.0-alpha to resolve persistent release loop ([79b4590](https://github.com/Nekzus/LIOP/commit/79b4590a14c4100766f5c2c00aa62562af072ba5))
* **license:** trigger Apache-2.0 package release with legal and trademark updates ([7b8b5a3](https://github.com/Nekzus/LIOP/commit/7b8b5a36c5e35d405f43ff0b0fd8ca55df1fb5fa))
* **llm:** implement full llms.txt standard, agent context files and GEO metadata ([5181ba0](https://github.com/Nekzus/LIOP/commit/5181ba0c482628e9706817a642c4ad9507dd4298))
* **mesh-node:** align manifest serving with official libp2p standards (Phase 80) ([0cafeeb](https://github.com/Nekzus/LIOP/commit/0cafeebafb8691b0c885fdea34ee6a721006eee9))
* **mesh:** harden network connectivity and resilience for global distributed deployment ([5abe8cd](https://github.com/Nekzus/LIOP/commit/5abe8cd3af4c3af32b9669223781f11083f5d51b))
* **mesh:** implement adaptive topology runtime, dual-era mcp v2 and pnet enclave architecture ([8509716](https://github.com/Nekzus/LIOP/commit/85097168cf0695203faad596d15d97956c35d072))
* **mesh:** integrate ML-DSA-65 manifest attestation, docker tokens, and optimize crossnet execution ([31424a6](https://github.com/Nekzus/LIOP/commit/31424a6f9b30f4b9843a6375bfd48abadc6d22cd))
* **mesh:** validate cross-platform discovery and industrial routing (Fase 104-105) ([96faaf7](https://github.com/Nekzus/LIOP/commit/96faaf7bdc0e9ea8156d96a569c2bac9add618f5))
* Neural Mesh Protocol - Full Industrial LOO Migration & Safety Alignment 🛡️🤖 ([1100dbe](https://github.com/Nekzus/LIOP/commit/1100dbe8a14341c777a2463ecd6d9b99e49d47c5))
* NMP Industrial High-Fidelity - Precision Logic Extraction & Spec Compliance ([6fd2152](https://github.com/Nekzus/LIOP/commit/6fd2152e57e17a408f9bfd14e06459a124a9d661)), closes [Hi#Fidelity](https://github.com/Hi/issues/Fidelity)
* **nmp-alpha:** complete alpha phase with e2e validation and cloudflare edge pivot ([f2eb84e](https://github.com/Nekzus/LIOP/commit/f2eb84ecdcaf2d31bd7a1ee72d84261c2885092a))
* **nmp-core:** Init Cargo workspace and nmp_core.proto definition ([c2bf566](https://github.com/Nekzus/LIOP/commit/c2bf5663caafd23366e125d949e03d396a521140))
* **nmp-mesh:** Final Alpha Release with Multi-Node Topology (squash) ([e265172](https://github.com/Nekzus/LIOP/commit/e265172a8362e5ed61017dbf74a6b5f49c76362b))
* **nmp:** complete Logic-on-Origin WebAssembly Push paradigm implementation ([71a2aef](https://github.com/Nekzus/LIOP/commit/71a2aef0dd4b7055460a5d0f863ce3d723cf23ab))
* **nmp:** implemented phase 2 sdk bridge and phase 3 streaming push watchdogs ([95eb77e](https://github.com/Nekzus/LIOP/commit/95eb77e9047d3f3ddfce9ab6a39895561925eda7))
* **observability:** deploy enterprise telemetry stack, wire egress tracking, and cluster stabilization ([de35cdf](https://github.com/Nekzus/LIOP/commit/de35cdf2cd535bd498ff4d1c701c04f4ff708225))
* **observability:** implement Phase Beta-3 metrics, K8s probes, audit logger, and tracing ([135f136](https://github.com/Nekzus/LIOP/commit/135f136f438919e51cd1c3d32e890a048d7ed3d7))
* phase 45 - perfect parity audit remediation (integrated workers, kyber, node:vm) ([9711cb5](https://github.com/Nekzus/LIOP/commit/9711cb56df56db975134ea1264eb7c76c9400069))
* **piscina:** implement worker pool asynchronous warmup ([ff70970](https://github.com/Nekzus/LIOP/commit/ff709704b3488a81d433956d792a20f59410f965))
* **playground:** add web playground, e2e client tests, and integrate graphify assistant tools ([7a6f790](https://github.com/Nekzus/LIOP/commit/7a6f79020e946daef70f6cc1436d2a47687d516b))
* **playground:** free-standing logo without container card, active tool cards, reset feedback, and search clear ([266724e](https://github.com/Nekzus/LIOP/commit/266724e6a1d2d0702e109eb03d7aeb7eb11fbdf4))
* **playground:** implement impeccable dual dark mode and cryptographic inspector ([62d1524](https://github.com/Nekzus/LIOP/commit/62d1524166260742045db3913851ecd8e69d0a3a))
* **playground:** implement sliding indicator animation with framer-motion and eliminate text jumping across all tab bars ([3772f9e](https://github.com/Nekzus/LIOP/commit/3772f9eed787078ae4e0ffbf711837eef3cb019d))
* **playground:** integrate AST fuel, token economy telemetry, and contrast themes ([fcfecb3](https://github.com/Nekzus/LIOP/commit/fcfecb32a552193e0ad8dfdc068543628289c7f7)), closes [#000000](https://github.com/Nekzus/LIOP/issues/000000) [#0f172a](https://github.com/Nekzus/LIOP/issues/0f172a)
* **router:** Inyectada topología Zero-Trust (NmpMeshStatus Expandido + Visibilidad de Origen en MCP Tools) ([873ca0e](https://github.com/Nekzus/LIOP/commit/873ca0edb4f34b41221afc5aef76e630a5710171))
* **rust-app:** empower nmp-server with ZK-SNARKs and TEE physical enclaves architecture ([25052fa](https://github.com/Nekzus/LIOP/commit/25052faf75c5dba664278efc572222d5109ebbd5))
* **sandbox:** implement pre-execution prototype freezing and strict mode in V8 isolate ([da34008](https://github.com/Nekzus/LIOP/commit/da340086024113db5f92df4e2b8af003fe36dc23))
* **sandbox:** implement recursive null prototype mapping and lock down Host prototypes ([b29cf31](https://github.com/Nekzus/LIOP/commit/b29cf311e3546318a249c0943ad77b427c2d772c))
* **sdk-ts:** fix gRPC executeLogic egress validation, resolving output schema mismatch for proxied calls and PII false positives from crypto signatures ([1f1d23c](https://github.com/Nekzus/LIOP/commit/1f1d23c31a07c0e63b24ea58c8638723c83a3ebe))
* **sdk:** achieve 100% industrial parity v1.2.0-alpha.x ([f4b59f5](https://github.com/Nekzus/LIOP/commit/f4b59f53fae1d4d9f2729c8506b5ffd690261a3c))
* **sdk:** achieve Tier-0 industrial standards for LIOP protocol. Integrated cryptographic verification (Kyber768), hardened WASI sandbox, and normalized logging. 100% test success rate (98/98). ([bebe433](https://github.com/Nekzus/LIOP/commit/bebe433931738fd54dbf3cba3fbf68bb9ba20b09))
* **sdk:** align MCP 2025-11-25, smart warm-up stabilization, adaptive DHT polling (Phase 106) ([695fdb7](https://github.com/Nekzus/LIOP/commit/695fdb75cd034d00d1dbe605a9f3c00880294de9))
* **sdk:** auto-detect and enable Docker address mapping in production mode ([ed4fb84](https://github.com/Nekzus/LIOP/commit/ed4fb841c4eaa8924705735d4630a54ca3158ab0))
* **sdk:** Cleanup console logs and dummy PQC mocks for Tier-0 rc ([f4d53d5](https://github.com/Nekzus/LIOP/commit/f4d53d530bccf192e81ea96df64ce23538a92ae5))
* **sdk:** document package audit findings and verify zero-bloat state ([e2a9cbe](https://github.com/Nekzus/LIOP/commit/e2a9cbe5d9a4a1acf29ea44753a735cbe29c58b4))
* **sdk:** document query budgets, isolate store paths per node, and add reset API (fases 148-150) ([162a9e0](https://github.com/Nekzus/LIOP/commit/162a9e0a4aea42a68fbc03e844cea5516839e3ea))
* **sdk:** Enforce Dynamic Return Structure (i18n) for LLM prompts ([9448827](https://github.com/Nekzus/LIOP/commit/94488274ab7448118c3bf60e00ca07877fb98174))
* **sdk:** env var isolation, fix tokenSlug and manifest propagation ([0b1957a](https://github.com/Nekzus/LIOP/commit/0b1957a1de23ea974322e38e87da616b787c7d17))
* **sdk:** eradicate mocks and harden TypeScript ZK parity [Fase 89.5] ([c3f7ff3](https://github.com/Nekzus/LIOP/commit/c3f7ff39b9857527b12d95e96320ba7d6a243f01))
* **sdk:** finalize industrial parity v1.2.0-beta ([73ffd2b](https://github.com/Nekzus/LIOP/commit/73ffd2b9a9ac22b9df6ec3ae42443e1d0aec5ce2)), closes [hi#level](https://github.com/hi/issues/level)
* **sdk:** fully synchronized discovery fix and updated project bitacora ([ec86481](https://github.com/Nekzus/LIOP/commit/ec86481b42b17d78ab95e450fee45ba57ad82ec5))
* **sdk:** harden dynamic routing and secure egress ([ff9fb43](https://github.com/Nekzus/LIOP/commit/ff9fb4390db38c3b6122bc96b850b86340ff9e79))
* **sdk:** implement AST-based taint tracking to mitigate PII exfiltration side-channels ([9f00d6e](https://github.com/Nekzus/LIOP/commit/9f00d6ec1735de895ac97aa61c64471917f173a6))
* **sdk:** implement context-aware PII scan and output sanitizer (Phase 135) ([7da3a09](https://github.com/Nekzus/LIOP/commit/7da3a09da9bf7a0aa1f720ce6e4bcb47364754d5))
* **sdk:** implement cross-network tests and auto-discovery ([b84da0d](https://github.com/Nekzus/LIOP/commit/b84da0ddc9b1671d440edfa9edf3982d3be6417f))
* **sdk:** implement dynamic tool discovery with LAN-DHT and Yamux native fallback ([84787d4](https://github.com/Nekzus/LIOP/commit/84787d4c22312be0ec350743f6ff5601894f539b))
* **sdk:** implement flexible PII_PRESETS and enforce GLOBAL_STRICT defaults ([bc2aea3](https://github.com/Nekzus/LIOP/commit/bc2aea3f32500732752f508015212a509b5c3339))
* **sdk:** Implement full MCP parity with NmpServer, Client, Bridge and 100% test coverage ([7e97db1](https://github.com/Nekzus/LIOP/commit/7e97db138c4069f89e426130341772c24a53a367))
* **sdk:** implement k-anonymity egress protection and security hardening ([bd7c725](https://github.com/Nekzus/LIOP/commit/bd7c725661d92ba091a95f269540d60dd7efc61f))
* **sdk:** implement native zk-receipt verification in bridge and client ([ec5f53d](https://github.com/Nekzus/LIOP/commit/ec5f53d35578c0577a8ded2261ce7a5cbfffbb9e))
* **sdk:** Implement Phase 3 native P2P, gRPC, and WASI execution in Node.js ([c61ae58](https://github.com/Nekzus/LIOP/commit/c61ae587887b5b58cf12429388b2322099f4fa49))
* **sdk:** implement Phase 91 Mesh Discovery with WAN Kademlia DHT, auto Bootstrap, and routing table persistence ([394753d](https://github.com/Nekzus/LIOP/commit/394753d8ed25126903e188988e4e3c89bb1165c4))
* **sdk:** implement Phase 92 Cross-AI Adaptors and Phase 93 PII Shield (SSN, IBAN, MRZ) ([fb7d900](https://github.com/Nekzus/LIOP/commit/fb7d900732b1cedeb25c46b66bd84850db05a6cb))
* **sdk:** implement procedural data generators and scale testing ([891bc28](https://github.com/Nekzus/LIOP/commit/891bc288f743adb917936c5fecc634416d1da19c))
* **sdk:** implement protocol-native directives and remove client-side preflight ([4eea0bb](https://github.com/Nekzus/LIOP/commit/4eea0bbcf3aefa8fa58cfc72669ff67c4c1c9738))
* **sdk:** Implement Zero-Shot Autonomy for NMP Server Logic-on-Origin. Add system prompt 'nmp_blind_analyst' and Educative Shield middleware to tool registration. Update bridge for prompt handling. Fix wasi-sandbox env variable exposure. ([455a755](https://github.com/Nekzus/LIOP/commit/455a755a61f6e61bbc8a6dfbfc700b0f876c98ca))
* **sdk:** improve mesh stability, non-blocking discovery and stream handling ([5905961](https://github.com/Nekzus/LIOP/commit/5905961838cc9b21394ba0e07a2b30b501e2af18))
* **sdk:** industrial neural mesh stabilization and zero-shot autonomy ([dd53633](https://github.com/Nekzus/LIOP/commit/dd53633942aefb48ed398688ad672a11c6fe46b0))
* **sdk:** inject dynamic PII forbidden keys into Zero-Shot Payload instruction ([dd75e1b](https://github.com/Nekzus/LIOP/commit/dd75e1be05d3bea0ad98c501baa4c68483533fb6))
* **sdk:** inject explicit 'return' statement warning in Zero-Shot middleware ([07b9394](https://github.com/Nekzus/LIOP/commit/07b93947dc135042b5fa802f6eb7b26c8dc01c89))
* **sdk:** migrate examples to fully containerized sub-packages utilizing pnpm workspaces for true modularity mimicking MCP ecosystem ([6ca41d6](https://github.com/Nekzus/LIOP/commit/6ca41d69442e8c754f6e968773cf6789bc165f9d))
* **sdk:** migrate PQC to FIPS 203 (mlkem), harden gRPC/Piscina, bump libp2p patches ([8c2caa5](https://github.com/Nekzus/LIOP/commit/8c2caa5810b5b55aaf70fc567324021f59f5ba20))
* **sdk:** modernize to McpServer API, silence console & industrialize Tier-0 stability ([c600c27](https://github.com/Nekzus/LIOP/commit/c600c27ae2ac330fa10dc2571f99d2bb311b3166))
* **sdk:** native TLS auto-relaunch with --use-system-ca ([7c1f9e4](https://github.com/Nekzus/LIOP/commit/7c1f9e4724b5a773c7a17fbd868dde51f72769b6))
* **sdk:** NMP Phase 19 - Universal MCP Bridge, Egress Filter & Zero-Shot Schema Discovery ([fd5b811](https://github.com/Nekzus/LIOP/commit/fd5b811abcc507e62e5508d9b389ccfd4d26b5e1))
* **sdk:** phase 94 production hardening (logger, env cfg, mcp types, test isolation) ([f6477a2](https://github.com/Nekzus/LIOP/commit/f6477a2612d9525571270963288736772de1ac01))
* **sdk:** Phase 96 - Implement Logic Guard Policies & Schema Enforcement ([68207c1](https://github.com/Nekzus/LIOP/commit/68207c1c41c42432599bff4c312d7f24f68882a2))
* **sdk:** promote alpha channel features to stable release ([85e5e7b](https://github.com/Nekzus/LIOP/commit/85e5e7b9dab792f32fe0807403121645f45f5429))
* **sdk:** relax blind analyst return constraints to allow flexible generic logic payloads ([b87d92a](https://github.com/Nekzus/LIOP/commit/b87d92a97c94e50578c0cef63da7305ff34e1d4d))
* **sdk:** rename bin liop-agent to liop for industry-standard npx auto-resolution ([4c3a707](https://github.com/Nekzus/LIOP/commit/4c3a707808c6fc9a62eed5d01764ed41561e50be))
* **sdk:** Restore native logging and implement zero-trust logic-execution tests ([2497228](https://github.com/Nekzus/LIOP/commit/249722860ef1621814d294bbb5717e2a802ed8d5))
* **sdk:** stabilize hybrid gateway and enable health check endpoint ([07f6b34](https://github.com/Nekzus/LIOP/commit/07f6b3473526e74c296ed138d5cc4b563084ef2d))
* **sdk:** Tier-0 Crypto Parity with Kyber768 & AES-256-GCM ([829eccf](https://github.com/Nekzus/LIOP/commit/829eccf621ab75844008d23a8f446ed5ab6d0ee5))
* **sdk:** Vanguard Enterprise Architecture (PQC, TCP, ZK, Guardian-TS & Piscina Worker Pool) ([125cb94](https://github.com/Nekzus/LIOP/commit/125cb943d475363fcbb90c0cdca21c67e7b1c9ed))
* **security:** implement conditional egress error opacity and timing attack defense ([a64c5ba](https://github.com/Nekzus/LIOP/commit/a64c5ba8a4e78a7a92f4181466b0fa5d69c3d2d4))
* **security:** Implement Deterministic Differential Privacy (DDP) mode ([8ba1aab](https://github.com/Nekzus/LIOP/commit/8ba1aab45c73d9f1e96a09ad3d50302c877b3922))
* **security:** implement embedded OAuth 2.1 authorization server in Nexus (Phase C) ([9a2b9eb](https://github.com/Nekzus/LIOP/commit/9a2b9ebc190286fbaa478307348a380955809720))
* **security:** Implement Hybrid PQC (Kyber768), AES-GCM, and TEE Stubs for Phase 4 Zero-Trust Architecture ([dd06fb5](https://github.com/Nekzus/LIOP/commit/dd06fb53a2a7ae66f2fde4420f1de5198e9945ff))
* **security:** implement OAuth 2.1 hybrid auth foundation and gateway validation (Fases A y B) ([2e44a53](https://github.com/Nekzus/LIOP/commit/2e44a537c8274618d3d7635a1ac9b17c39614a4c))
* **security:** implement Phase Beta-2 advanced security, post-quantum signatures, and firewall resilience ([56dfc7a](https://github.com/Nekzus/LIOP/commit/56dfc7ad993ae467c0cb4913122a9286aedcc935))
* **security:** implement tiered query budget and mitigate generator bypass ([a1a21eb](https://github.com/Nekzus/LIOP/commit/a1a21ebc2fbafa28862e1952f581ec85204bfc93))
* **security:** implement ZK-Receipt replay mitigation and complete docs parity audit ([114c1a2](https://github.com/Nekzus/LIOP/commit/114c1a2b2c7721b4576630a7376db04c834b81a7))
* **security:** integrate zero-time ast guardian and libp2p kademlia dht caching ([2135346](https://github.com/Nekzus/LIOP/commit/21353463e6e0942ab30efbeb94a8e88a79dced2b))
* **security:** Phase 112 industrial security hardening of the TS SDK ([0c54a28](https://github.com/Nekzus/LIOP/commit/0c54a28a502d46a4e8ff8107254ac2eab81fe22f))
* **security:** PII Egress Shield v3 — defense-in-depth with NER, fuzzy matching & strict schemas ([37c5a60](https://github.com/Nekzus/LIOP/commit/37c5a60881cd2c174676d47b200d49a38f1903a1))
* **security:** stabilize M2M client_secret_post auth, prevent duplicate oidc paths and secure undefined outputs in worker ([49d81e8](https://github.com/Nekzus/LIOP/commit/49d81e8fa57cdf1ef10d7213d1ab2ad66195778f))
* **socket:** add opentelemetry/api to noExternal to fix npx ERR_MODULE_NOT_FOUND error ([bac6c2d](https://github.com/Nekzus/LIOP/commit/bac6c2d6a41f216cb58ebd78f66435d17a9ae072))
* **socket:** add security auditing tools and document supply chain validation ([77a45b9](https://github.com/Nekzus/LIOP/commit/77a45b9fae2af45241fb4a71809e60052cd5fc7a))
* **socket:** consolidate unminified bundle and restore performance path ([a28ec70](https://github.com/Nekzus/LIOP/commit/a28ec70b84664c83ec3d7c0df29755008cb165b2))
* **socket:** disable tsup minification to eliminate minifiedFile alerts ([ed6def1](https://github.com/Nekzus/LIOP/commit/ed6def18eb818fa72b8f92ad8c11c4803106875a))
* **socket:** restore noExternal for performance and keep unminified bundle ([729e199](https://github.com/Nekzus/LIOP/commit/729e199b07462091da895a5c24de7f001a2c43e0))
* **studio:** contextual node capability resolution and domain discrimination in gRPC transport ([c869785](https://github.com/Nekzus/LIOP/commit/c869785c95af6b8f2573c92174c20530c69e69f3))
* **studio:** distill UI with impeccable standards, pure live telemetry, and zero AI slop ([f44b0fc](https://github.com/Nekzus/LIOP/commit/f44b0fcf805c74eca50541641066a129ac5bc596))
* **studio:** dynamic server scan node discovery and proactive template domain guards ([b35a048](https://github.com/Nekzus/LIOP/commit/b35a048e14c7d3dbee818889792d5c4d7bb836a8))
* **studio:** enterprise observability and sovereignty cockpit architecture ([67eeba3](https://github.com/Nekzus/LIOP/commit/67eeba33fc7039d547388a0c9a7d66d620620891))
* **studio:** implement sovereign liop-studio package with multi-transport architecture ([64e9a2d](https://github.com/Nekzus/LIOP/commit/64e9a2de19914b50d6a390da439d3ed68fb0c642))
* **studio:** sovereignty dj command deck and dual persona showcase architecture ([c0636eb](https://github.com/Nekzus/LIOP/commit/c0636ebae26f592933709518242a293f5b3a1c96))
* **studio:** transform into developer workbench with schema inspector, code exporter, ast validator, and 4-tab debug console (Phase 196) ([87fc644](https://github.com/Nekzus/LIOP/commit/87fc644b239f6ae031bae0b041c53cbb56bdbbb0))
* **ts-sdk:** implement persistent query budget store and fix ESM entrypoints ([ce5d3bc](https://github.com/Nekzus/LIOP/commit/ce5d3bca22d732e6da513e7f409d5f4c8b9a1c81))
* **typescript:** finalize Tier-0 industrial parity & worker pool resiliency ([fa97150](https://github.com/Nekzus/LIOP/commit/fa97150af6448772149d6111b0f9708716dad170))


### Performance Improvements

* **economy:** inline o200k_base tokenizer and reduce package footprint ([1241cd6](https://github.com/Nekzus/LIOP/commit/1241cd60c8ac588b5dc21d5348ed1cc4972ec48c))
* **economy:** merge inlined o200k_base tokenizer optimization into alpha ([f9531b4](https://github.com/Nekzus/LIOP/commit/f9531b4cb25451b9f11397e6ee3d0306033bdc8c))
* **playground:** optimize latency to <500ms and revamp ui with impeccable craft-floor ([062a32c](https://github.com/Nekzus/LIOP/commit/062a32cd65ac358c3f187c201ebca50567b9acd9))
* **sdk:** cache-first tool routing, TTL 300s, early-exit refresh, actionable HINT (Phase 107) ([279dced](https://github.com/Nekzus/LIOP/commit/279dceddd78f869cb113ba845e3ac9aa9e2e7310))
* **sdk:** optimize package score by purging unused deps and bundling pure libraries ([332d639](https://github.com/Nekzus/LIOP/commit/332d639de9d6b83dd06aaf7b9078c8ef255a9253))


### Reverts

* restore original picture element for SDK README logo ([3de18a5](https://github.com/Nekzus/LIOP/commit/3de18a5c19e14b8aba7b5d450135a1eb20f72079))


### BREAKING CHANGES

* **infra:** Forced major version bump to stabilize infrastructure and bypass NPM registry conflicts.

# [2.4.0-alpha.9](https://github.com/Nekzus/LIOP/compare/v2.4.0-alpha.8...v2.4.0-alpha.9) (2026-09-14)


### Bug Fixes

* **studio:** resolve node types in tsconfig and explicitly import process across modules ([0068b31](https://github.com/Nekzus/LIOP/commit/0068b31a403ea2b03bfe77df6cf2e54d39ddd32d))

# [2.4.0-alpha.8](https://github.com/Nekzus/LIOP/compare/v2.4.0-alpha.7...v2.4.0-alpha.8) (2026-09-14)


### Bug Fixes

* **audit:** harden docker entrypoint wrapper and declare default CMD for test runner ([4e146db](https://github.com/Nekzus/LIOP/commit/4e146db70911aed1a0df922984903a3389e38e54))
* **client:** adaptive OAuth 2.1 M2M token auto-refresh and resilient intent negotiation ([16257c7](https://github.com/Nekzus/LIOP/commit/16257c7d3e87c5db6db3cf760b7386801c02b0b8))
* **deps:** override browserslist to >=4.28.7 resolving GHSA-c83g-rgw3-j3cx and GHSA-73wf-gq98-2v4g ([e6cbf0c](https://github.com/Nekzus/LIOP/commit/e6cbf0c22f78dbdea0826dd81ee8d77473f60773))
* **liop-studio:** enforce radical zero-trust offline network transparency and eliminate fallback mocks ([1a3d22d](https://github.com/Nekzus/LIOP/commit/1a3d22d7d161d1ea3dacef620dcd31da678ec50f))
* **playground:** eliminate hardcoded node counts and synchronize dynamic topology stats ([743205a](https://github.com/Nekzus/LIOP/commit/743205a07342528c3d27d02fb3a06aa8aa4cf335))
* **studio-ui:** guard telemetry rendering and inject bandwidth metrics across all transports ([7aebf87](https://github.com/Nekzus/LIOP/commit/7aebf87f0ca89a569c078b3772847af84bf91009))
* **studio:** implement genuine ML-KEM-768 encapsulation and AES-256-GCM sealing for gRPC transport ([5478ce1](https://github.com/Nekzus/LIOP/commit/5478ce18c07952285587e13746a53e1d77ea7eea))
* **studio:** relocate ignoreDeprecations to tsup config resolving IDE schema validation ([c34a408](https://github.com/Nekzus/LIOP/commit/c34a4084ebacc8cdffbfb7ca8d8b3cce2732260d))
* **studio:** use pathToFileURL for Windows dynamic ESM loader compatibility ([dc68588](https://github.com/Nekzus/LIOP/commit/dc68588b936f5d684cea13049b6022295fb4604a))


### Features

* **mesh:** implement adaptive topology runtime, dual-era mcp v2 and pnet enclave architecture ([8509716](https://github.com/Nekzus/LIOP/commit/85097168cf0695203faad596d15d97956c35d072))
* **observability:** deploy enterprise telemetry stack, wire egress tracking, and cluster stabilization ([de35cdf](https://github.com/Nekzus/LIOP/commit/de35cdf2cd535bd498ff4d1c701c04f4ff708225))
* **playground:** integrate AST fuel, token economy telemetry, and contrast themes ([fcfecb3](https://github.com/Nekzus/LIOP/commit/fcfecb32a552193e0ad8dfdc068543628289c7f7)), closes [#000000](https://github.com/Nekzus/LIOP/issues/000000) [#0f172a](https://github.com/Nekzus/LIOP/issues/0f172a)
* **studio:** contextual node capability resolution and domain discrimination in gRPC transport ([c869785](https://github.com/Nekzus/LIOP/commit/c869785c95af6b8f2573c92174c20530c69e69f3))
* **studio:** distill UI with impeccable standards, pure live telemetry, and zero AI slop ([f44b0fc](https://github.com/Nekzus/LIOP/commit/f44b0fcf805c74eca50541641066a129ac5bc596))
* **studio:** dynamic server scan node discovery and proactive template domain guards ([b35a048](https://github.com/Nekzus/LIOP/commit/b35a048e14c7d3dbee818889792d5c4d7bb836a8))
* **studio:** enterprise observability and sovereignty cockpit architecture ([67eeba3](https://github.com/Nekzus/LIOP/commit/67eeba33fc7039d547388a0c9a7d66d620620891))
* **studio:** implement sovereign liop-studio package with multi-transport architecture ([64e9a2d](https://github.com/Nekzus/LIOP/commit/64e9a2de19914b50d6a390da439d3ed68fb0c642))
* **studio:** sovereignty dj command deck and dual persona showcase architecture ([c0636eb](https://github.com/Nekzus/LIOP/commit/c0636ebae26f592933709518242a293f5b3a1c96))
* **studio:** transform into developer workbench with schema inspector, code exporter, ast validator, and 4-tab debug console (Phase 196) ([87fc644](https://github.com/Nekzus/LIOP/commit/87fc644b239f6ae031bae0b041c53cbb56bdbbb0))

# [2.4.0-alpha.7](https://github.com/Nekzus/LIOP/compare/v2.4.0-alpha.6...v2.4.0-alpha.7) (2026-09-01)


### Features

* **llm:** implement full llms.txt standard, agent context files and GEO metadata ([5181ba0](https://github.com/Nekzus/LIOP/commit/5181ba0c482628e9706817a642c4ad9507dd4298))

# [2.4.0-alpha.6](https://github.com/Nekzus/LIOP/compare/v2.4.0-alpha.5...v2.4.0-alpha.6) (2026-08-30)


### Bug Fixes

* **security:** upgrade wasmtime and wasmtime-wasi to 48.0.1 in liop-node to resolve 17 Dependabot advisories ([f432302](https://github.com/Nekzus/LIOP/commit/f4323026012fb9ef214d41c40cdc4ab914320bee))

# [2.4.0-alpha.5](https://github.com/Nekzus/LIOP/compare/v2.4.0-alpha.4...v2.4.0-alpha.5) (2026-08-29)


### Bug Fixes

* **deps:** map lodash-es to lodash >=4.18.1 and add dependabot configuration ([3e53097](https://github.com/Nekzus/LIOP/commit/3e53097ec3b2f0f34e9a8de374b9e52f536dda73))
* **deps:** restore pure ESM lodash-es >=4.17.21 for semantic-release compatibility ([db1141b](https://github.com/Nekzus/LIOP/commit/db1141bab4a8b33b87fc6b9d1451cc59649a5bbb))

# [2.4.0-alpha.4](https://github.com/Nekzus/LIOP/compare/v2.4.0-alpha.3...v2.4.0-alpha.4) (2026-08-29)


### Bug Fixes

* **deps:** bump lodash override to >=4.18.1 for CVE-2026-4800 remediation ([c2dc3bd](https://github.com/Nekzus/LIOP/commit/c2dc3bd5be41b69779d33933019299ebfc0e14b3))

# [2.4.0-alpha.3](https://github.com/Nekzus/LIOP/compare/v2.4.0-alpha.2...v2.4.0-alpha.3) (2026-08-29)


### Bug Fixes

* **security:** resolve Dependabot vulnerabilities via workspace overrides and wasmtime update ([a662006](https://github.com/Nekzus/LIOP/commit/a662006c977489d49fd050599a37d659d6bf8c4e))

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
