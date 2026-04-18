import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

type JsonObject = Record<string, unknown>;

function toPosixPath(p: string): string {
	return p.replaceAll("\\", "/");
}

function resolveInfraPaths(): { sdkDir: string; sdkDist: string; nexusBeacon: string } {
	const here = path.dirname(fileURLToPath(import.meta.url));
	const infraDir = path.resolve(here, "..");
	const sdkDir = path.resolve(infraDir, "../..");
	const sdkDist = toPosixPath(path.resolve(infraDir, "../../dist/bin/agent.js"));
	const nexusBeacon = toPosixPath(path.resolve(infraDir, "nexus-data/nexus.multiaddr"));
	return { sdkDir, sdkDist, nexusBeacon };
}

function ensureBuiltAgent(sdkDir: string, sdkDist: string): void {
	if (fs.existsSync(sdkDist)) {
		return;
	}

	process.stdout.write("ℹ️ dist/bin/agent.js not found. Building @nekzus/liop...\n");
	const build = spawnSync("pnpm", ["run", "build"], {
		cwd: sdkDir,
		stdio: "inherit",
		env: process.env,
		shell: process.platform === "win32",
	});

	if (build.error) {
		throw build.error;
	}

	if (!fs.existsSync(sdkDist)) {
		throw new Error(`Build finished but agent binary is still missing at: ${sdkDist}`);
	}
}

function resolveClaudeConfigPath(): string {
	if (process.platform === "win32") {
		const appData = process.env.APPDATA;
		if (!appData) {
			throw new Error("APPDATA is not set. Cannot resolve Claude Desktop config path on Windows.");
		}
		return path.join(appData, "Claude", "claude_desktop_config.json");
	}

	const xdgConfigHome = process.env.XDG_CONFIG_HOME;
	if (xdgConfigHome) {
		return path.join(xdgConfigHome, "Claude", "claude_desktop_config.json");
	}

	return path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json");
}

function readExistingConfig(configPath: string): JsonObject {
	if (!fs.existsSync(configPath)) {
		return { mcpServers: {} };
	}

	try {
		const raw = fs.readFileSync(configPath, "utf8");
		const parsed = JSON.parse(raw) as JsonObject;
		if (typeof parsed.mcpServers !== "object" || parsed.mcpServers === null) {
			parsed.mcpServers = {};
		}
		return parsed;
	} catch {
		process.stdout.write("⚠️ Existing Claude config is invalid JSON. Replacing with a clean config.\n");
		return { mcpServers: {} };
	}
}

function main(): void {
	const { sdkDir, sdkDist, nexusBeacon } = resolveInfraPaths();
	const configPath = resolveClaudeConfigPath();
	const configDir = path.dirname(configPath);
	const nexusHost = process.env.LIOP_NEXUS_HOST ?? "127.0.0.1";
	const nexusPort = process.env.LIOP_NEXUS_PORT ?? "13000";
	const nexusUrl = `http://${nexusHost}:${nexusPort}`;

	ensureBuiltAgent(sdkDir, sdkDist);
	fs.mkdirSync(configDir, { recursive: true });

	const cfg = readExistingConfig(configPath);
	const mcpServers = cfg.mcpServers as JsonObject;

	mcpServers["liop-mesh"] = {
		command: "node",
		args: [sdkDist],
		env: {
			LIOP_NEXUS_URL: nexusUrl,
			LIOP_BOOTSTRAP_FILE: nexusBeacon,
			LIOP_LOG_LEVEL: "info",
			// Short MCP tool descriptions (matches docker demo + examples/industrial-demo UX).
			// Full LIOP envelope spec stays in prompts/get → liop_blind_analyst.
			LIOP_MCP_COMPACT_TOOL_DESCRIPTIONS: "1",
			// Cloud MCP: give mesh discovery time before first tools/list completes.
			LIOP_INITIAL_DISCOVERY_TIMEOUT_MS: "20000",
			LIOP_TOOLS_LIST_TAIL_POLL_MS: "8000",
			// Host runs agent against Docker demo: gRPC in manifests is 50051 (container);
			// published host ports are 13011/13021/13031 (see tests/infra/docker-compose.yml).
			LIOP_USE_PUBLISHED_GRPC_PORTS: "1",
			// Tools hosted on the agent (if any) accept plain payloads; mesh providers use Docker env.
			LIOP_RESPECT_PLAIN_TOOL_PAYLOAD: "1",
		},
	};

	cfg.mcpServers = mcpServers;
	fs.writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`, "utf8");

	process.stdout.write("\n═══════════════════════════════════════════\n");
	process.stdout.write("  Claude Desktop -> LIOP Mesh\n");
	process.stdout.write("═══════════════════════════════════════════\n");
	process.stdout.write(`  Config: ${configPath}\n`);
	process.stdout.write(`  LIOP_NEXUS_URL: ${nexusUrl}\n`);
	process.stdout.write("  Restart Claude Desktop to apply changes.\n");
	process.stdout.write("═══════════════════════════════════════════\n");
}

main();

