## Description
Provide a concise technical summary of the changes proposed in this pull request and the architectural motivation.

## Related Issues
Fixes #
Closes #

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Performance improvement / Footprint reduction
- [ ] Breaking change (fix or feature modifying public API contracts)
- [ ] Documentation update
- [ ] CI/CD or build infrastructure

## Architectural & Security Verification
- [ ] Changes adhere strictly to the Logic-on-Origin (LoO) and Zero-Trust sandboxing model.
- [ ] No Personal Identifiable Information (PII) is derived, leaked, or exposed.
- [ ] AST parsing configured with `{ allowReturnOutsideFunction: true }` if handling injected envelopes.
- [ ] Network channels mirror symmetric keepalive, timeout, and reconnect invariants.
- [ ] Cross-platform regex patterns use `[\r\n]+` and `\s*` for resilient CRLF/LF compatibility.

## Quality & Testing Checklist
- [ ] `pnpm run check` (BiomeJS) passes with 0 errors and 0 warnings.
- [ ] Full automated test suite passes (`pnpm test` / `cargo test`).
- [ ] New or modified code includes comprehensive unit and/or integration tests.
- [ ] `pnpm install --frozen-lockfile` completes with Exit code 0 (no lockfile drift).
- [ ] All commits in this PR are cryptographically signed with GPG (`git commit -S`).
