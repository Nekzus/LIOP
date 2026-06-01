#!/usr/bin/env node
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { multiaddr } from "@multiformats/multiaddr";
import { LiopMcpRouter } from "../gateway/router.js";
import { MeshNode } from "../mesh/index.js";
import { LiopServer } from "../server/index.js";
import type { McpRequest } from "../types.js";
import { log } from "../utils/logger.js";

/**
 * Resolves a full libp2p multiaddr (with PeerID) from a LIOP node's
 * HTTP health endpoint. This enables zero-config bootstrap — users
 * only need to provide a URL, not a cryptographic PeerID.
 *
 * @param url - HTTP URL of a LIOP node's health endpoint (e.g. "http://host:3000")
 * @returns Full multiaddr string with PeerID, or null if resolution fails
 */
async function resolveBootstrapFromUrl(url: string): Promise<string | null> {
	try {
		const healthUrl = url.endsWith("/health") ? url : `${url}/health`;
		const response = await fetch(healthUrl, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(10000), // Increased to 10s
		});
		if (!response.ok) return null;

		const data = await response.json();
		if (!data.mesh?.multiaddrs?.length || !data.mesh?.peerId) return null;

		// Find TCP multiaddr (prefer non-websocket for stability)
		const tcpAddr = data.mesh.multiaddrs.find(
			(a: string) =>
				a.includes("/tcp/") &&
				!a.includes("/ws") &&
				!a.includes("/ip4/127.0.0.1/"),
		);
		if (!tcpAddr) return null;

		// Rewrite internal Docker IP using the address mapper if enabled
		let resolved = shouldEnableDockerMap()
			? industrialAddressMapper(tcpAddr)
			: tcpAddr;
		if (!resolved || resolved === tcpAddr) {
			const urlHost = new URL(url).hostname;
			resolved = tcpAddr.replace(/\/ip4\/[^/]+/, `/ip4/${urlHost}`);
		}

		if (!resolved) return null;

		resolved += resolved.includes("/p2p/") ? "" : `/p2p/${data.mesh.peerId}`;

		return resolved;
	} catch {
		return null;
	}
}

/**
 * Normalizes a bootstrap multiaddr string.
 * If the address contains a Docker bridge IP (172.16-31.x.x) or Loopback (127.0.0.1),
 * rewrites it to the host accessible via LIOP_NEXUS_URL (e.g. WSL2 IP).
 * This is critical when WSL2 mirror-mode networking is broken.
 */
function normalizeBootstrap(addr: string): string {
	const trimmed = addr.trim();
	// Remap Docker bridge IPs and ANY external physical IPs to 127.0.0.1
	// because Test-NetConnection confirmed 127.0.0.1 is the only reliable path to Docker ports.
	const dockerIpRegex =
		/\/ip4\/172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3}/;
	const loopbackRegex = /\/ip4\/127\.0\.0\.1/;
	const physicalIpRegex = /\/ip4\/192\.168\.[0-9]{1,3}\.[0-9]{1,3}/;

	if (
		dockerIpRegex.test(trimmed) ||
		loopbackRegex.test(trimmed) ||
		physicalIpRegex.test(trimmed)
	) {
		const targetIp = "127.0.0.1";
		const normalized = trimmed
			.replace(dockerIpRegex, `/ip4/${targetIp}`)
			.replace(loopbackRegex, `/ip4/${targetIp}`)
			.replace(physicalIpRegex, `/ip4/${targetIp}`);

		if (normalized !== trimmed) {
			log.info(
				`[LIOP-Agent] 🔄 Local Routing Hack → Forced 127.0.0.1: ${normalized}`,
			);
		}
		return normalized;
	}

	return trimmed;
}

/**
 * industrialAddressMapper
 *
 * Maps Docker-internal IPs to host-published ports for local demo environments.
 * Activated when any of the following conditions are met:
 *   - NODE_ENV is "development" or "test"
 *   - LIOP_DOCKER_MAP="true" or LIOP_DEV_MODE="true" is set
 *   - LIOP_NEXUS_URL points to a local Docker demo port (127.0.0.1:13000|13001)
 *
 * Nexus (172.20.0.10) -> 13001
 * Vault (172.20.0.11) -> 13003
 * Bank  (172.20.0.12) -> 13004
 * Oracle(172.20.0.13) -> 13005
 */
