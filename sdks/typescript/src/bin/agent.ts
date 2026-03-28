#!/usr/bin/env node
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { LiopMcpRouter } from "../gateway/router.js";
import { MeshNode } from "../mesh/index.js";
import { LiopServer } from "../server/index.js";

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

	// Environment variable
	if (bootstrapNodes.length === 0 && process.env.LIOP_BOOTSTRAP) {
		bootstrapNodes.push(process.env.LIOP_BOOTSTRAP.trim());
	}

	// Convenience: Try to read nexus.multiaddr from multiple locations
	if (bootstrapNodes.length === 0) {
		const searchPaths = [
			path.join(process.cwd(), "nexus.multiaddr"),
			path.join(liopDir, "nexus.multiaddr"),
			// Try relative to the agent binary (dist/bin/agent.js -> root/nexus.multiaddr)
			path.join(
				path.dirname(new URL(import.meta.url).pathname),
				"../../nexus.multiaddr",
			),
			// Windows path fix (remove leading slash if present)
			path.join(
				path
					.dirname(new URL(import.meta.url).pathname)
					.replace(/^\/([A-Z]:)/, "$1"),
				"../../nexus.multiaddr",
			),
		];

		for (const nexusPath of searchPaths) {
			try {
				if (fs.existsSync(nexusPath)) {
					const addr = fs.readFileSync(nexusPath, "utf8").trim();
					if (addr && !bootstrapNodes.includes(addr)) {
						bootstrapNodes.push(addr);
						console.error(`[LIOP-Agent] Found bootstrap at: ${nexusPath}`);
						break;
					}
				}
			} catch (_e) {
				/* ignore */
			}
		}
	}

	// If no bootstrap nodes found, the agent operates in standalone mode.
	// It will only serve local tools until peers are discovered.
	if (bootstrapNodes.length === 0) {
		console.error(
			"[LIOP-Agent] No bootstrap nodes configured. Operating in standalone mode.",
		);
		console.error(
			"[LIOP-Agent] Pass a multiaddr as argument or create 'nexus.multiaddr' file.",
		);
	}

	// Initialize local server node (lightweight, no tools registered locally)
	const liopServer = new LiopServer({
		name: "@nekzus/liop-agent",
		version: "1.0.0",
	});

	// 2. Mesh Node Configuration
	const meshNode = new MeshNode({
		identityPath: identityPath,
		bootstrapNodes: bootstrapNodes,
	});

	// Start P2P Mesh
	await meshNode.start();

	// 3. Initialize the Dynamic Router
	// No hardcoded tools — all discovery happens via liop:manifest protocol
	const router = new LiopMcpRouter(liopServer, meshNode);

	// Proactive Notification to Claude Desktop when tools are discovered dynamically
	router.onToolsChanged = () => {
		process.stdout.write(
			`{"jsonrpc":"2.0","method":"notifications/tools/list_changed"}\n`,
		);
	};

	// Initial warming period (2s) then Periodic Discovery Worker (every 10 seconds)
	// This silently polls the DHT for new nodes and triggers onToolsChanged if the topology shifts.
	setTimeout(() => {
		// biome-ignore lint/suspicious/noExplicitAny: access internal for telemetry
		const rtSize = (meshNode as any).getRoutingTableSize?.() || 0;
		console.error(
			`[LIOP-Agent] Warm-up complete. Routing Table size: ${rtSize}`,
		);
		router.refreshManifestCache(true).catch(() => {});
	}, 2000);

	setInterval(() => {
		router.refreshManifestCache(true).catch(() => {});
	}, 15000);

	// 4. STDIO Transport implementation
	process.stdout.on("error", (err: Error & { code?: string }) => {
		if (err.code === "EPIPE") {
			process.exit(0); // Graceful exit when Claude Desktop disconnects
		}
	});

	process.stdin.on("data", async (data) => {
		const payload = data.toString().trim();
		if (!payload) return;

		const messages = payload.split("\n");

		for (const msg of messages) {
			try {
				const request = JSON.parse(msg);
				if (request.method) {
					const response = await router.dispatch(request);
					if (response) {
						process.stdout.write(`${JSON.stringify(response)}\n`);
					}
				}
			} catch (_err) {
				// Silent catch for binary noise
			}
		}
	});

	// Status directed only to stderr
	console.error(`[LIOP-Agent] Guarding Claude Desktop via STDIO.`);
	console.error(
		`[LIOP-Agent] P2P Mesh: Joined (${bootstrapNodes.length} bootstraps)`,
	);
	console.error(
		"[LIOP-Agent] Tool discovery: Dynamic via /liop/manifest/1.0.0",
	);

	process.on("SIGINT", async () => {
		await meshNode.stop();
		process.exit(0);
	});
}

main().catch((err) => {
	console.error(`[LIOP-Agent] Fatal Error: ${err.message}`);
	process.exit(1);
});
