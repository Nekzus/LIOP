# LIOP Production Infrastructure Tests

This directory contains the Docker orchestration for LIOP's production-grade network tests.

## Architecture

We spin up a 4-node topology inside an isolated Docker bridge network (`172.20.0.0/24`):

1. **Nexus Node** (`172.20.0.10`): The bootstrap seed. Enables DHT discovery.
2. **Vault Node** (`172.20.0.11`): The data provider. Holds Logic-on-Origin models & tools.
3. **Agent Node** (`172.20.0.12`): An automated consumer connecting to the mesh.
4. **Test Runner** (`172.20.0.100`): Runs Vitest to perform assertions.

Additionally, a **Claude Desktop Client** runs natively on the Windows host and connects to the Docker network via the Nexus proxy port (4001).

## Commands

- `pnpm run test:crossnet`: Runs the full automated test suite inside Docker.
- `pnpm run demo:start`: Starts the mesh dynamically in the background for manual testing.
- `pnpm run demo:claude`: Configures your local Claude Desktop to attach to the running Docker mesh.
- `pnpm run demo:stop`: Tears down the infrastructure.
