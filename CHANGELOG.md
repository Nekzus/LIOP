# Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
