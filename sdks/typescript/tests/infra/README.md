# LIOP Production Infrastructure Tests

This directory contains the Docker orchestration for LIOP's production-grade network tests.

## Architecture

We spin up a 4-node topology inside an isolated Docker bridge network (`172.20.0.0/24`):

1. **Nexus Node** (`172.20.0.10`): The bootstrap seed. Enables DHT discovery.
2. **Vault Node** (`172.20.0.11`): The data provider. Holds Logic-on-Origin models & tools.
3. **Agent Node** (`172.20.0.12`): An automated consumer connecting to the mesh.
4. **Test Runner** (`172.20.0.100`): Runs Vitest to perform assertions.

Additionally, a **Claude Desktop Client** runs natively on the host and connects to the Docker network via the Nexus published port (`13001`).

## Commands

- `pnpm run test:crossnet`: Runs the full automated test suite inside Docker (cross-platform, no WSL).
- `pnpm run test:crossnet:burn`: Executes repeated crossnet runs and generates release-readiness evidence at `tests/crossnet/CROSSNET_RELEASE_READINESS.md`.
- `pnpm run demo:build`: Builds demo images explicitly (recommended after code changes).
- `pnpm run demo:start`: Starts the mesh in the background without rebuilding (fast path).
- `pnpm run demo:start:rebuild`: Rebuilds + starts the mesh in one step.
- `pnpm run demo:claude`: Configures your local Claude Desktop to attach to the running Docker mesh.
- `pnpm run demo:stop`: Tears down the infrastructure.
- `pnpm run demo:inspector`: Prints the official [MCP Inspector](https://github.com/modelcontextprotocol/inspector) connection URL for the LIOP Nexus MCP endpoint (`POST /mcp`). Requires Node.js **^22.7.5** for the Inspector itself (see upstream README). Add `--run` to spawn `npx @modelcontextprotocol/inspector` after printing the link.

### MCP Inspector (browser against LIOP)

The upstream Inspector exposes a **web UI** (MCPI, default port **6274**) and a **proxy** (MCPP, default **6277**). It connects to remote servers using **Streamable HTTP** at the MCP URL — the same shape documented upstream (`streamable-http` → `http://…/mcp`).

**LIOP in this demo:** Nexus publishes HTTP/MCP on host port **13000** → `http://127.0.0.1:13000/mcp` (see `docker-compose.yml`).

1. Start the mesh: `pnpm run demo:start` (or `demo:start:rebuild`).
2. Run `pnpm run demo:inspector` and open the printed URL, or run `npx @modelcontextprotocol/inspector` and set **Transport** = `streamable-http`, **Server URL** = `http://127.0.0.1:13000/mcp`.
3. The proxy prints a **session token**; use the pre-filled link from the console or paste the token in **Configuration → Proxy Session Token**. Do **not** disable auth (`DANGEROUSLY_OMIT_AUTH`) unless you understand the upstream security warnings.

**“Invalid origin” in the proxy logs:** the Inspector only trusts the MCPI origin **`http://localhost:6274`** by default (not `http://127.0.0.1:6274`). Open the UI at **`http://localhost:6274`** and use the token link the process prints, **or** start the Inspector with both origins allowed, for example:  
`ALLOWED_ORIGINS=http://127.0.0.1:6274,http://localhost:6274 npx @modelcontextprotocol/inspector`

**`mcp-server-everything` / STDIO ENOENT:** that is the default **stdio** example trying to spawn a binary that is not installed. Switch the sidebar to **streamable-http** and use LIOP’s URL only, or ignore that error once Streamable HTTP is connected (your logs show `StreamableHttp` sessions working).

**Optional — Inspector in Docker** (profile `inspector`, UI on **16274** to avoid clashing with a local Inspector):

```bash
docker compose -f sdks/typescript/tests/infra/docker-compose.yml --profile inspector up -d mcp-inspector
```

Then open `http://127.0.0.1:16274` and point Streamable HTTP at `http://nexus:3000/mcp` (reachable from the inspector container on the `liop-testnet` bridge).

### Burn-in knobs

- `LIOP_CROSSNET_BURN_RUNS`: Number of repeated runs (default: `3`).
- `LIOP_CROSSNET_STOP_ON_FAIL`: Set `1`/`true` to stop on first failing run.

### Windows notes (Docker Desktop)

- By default, Docker Desktop publishes the Nexus ports on `localhost` (e.g. `http://localhost:13000`).
- If you need a different host/port, set:
  - `LIOP_NEXUS_HOST` (default `127.0.0.1`)
  - `LIOP_NEXUS_PORT` (default `13000`)
