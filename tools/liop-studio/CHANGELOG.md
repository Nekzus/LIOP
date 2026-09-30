# LIOP Studio Changelog

All notable changes to @nekzus/liop-studio will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.1.1](https://github.com/Nekzus/LIOP/compare/studio-v1.1.0...studio-v1.1.1) (2026-09-30)


### Bug Fixes

* **security:** resolve fast-uri and undici high CVEs in pnpm-workspace.yaml ([8ed031c](https://github.com/Nekzus/LIOP/commit/8ed031ca8ea3603244cde8838de54e14d919aeed))

# [1.1.0](https://github.com/Nekzus/LIOP/compare/studio-v1.0.0...studio-v1.1.0) (2026-09-28)


### Bug Fixes

* **ci:** automate Mintlify docs.json version update in semantic-release ([23b99cc](https://github.com/Nekzus/LIOP/commit/23b99cce2eee8570614ce95574a57d6683ceb1e5))
* **ci:** automate Mintlify docs.json version update in semantic-release ([11b91a1](https://github.com/Nekzus/LIOP/commit/11b91a1d209aaed82279e7ba5b8ec8da55383b86))
* **ci:** promote Mintlify docs.json release automation to beta ([44eb363](https://github.com/Nekzus/LIOP/commit/44eb36320d0eb82f5cc04b205032c3d5b816d9fb))
* **docs:** resolve npmjs logo CDN paths, sync Mintlify v2.6.0, and automate metadata sync ([17a265a](https://github.com/Nekzus/LIOP/commit/17a265aee72f0ee2184623a886c092f9fe59e01e))
* **sdk:** promote documentation, logo CDN fixes, and segregated changelog to beta ([62be4d6](https://github.com/Nekzus/LIOP/commit/62be4d63673a764e34eea97540d994e3db56d175))
* **sdk:** resolve npmjs logo CDN paths, update Mintlify navbar, and enforce pure stable changelog ([6a0e15d](https://github.com/Nekzus/LIOP/commit/6a0e15dfc043ed593c4181cf890892f22324f7c5))
* **tests:** enable zkMode optimistic in entrypoint policies for Groth16 v2 verification ([7169d5a](https://github.com/Nekzus/LIOP/commit/7169d5aa89a530c29ddb7013aa3b51ab444d291b))
* **types:** declare ambient module for optional @nekzus/liop-zk-native ([8359dd6](https://github.com/Nekzus/LIOP/commit/8359dd63bd63e125b3d039349b20ea290ccecbb4))
* **zk:** reject dummy proof buffer in required mode ([f95a13b](https://github.com/Nekzus/LIOP/commit/f95a13beb7b127bffd319caa182716a16c056843))


### Features

* **audit:** enable ML-DSA-65 post-quantum signing in banking and healthcare enclaves ([ceac5b8](https://github.com/Nekzus/LIOP/commit/ceac5b8791d09e50b6b7b7703a5dc1242f956cde))
* **gateway:** add canonical tool aliasing and elastic parameter normalization ([b8cadef](https://github.com/Nekzus/LIOP/commit/b8cadef064a43e5e4a68e9f23ef836161903b836))
* **pqc:** implement ML-DSA-65 hybrid receipts with FIPS 204 co-signing ([37b4e13](https://github.com/Nekzus/LIOP/commit/37b4e13d0b3a6dd91a96320ec59e202419356256))
* **proto:** evolve liop_core.proto with ProofMode and ProofType enums ([9c01468](https://github.com/Nekzus/LIOP/commit/9c01468895088122b152cf8156324679168bc1c3))
* **sdk:** promote alpha channel features to beta staging ([0fef16e](https://github.com/Nekzus/LIOP/commit/0fef16e399b2b0002ca2954aa98f48f2aa2fd20e))
* **sdk:** promote beta staging features to stable production release ([9951e80](https://github.com/Nekzus/LIOP/commit/9951e80c3280ac7b3378807198c2252068b85c59))
* **security:** isolate logic workers with jitless and poison timing side-channels ([cc36e83](https://github.com/Nekzus/LIOP/commit/cc36e8335773d83c668d583f4b6f43a08bdacac2))
* **server:** enforce ZK_BLOCKING policy and DHT manifest attestation ([6665d39](https://github.com/Nekzus/LIOP/commit/6665d3953d535e4ec85d8837cf5734243db1cd4a))
* **zk-native:** scaffold NAPI crate with R1CS analytical circuits and universal zkVM fallback ([3499bc4](https://github.com/Nekzus/LIOP/commit/3499bc4b1c98f06180ff1c4bb88e245c01f29db3))
* **zk:** complete Phase 1 ZK-VM TypeScript SDK verification engine ([7123f25](https://github.com/Nekzus/LIOP/commit/7123f2539b6dc136f35e114f792f3526c361274b))
* **zkvm:** implement SP1 guest scaffold, TEE pre-flight attestation, and SIMD acceleration matrix ([8dc6dbb](https://github.com/Nekzus/LIOP/commit/8dc6dbb4777b292aa580d467dd122a0a5f01aa39))


### Performance Improvements

* **sdk:** enable production minification with keepNames symbol preservation ([739e047](https://github.com/Nekzus/LIOP/commit/739e0474ce2c0a7820f0a5a40ede28c42d240464))
* **sdk:** optimize bundle size by excluding source maps and externalizing gpt-tokenizer ([3009439](https://github.com/Nekzus/LIOP/commit/3009439c6fce61a27d682542a9d49a7e535382a3))

# 1.0.0 (2026-09-22)


### Features

* **studio:** comprehensive audit, CodeMirror 6 editor, session telemetry, and persistent history ([ef9dda0](https://github.com/Nekzus/LIOP/commit/ef9dda015078ebc203caca8924ef6cc784ff1c40))
* **studio:** implement genuine ML-KEM-768 encapsulation and AES-256-GCM sealing for gRPC transport ([5478ce1](https://github.com/Nekzus/LIOP/commit/5478ce18c07952285587e13746a53e1d77ea7eea))
* **studio:** public mesh introspection getters and unsafe cast elimination ([0c66cb9](https://github.com/Nekzus/LIOP/commit/0c66cb9f8639cde7b5cceae84ec7baef41e78e20))
* **rpc:** granular TLS options and warning suppression for local and studio targets ([4c606f8](https://github.com/Nekzus/LIOP/commit/4c606f86db522aac94dcf2b5a3e96fab094c5ce7))


### Bug Fixes

* **liop-studio:** enforce radical zero-trust offline network transparency and eliminate fallback mocks ([1a3d22d](https://github.com/Nekzus/LIOP/commit/1a3d22d7d161d1ea3dacef620dcd31da678ec50f))
* **studio-ui:** guard telemetry rendering and inject bandwidth metrics across all transports ([7aebf87](https://github.com/Nekzus/LIOP/commit/7aebf87f0ca89a569c078b3772847af84bf91009))
* **studio:** package UI dist and resolve absolute static root for npx ([bedf739](https://github.com/Nekzus/LIOP/commit/bedf739dc0ef4e72f4742536c49c63646dda7b22))
* **studio:** relocate ignoreDeprecations to tsup config resolving IDE schema validation ([c34a408](https://github.com/Nekzus/LIOP/commit/c34a4084ebacc8cdffbfb7ca8d8b3cce2732260d))
* **studio:** resolve node types in tsconfig and explicitly import process across modules ([0068b31](https://github.com/Nekzus/LIOP/commit/0068b31a403ea2b03bfe77df6cf2e54d39ddd32d))
* **studio:** stabilize UI network polling dependencies and deterministic template routing ([0cc91db](https://github.com/Nekzus/LIOP/commit/0cc91dbd731b011980ff1a849866be25fa98dcfa))
* **studio:** synchronize active connected target and auto-route template capabilities ([1e73af1](https://github.com/Nekzus/LIOP/commit/1e73af1bde607570b2690834ef0f1b49842c1755))
* **studio:** use pathToFileURL for Windows dynamic ESM loader compatibility ([dc68588](https://github.com/Nekzus/LIOP/commit/dc68588b936f5d684cea13049b6022295fb4604a))
