# LIOP Cross-Network Production Tests

This directory contains the integration suites that run against the 4-node Docker Mesh topology.

## Test Suites

- **01-health**: Validates node health, PeerID availability, and API endpoints.
- **02-discovery**: Validates Kademlia DHT auto-discovery of tools across IPs.
- **03-execution**: Validates Logic-on-Origin payload execution over cross-IP gRPC.
- **04-pii-egress**: Validates ZK-snarks / PII scanner across network boundaries.
- **05-guardian-ast**: Validates isolation of execution environments over the mesh.
- **06-pqc-handshake**: Validates ML-KEM-768 and AES-GCM operations across domains.
- **07-mesh-scenarios**: Validates re-announcements, concurrent queries, and scaling.
- **08-chaos**: Chaos engineering (tc latencies, packet drops, node restarts).

## Execution

These tests are meant to be run inside the Docker `liop-testnet` network by the `test-runner` container.
Run `pnpm run test:crossnet` from the host.
