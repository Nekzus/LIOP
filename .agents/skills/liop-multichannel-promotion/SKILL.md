---
name: liop-multichannel-promotion
description: Complete step-by-step runbook for promoting changes across LIOP's 3-channel topology (alpha -> beta -> main). Enforces ephemeral promotion branches, PR-driven merges, test harness channel parity, changelog segregation, GPG commit signing, and CI failure guardrails.
---

# LIOP Multi-Channel Promotion Runbook: alpha → beta → main

This skill defines the canonical, production-grade promotion procedure for the Logic-Injection-on-Origin Protocol (LIOP) repository. It operationalizes the strict **Alpha-First** architectural invariant, multi-channel release isolation, and cryptographically verified release workflows.

---

## 1. Architectural Principles & Invariants

1. **Strict PR-Driven Lifecycle (Zero Direct Merges)**:
   - Merging directly or pushing commits manually into protected branches (`beta` or `main`) is strictly prohibited.
   - All integrations into `beta` and `main` must originate from ephemeral promotion branches (`promote-alpha-to-beta` and `promote-beta-to-main`) and merge via signed GitHub Pull Requests with all CI status checks passing green.
2. **Channel-Segregated Changelogs**:
   - `alpha` records only `2.4.0-alpha.X` iterations.
   - `beta` records only `2.5.0-beta.X` staging pre-releases.
   - `main` records exclusively pure stable production versions (`2.6.X`, `2.7.X`).
   - Prior to committing on a promotion branch, changelogs must be restored from the destination branch (`git checkout origin/<target> -- CHANGELOG.md tools/liop-studio/CHANGELOG.md`) to prevent merge conflicts (`Can't automatically merge`) and cross-channel pollution.
3. **SemVer Baseline Preservation**:
   - Manually resolve `package.json` merge conflicts to retain the target branch's baseline version (`2.5.0-beta.X` for beta; `2.7.X` for main). This enables `@semantic-release/commit-analyzer` to compute the exact SemVer bump for the release channel.
4. **Test Harness & Dockerfile Channel Parity**:
   - Containerized test suites (`Dockerfile.production`), mock playgrounds (`playground.ts`), and package integrity tests (`00-npm-integrity.test.ts`) must install and test the exact published package tag corresponding to the channel (`@beta` on beta; `@latest` on main).
5. **GraphQL Release Blindness Invariant**:
   - Release configuration files (`release.sdk.config.js` and `tools/liop-studio/release.config.js`) must configure `successComment: false` on `@semantic-release/github`.
   - Pull Request descriptions must avoid synthetic auto-closing directives (`Fixes #` or `Closes #`) with unverified numbers to prevent fatal GraphQL API lookup errors (`Could not resolve to an issue or pull request with the number of X`).
6. **Dependabot Automated PR Rejection (Alpha-First)**:
   - Automated PRs opened by Dependabot directly against `main` or `beta` must be closed without merging. All CVE resolutions and dependency overrides must be configured centrally in `pnpm-workspace.yaml` under `alpha`, verified with `pnpm audit`, and promoted sequentially.
7. **Ephemeral Branch Cleanup**:
   - Promotion branches must be deleted immediately after GitHub confirms the pull request merge (`git branch -D` and `git push origin --delete`) to maintain a clean three-branch repository topology.

---

## 2. Test Harness & Deployment Configuration Matrix

| Target Channel | Published Tag to Install | Dockerfile Label | `playground.ts` Tag | `00-npm-integrity.test.ts` Title | Version Baseline (`package.json`) |
|:---|:---|:---|:---|:---|:---|
| `alpha` | `@nekzus/liop@alpha`<br>`@nekzus/liop-studio@alpha` | `production-alpha` | `@nekzus/liop@alpha` | `(@nekzus/liop@alpha)` | `2.4.0-alpha.X` |
| `beta` | `@nekzus/liop@beta`<br>`@nekzus/liop-studio@beta` | `production-beta` | `@nekzus/liop@beta` | `(@nekzus/liop@beta)` | `2.5.0-beta.X` |
| `main` | `@nekzus/liop@latest`<br>`@nekzus/liop-studio@latest` | `production-main` | `@nekzus/liop@latest` | `(@nekzus/liop@latest)` | `2.7.X` |