function industrialAddressMapper(addr: string): string | null {
	if (addr.includes("/ip4/172.20.0.10"))
		return addr.replace(
			/\/ip4\/172\.20\.0\.10\/tcp\/[0-9]+/,
			"/ip4/127.0.0.1/tcp/13001",
		);
	if (addr.includes("/ip4/172.20.0.11"))
		return addr.replace(
			/\/ip4\/172\.20\.0\.11\/tcp\/[0-9]+/,
			"/ip4/127.0.0.1/tcp/13003",
		);
	if (addr.includes("/ip4/172.20.0.12"))
		return addr.replace(
			/\/ip4\/172\.20\.0\.12\/tcp\/[0-9]+/,
			"/ip4/127.0.0.1/tcp/13004",
		);
	if (addr.includes("/ip4/172.20.0.13"))
		return addr.replace(
			/\/ip4\/172\.20\.0\.13\/tcp\/[0-9]+/,
			"/ip4/127.0.0.1/tcp/13005",
		);

	// Drop container-internal loopbacks to prevent the Host Agent from dialing itself or conflicting ports
	if (
		addr.includes("/ip4/127.0.0.1/tcp/4000") ||
		addr.includes("/ip4/127.0.0.1/tcp/3000")
	) {
		return null;
	}

	return addr;
}

/**
 * Checks if a URL points to the local Docker demo environment
 * (loopback address on known demo ports).
 */
function isDockerDemoHost(urlStr: string): boolean {
	try {
		const u = new URL(urlStr);
		return (
			(u.hostname === "127.0.0.1" || u.hostname === "localhost") &&
			(u.port === "13000" || u.port === "13001")
		);
	} catch {
		return false;
	}
}

/**
 * Determines whether Docker address mapping should be enabled.
 * True when running in development/test mode, when explicitly requested
 * via LIOP_DOCKER_MAP/LIOP_DEV_MODE, or when the Nexus URL points to
 * a local Docker demo port.
 */
function shouldEnableDockerMap(): boolean {
	return (
		process.env.NODE_ENV === "development" ||
		process.env.NODE_ENV === "test" ||
		process.env.LIOP_DOCKER_MAP === "true" ||
		process.env.LIOP_DEV_MODE === "true" ||
		(!!process.env.LIOP_NEXUS_URL &&
			isDockerDemoHost(process.env.LIOP_NEXUS_URL))
	);
}

/**
 * LIOP Agent (Zero-Config CLI)
 *
 * Secure Logic-on-Origin gateway for Claude Desktop.
 * Communicates via STDIO / JSON-RPC.
 *
 * All tool discovery is DYNAMIC via the /liop/manifest/1.0.0 protocol.
 * No hardcoded tools, PeerIDs, or port mappings.
 */
