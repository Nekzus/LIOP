# LIOP Crossnet Protocol Coverage Matrix

This matrix maps protocol promises to executable crossnet evidence.
Goal: production-grade validation for the TypeScript SDK and MCP interoperability.

## Coverage Status


| Protocol Promise                                                      | Crossnet Evidence                                   | Current Status |
| --------------------------------------------------------------------- | --------------------------------------------------- | -------------- |
| Node health and identity integrity                                    | `01-health.test.ts`                                 | Covered        |
| DHT/mesh discovery between nodes                                      | `02-discovery.test.ts`, `07-mesh-scenarios.test.ts` | Covered        |
| Remote logic execution (MCP -> Mesh -> gRPC)                          | `03-execution.test.ts`                              | Covered        |
| PII egress blocking / aggregation-first policy                        | `04-pii-egress.test.ts`                             | Covered        |
| Runtime isolation / forbidden capability blocking                     | `05-guardian-ast.test.ts`                           | Covered        |
| Secure invocation path (PQC/transport integrity)                      | `06-pqc-handshake.test.ts`                          | Covered        |
| Dynamic topology convergence                                          | `07-mesh-scenarios.test.ts`                         | Covered        |
| Resilience under invalid/concurrent requests                          | `08-chaos.test.ts`                                  | Covered        |
| MCP initialization/capabilities contract                              | `09-mcp-conformance.test.ts`                        | Covered        |
| MCP JSON-RPC behavior (`ping`, unknown method)                        | `09-mcp-conformance.test.ts`                        | Covered        |
| MCP tool inventory and `tools/call` interoperability                  | `09-mcp-conformance.test.ts`                        | Covered        |
| Performance signal (`tools/list` p95 + concurrent calls)              | `10-performance.test.ts`                            | Covered        |
| Adversarial security (disguised exfiltration, deterministic envelope) | `11-adversarial-security.test.ts`                   | Covered        |


## Production Readiness Gates (Operational)

The following gates are required to claim production maturity:

1. Determinism gate:
  - Crossnet passes repeatedly without flaky behavior in CI.
2. Security gate:
  - PII, isolation, and output policy tests remain green under concurrency.
3. MCP compatibility gate:
  - `initialize`, `tools/list`, `tools/call`, JSON-RPC errors remain spec-consistent.
4. Resilience gate:
  - Chaos and topology tests remain stable with controlled retries and teardown.
5. Observability gate:
  - Failures are diagnosable from structured logs and test output artifacts.

## Best-Practice Notes Applied

Based on MCP TypeScript SDK, Vitest, Docker and libp2p guidance:

- Use health/readiness retries, not fixed sleeps.
- Use bounded retries for transient network/handshake failures.
- Keep teardown strict (`docker compose down -v --remove-orphans`).
- Verify protocol contract, not just business payloads.
- Keep tests serial and deterministic in integration contexts.