---

## 3. Phase 1: Promoting from `alpha` to `beta` (Staging)

### Step 1: Branch Creation & Target Merge
```bash
git checkout alpha
git pull --ff-only origin alpha
git checkout -b promote-alpha-to-beta alpha
git fetch origin beta
git merge origin/beta --no-commit
```

### Step 2: Channel File Resolution
1. Restore beta changelogs:
   ```bash
   git checkout origin/beta -- CHANGELOG.md tools/liop-studio/CHANGELOG.md
   ```
2. In `sdks/typescript/package.json`: resolve the `"version"` conflict to the current beta baseline (e.g. `"2.5.0-beta.4"`).
3. In `tools/liop-studio/package.json`: resolve the `"version"` conflict to the current studio beta baseline (e.g. `"1.0.0-beta.4"`).
4. In `sdks/typescript/tests/infra/production-audit/Dockerfile.production`:
   - Set tag: `@nekzus/liop@beta` and `@nekzus/liop-studio@beta`.
   - Set label: `LABEL org.nekzus.liop.audit="production-beta"`.
5. In `sdks/typescript/tests/infra/production-audit/entrypoints/playground.ts`:
   - Set package: `package: "@nekzus/liop@beta"`.
6. In `sdks/typescript/tests/infra/production-audit/tests/00-npm-integrity.test.ts`:
   - Set title: `(@nekzus/liop@beta)`.
7. Verify `successComment: false` is configured in `release.sdk.config.js` and `tools/liop-studio/release.config.js`.

### Step 3: Local Quality Certification
```bash
pnpm run check
pnpm install --frozen-lockfile
pnpm test
```
All commands must exit with code 0 (0 errors, 0 warnings, 0 lockfile drift, 100% tests green).

### Step 4: Cryptographic Commit & Push
```bash
git add .
git commit -S -m "chore(promotion): prepare alpha to beta staging promotion"
git push -u origin promote-alpha-to-beta
```

### Step 5: Pull Request #1 Opening
- **PR Title**:
  ```text
  chore(promotion): promote <feature/fix description> to beta staging
  ```
- **PR URL**:
  `https://github.com/Nekzus/LIOP/compare/beta...promote-alpha-to-beta?expand=1`
- Complete the PR template (see Section 5).
- After GitHub CI passes, merge the PR into `beta`.

### Step 6: Post-Merge Verification & Cleanup
1. Confirm package publication on NPM:
   ```bash
   npm view @nekzus/liop dist-tags --json
   npm view @nekzus/liop-studio dist-tags --json
   ```
2. Delete ephemeral branch:
   ```bash
   git checkout alpha
   git branch -D promote-alpha-to-beta
   git push origin --delete promote-alpha-to-beta
   ```

---

## 4. Phase 2: Promoting from `beta` to `main` (Production)

### Step 1: Branch Creation & Target Merge
```bash
git fetch origin beta main
git checkout -b promote-beta-to-main origin/beta
git merge origin/main --no-commit
```

### Step 2: Channel File Resolution
1. Restore pure main changelogs:
   ```bash
   git checkout origin/main -- CHANGELOG.md tools/liop-studio/CHANGELOG.md
   ```
2. In `sdks/typescript/package.json`: resolve the `"version"` conflict to the current main baseline (e.g. `"2.7.1"`).
3. In `tools/liop-studio/package.json`: resolve the `"version"` conflict to the current studio main baseline (e.g. `"1.1.1"`).
4. In `sdks/typescript/tests/infra/production-audit/Dockerfile.production`:
   - Set tag: `@nekzus/liop@latest` and `@nekzus/liop-studio@latest`.
   - Set label: `LABEL org.nekzus.liop.audit="production-main"`.
5. In `sdks/typescript/tests/infra/production-audit/entrypoints/playground.ts`:
   - Set package: `package: "@nekzus/liop@latest"`.
6. In `sdks/typescript/tests/infra/production-audit/tests/00-npm-integrity.test.ts`:
   - Set title: `(@nekzus/liop@latest)`.