async function main() {
	// Auto-Relaunch: Ensure system CA certificates are loaded for TLS compatibility.
	// Corporate proxies (Cloudflare WARP, Zscaler) inject custom root CAs into the
	// OS certificate store. Node.js ignores these by default, causing UNABLE_TO_VERIFY_LEAF_SIGNATURE.
	// Pattern: if --use-system-ca is not active, re-spawn with the flag transparently.
	// stdio: "inherit" ensures Claude Desktop's JSON-RPC pipe is passed through cleanly.
	if (
		(process.platform === "win32" || process.platform === "darwin") &&
		!process.execArgv.includes("--use-system-ca") &&
		!(process.env.NODE_OPTIONS ?? "").includes("--use-system-ca")
	) {
		const { spawn } = await import("node:child_process");
		const child = spawn(
			process.execPath,
			["--use-system-ca", ...process.argv.slice(1)],
			{ stdio: "inherit", env: process.env },
		);
		child.on("exit", (code) => process.exit(code ?? 1));
		child.on("error", () => process.exit(1));
		// Block parent — child handles all I/O from here
		await new Promise(() => {});
		return;
	}

	const buildTime = new Date().toISOString();
	log.info(`[LIOP-Agent] 🚀 Version 1.2.0-alpha.9 | Build: ${buildTime}`);

	const liopDir = path.join(os.homedir(), ".liop");
	const identityPath = path.join(liopDir, "identity.json");

	if (!fs.existsSync(liopDir)) {
		fs.mkdirSync(liopDir, { recursive: true });
	}

	// 1. Determine Bootstrap Nodes (Zero-Config Discovery)
	let bootstrapNodes: string[] = [];

	// Command line arguments take precedence
	const args = process.argv.slice(2);
	if (args.length > 0) {
		bootstrapNodes = args.filter((a) => a.startsWith("/"));
	}

	// Priority 1: Physical Beacons (Industrial Pattern) - DETERMINISTIC & INSTANT
	if (bootstrapNodes.length === 0) {
		const searchDirs = [];

		// Priority 1.1: Explicit file from environment variable
		if (process.env.LIOP_BOOTSTRAP_FILE) {
			log.warn(
				"LIOP_BOOTSTRAP_FILE is deprecated and will be removed in the next major version. " +
					"Use LIOP_NEXUS_URL for Auto-Discovery instead.",
			);
			const filePath = path.resolve(process.env.LIOP_BOOTSTRAP_FILE);
			if (fs.existsSync(filePath)) {
				const addr = fs.readFileSync(filePath, "utf8").trim();
				if (addr) bootstrapNodes.push(normalizeBootstrap(addr));
			}
		}

		// Priority 1.2: Traditional locations (Scan for all *.multiaddr)
		searchDirs.push(
			process.cwd(),
			path.join(process.cwd(), "tests/infra/nexus-data"),
			liopDir,
			path.join(
				path
					.dirname(new URL(import.meta.url).pathname)
					.replace(/^\/([A-Z]:)/, "$1"),
				"../../tests/infra/nexus-data",
			),
		);

		for (const dir of searchDirs) {
			try {
				if (fs.existsSync(dir)) {
					const files = fs.readdirSync(dir);
					const multiaddrFiles = files.filter((f) => f.endsWith(".multiaddr"));

					for (const file of multiaddrFiles) {
						const filePath = path.join(dir, file);
						const addr = fs.readFileSync(filePath, "utf8").trim();
						if (addr) {
							const normalized = normalizeBootstrap(addr);
							if (!bootstrapNodes.includes(normalized)) {
								bootstrapNodes.push(normalized);
								log.info(`[LIOP-Agent] ✅ Loaded beacon: ${file} from ${dir}`);
							}
						}
					}
					// If we found any beacons in this directory, we consider discovery successful for this layer
					if (bootstrapNodes.length > 0) break;
				}
			} catch (_e) {
				/* ignore */
			}
		}
	}

	// Priority 2: Auto-Discovery via NEXUS URL (Aggressive Parallel Discovery)
	if (process.env.LIOP_NEXUS_URL) {
		const nexusUrl = process.env.LIOP_NEXUS_URL;
		log.info(
			`[LIOP-Agent] 🌐 Running parallel discovery from: ${nexusUrl} (Sources Found: ${bootstrapNodes.length})`,
		);

		const resolved = await resolveBootstrapFromUrl(nexusUrl);
		if (resolved) {
			const normalized = normalizeBootstrap(resolved);
			if (!bootstrapNodes.includes(normalized)) {
				bootstrapNodes.push(normalized);
				log.info(
					`[LIOP-Agent] ✅ Added bootstrap from URL discovery: ${normalized}`,
				);
			}
		}
	}

	// Priority 3: Environment variable (direct multiaddr)
	if (bootstrapNodes.length === 0 && process.env.LIOP_BOOTSTRAP) {
		bootstrapNodes.push(process.env.LIOP_BOOTSTRAP.trim());
	}

	// Final fallback: local Nexus bootstrap for demo environments.
	// Avoid injecting stale static peer IDs when discovery already found valid peers.
	if (bootstrapNodes.length === 0) {
		bootstrapNodes.push(
			"/ip4/127.0.0.1/tcp/13001/p2p/12D3KooWD8FUFdnLQzzLFNdicsaTknM5cpD7os9sK9NWVSVABJMD",
		);
	}

	// Sanitize/validate all candidate multiaddrs so malformed PeerIDs don't crash startup.
	bootstrapNodes = bootstrapNodes.filter((addr) => {
		try {
			multiaddr(addr);
			return true;
		} catch {
			log.warn(`[LIOP-Agent] Ignoring invalid bootstrap multiaddr: ${addr}`);
			return false;
		}
	});

	// If no bootstrap nodes found, the agent operates in standalone mode.
	// It will only serve local tools until peers are discovered.
	if (bootstrapNodes.length === 0) {
		log.info(
			"[LIOP-Agent] No bootstrap nodes configured. Operating in standalone mode.",
		);
		log.info(
			"[LIOP-Agent] Pass a multiaddr as argument or create 'nexus.multiaddr' file.",
		);
	}

	// Initialize local server node (lightweight, no tools registered locally)
	const liopServer = new LiopServer({
		name: "@nekzus/liop",
		version: "1.0.0",
	});

	// Enable Zero-Shot Autonomy (Industrial Prompt Injection)
	liopServer.enableZeroShotAutonomy();

	// 2. Mesh Node Configuration
	const meshNode = new MeshNode({
		identityPath: identityPath,
		bootstrapNodes: bootstrapNodes,
		addressMapper: shouldEnableDockerMap()
			? industrialAddressMapper
			: undefined,
	});

	// Start P2P Mesh
	await meshNode.start();

	// 3. Initialize the Dynamic Router
	// No hardcoded tools — all discovery happens via liop:manifest protocol
	const router = new LiopMcpRouter(liopServer, meshNode);

	// Proactive Notification to Claude Desktop when tools/resources are discovered dynamically
	router.onToolsChanged = () => {
		process.stdout.write(
			`{"jsonrpc":"2.0","method":"notifications/tools/list_changed"}\n`,
		);
		process.stdout.write(
			`{"jsonrpc":"2.0","method":"notifications/resources/list_changed"}\n`,
		);
	};

	// Initial warming period (2s) then Adaptive Background Discovery
	// Polls DHT for new nodes and triggers onToolsChanged when topology shifts.
	// Uses exponential backoff to reduce polling load on stable meshes.
	setTimeout(() => {
		// biome-ignore lint/suspicious/noExplicitAny: access internal for telemetry
		const rtSize = (meshNode as any).getRoutingTableSize?.() || 0;
		log.info(`[LIOP-Agent] Warm-up complete. Routing Table size: ${rtSize}`);
		router.refreshManifestCache(true).catch(() => {});
	}, 2000);

	const POLL_BASE_MS = 10_000;
	const POLL_MAX_MS = 120_000;
	let pollIntervalMs = POLL_BASE_MS;

	const scheduleAdaptivePoll = () => {
		setTimeout(async () => {
			const prevSize = router.getCacheSize();
			await router.refreshManifestCache(true).catch(() => {});
			const newSize = router.getCacheSize();

			if (newSize !== prevSize) {
				// Topology changed — reset to aggressive polling
				pollIntervalMs = POLL_BASE_MS;
				log.info(
					`[LIOP-Agent] Topology change detected (${prevSize} → ${newSize}). Resetting poll to ${POLL_BASE_MS / 1000}s.`,
				);
			} else {
				// Stable — relax polling interval (factor 1.5)
				pollIntervalMs = Math.min(
					Math.round(pollIntervalMs * 1.5),
					POLL_MAX_MS,
				);
			}

			scheduleAdaptivePoll();
		}, pollIntervalMs);
	};

	scheduleAdaptivePoll();

	// 4. STDIO Transport — Buffered Line Reader
	// Uses readline to guarantee complete JSON-RPC messages before parsing.
	// Raw stdin.on("data") can fragment large payloads across multiple chunks.
	const readline = await import("node:readline");
	const rl = readline.createInterface({
		input: process.stdin,
		terminal: false,
	});

	process.stdout.on("error", (err: Error & { code?: string }) => {
		if (err.code === "EPIPE") {
			process.exit(0); // Graceful exit when Claude Desktop disconnects
		}
	});

	rl.on("line", async (line) => {
		const trimmed = line.trim();
		if (!trimmed) return;

		try {
			const request = JSON.parse(trimmed) as McpRequest;
			if (request.method) {
				const response = await router.dispatch(request);
				if (response) {
					process.stdout.write(`${JSON.stringify(response)}\n`);
				}
			}
		} catch (_err) {
			// Silent catch for binary noise or malformed lines
		}
	});

	rl.on("close", () => {
		process.exit(0);
	});

	// Status directed only to stderr
	log.info(`[LIOP-Agent] Guarding Claude Desktop via STDIO.`);
	log.info(
		`[LIOP-Agent] P2P Mesh: Joined (${bootstrapNodes.length} bootstraps)`,
	);
	log.info("[LIOP-Agent] Tool discovery: Dynamic via /liop/manifest/1.0.0");

	process.on("SIGINT", async () => {
		await meshNode.stop();
		process.exit(0);
	});
}

main().catch((err) => {
	log.error(`[LIOP-Agent] Fatal Error: ${err.message}`);
	process.exit(1);
});
