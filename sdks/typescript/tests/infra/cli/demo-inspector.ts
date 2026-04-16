/**
 * MCP Inspector (official) — browser UI + proxy for debugging MCP servers.
 *
 * Architecture (per modelcontextprotocol/inspector):
 * - Web UI (MCPI) default port 6274
 * - Proxy (MCPP) default port 6277
 * - Connect to remote servers via SSE or Streamable HTTP (URL to /mcp)
 *
 * LIOP Hybrid Gateway exposes JSON-RPC MCP at POST /mcp (see gateway/hybrid.ts).
 *
 * Usage:
 *   1. Start the mesh: pnpm run demo:start
 *   2. pnpm run demo:inspector
 *   3. Open the printed URL, or run: npx @modelcontextprotocol/inspector
 *
 * Optional: LIOP_MCP_URL=http://127.0.0.1:13000/mcp pnpm run demo:inspector -- --run
 *
 * Deep-link query params (official): transport=streamable-http&serverUrl=<MCP URL>
 * @see https://github.com/modelcontextprotocol/inspector/blob/main/README.md
 */
import { spawn } from "node:child_process";
import process from "node:process";

const defaultUrl = "http://127.0.0.1:13000/mcp";
const mcpUrl = process.env.LIOP_MCP_URL?.trim() || defaultUrl;

// Inspector UI must use "localhost" for the MCPI origin unless you set ALLOWED_ORIGINS
// (default proxy only allows http://localhost:6274 — using 127.0.0.1 causes "Invalid origin").
const uiBase =
	process.env.LIOP_INSPECTOR_UI?.trim() || "http://localhost:6274";
const prefillUrl = `${uiBase}/?transport=streamable-http&serverUrl=${encodeURIComponent(mcpUrl)}`;

process.stdout.write("\n=== MCP Inspector + LIOP ===\n\n");
process.stdout.write(`LIOP MCP endpoint (Streamable HTTP — use in Inspector as server URL):\n  ${mcpUrl}\n\n`);
process.stdout.write(
	"Official Inspector (Node.js ^22.7.5 per upstream):\n  npx @modelcontextprotocol/inspector\n\n",
);
process.stdout.write(
	"Open the MCPI tab at http://localhost:6274 (not 127.0.0.1) or set:\n  ALLOWED_ORIGINS=http://127.0.0.1:6274,http://localhost:6274\n\n",
);
process.stdout.write(
	"Web UI with transport + serverUrl prefilled (paste after you open with the session token link):\n",
);
process.stdout.write(`  ${prefillUrl}\n\n`);
process.stdout.write(
	"Manual connection in the sidebar: Transport = streamable-http, Server URL = MCP endpoint above.\n\n",
);
process.stdout.write(
	"CLI smoke (optional; remote Streamable HTTP):\n  npx @modelcontextprotocol/inspector --cli " +
		mcpUrl +
		" --transport http --method tools/list\n\n",
);

const shouldRun = process.argv.includes("--run");
if (shouldRun) {
	process.stdout.write("Starting Inspector (--run)…\n");
	const child = spawn(
		"npx",
		["-y", "@modelcontextprotocol/inspector"],
		{
			stdio: "inherit",
			env: process.env,
			shell: process.platform === "win32",
		},
	);
	child.on("exit", (code) => process.exit(code ?? 1));
}