7. Verify `docs/docs.json` navbar reflects stable version links.
8. Verify `successComment: false` is configured in release configurations.

### Step 3: Local Quality Certification
```bash
pnpm run check
pnpm install --frozen-lockfile
pnpm test
```

### Step 4: Cryptographic Commit & Push
```bash
git add .
git commit -S -m "chore(promotion): prepare beta to main release promotion"
git push -u origin promote-beta-to-main
```

### Step 5: Pull Request #2 Opening
- **PR Title**:
  ```text
  chore(promotion): promote <feature/fix description> to stable production
  ```
- **PR URL**:
  `https://github.com/Nekzus/LIOP/compare/main...promote-beta-to-main?expand=1`
- Complete the PR template (see Section 5).
- After GitHub CI passes, merge the PR into `main`.

### Step 6: Post-Merge Verification & Cleanup
1. Confirm stable publication on NPM:
   ```bash
   npm view @nekzus/liop version
   npm view @nekzus/liop-studio version
   ```
2. Delete ephemeral branch:
   ```bash
   git checkout alpha
   git branch -D promote-beta-to-main
   git push origin --delete promote-beta-to-main
   ```
3. Update knowledge graph:
   ```bash
   graphify update .
   ```

---

## 5. Official Pull Request Template

```markdown
## Description
Provide a concise technical summary of the changes proposed in this pull request and the architectural motivation.

## Related Issues
Promotes changes from <source-channel> channel (<summary of validated commits>)

## Type of Change
- [x] Bug fix (non-breaking change fixing an issue)
- [x] New feature (non-breaking change adding functionality)
- [x] Performance improvement / Footprint reduction
- [ ] Breaking change (fix or feature modifying public API contracts)
- [x] Documentation update
- [x] CI/CD or build infrastructure

## Architectural & Security Verification
- [x] Changes adhere strictly to the Logic-on-Origin (LoO) and Zero-Trust sandboxing model.
- [x] No Personal Identifiable Information (PII) is derived, leaked, or exposed.
- [x] AST parsing configured with `{ allowReturnOutsideFunction: true }` if handling injected envelopes.
- [x] Network channels mirror symmetric keepalive, timeout, and reconnect invariants.
- [x] Cross-platform regex patterns use `[\r\n]+` and `\s*` for resilient CRLF/LF compatibility.

## Quality & Testing Checklist
- [x] `pnpm run check` (BiomeJS) passes with 0 errors and 0 warnings.
- [x] Full automated test suite passes (`pnpm test` / `cargo test`).
- [x] New or modified code includes comprehensive unit and/or integration tests.
- [x] `pnpm install --frozen-lockfile` completes with Exit code 0 (no lockfile drift).
- [x] All commits in this PR are cryptographically signed with GPG (`git commit -S`).
```

---

## 6. Incident Recovery Runbook

### Case A: GraphQL API Failure on Missing Issue Numbers
- **Symptom**: `Failed step "success" of plugin "@semantic-release/github": Could not resolve to an issue or pull request with the number of X`.
- **Cause**: PR body contained `Fixes #X` or `Closes #X` pointing to a non-existent issue or unmerged PR number.
- **Immediate Mitigation**: Create an empty tracking issue on GitHub (it will receive the missing number `X`), then click **Re-run failed jobs** on GitHub Actions to unblock NPM publishing.
- **Architectural Prevention**: Permanently configure `successComment: false` in `release.sdk.config.js` and `tools/liop-studio/release.config.js`, and replace auto-closing keywords with descriptive declarative text in PR templates.

### Case B: Dependabot Automated Security PR against `main`
- **Symptom**: Dependabot opens a pull request (e.g. `chore(deps): bump ... #64`) directly targeting `main`.
- **Action**: Do NOT merge. Close the PR immediately on GitHub.
- **Resolution**: Port the required CVE package overrides into `pnpm-workspace.yaml` under `alpha`, run `pnpm install --no-frozen-lockfile`, verify with `pnpm audit`, and promote through the canonical `alpha` $\rightarrow$ `beta` $\rightarrow$ `main` pipeline.
