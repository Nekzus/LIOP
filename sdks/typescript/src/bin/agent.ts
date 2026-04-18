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
			(a: string) => a.includes("/tcp/") && !a.includes("/ws"),
		);
		if (!tcpAddr) return null;

		// Rewrite internal Docker IP to the URL's host for external access
		const urlHost = new URL(url).hostname;
		const resolved =
			tcpAddr.replace(/\/ip4\/[^/]+/, `/ip4/${urlHost}`) +
			(tcpAddr.includes("/p2p/") ? "" : `/p2p/${data.mesh.peerId}`);

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
 * Mapea IPs internas de Docker a puertos industriales mapeados en el Host.
 * Nexus (172.20.0.10) -> 13001
 * Vault (172.20.0.11) -> 13003
 * Bank  (172.20.0.12) -> 13004
 * Oracle(172.20.0.13) -> 13005
 */
function industrialAddressMapper(addr: string): string {
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
	return addr;
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
		name: "@nekzus/liop-agent",
		version: "1.0.0",
	});

	// Enable Zero-Shot Autonomy (Industrial Prompt Injection)
	liopServer.enableZeroShotAutonomy();

	// 2. Mesh Node Configuration
	const meshNode = new MeshNode({
		identityPath: identityPath,
		bootstrapNodes: bootstrapNodes,
		addressMapper: industrialAddressMapper,
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

	// Initial warming period (2s) then Periodic Discovery Worker (every 10 seconds)
	// This silently polls the DHT for new nodes and triggers onToolsChanged if the topology shifts.
	setTimeout(() => {
		// biome-ignore lint/suspicious/noExplicitAny: access internal for telemetry
		const rtSize = (meshNode as any).getRoutingTableSize?.() || 0;
		log.info(`[LIOP-Agent] Warm-up complete. Routing Table size: ${rtSize}`);
		router.refreshManifestCache(true).catch(() => {});
	}, 2000);

	setInterval(() => {
		router.refreshManifestCache(true).catch(() => {});
	}, 10000);

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
