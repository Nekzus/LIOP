// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { exec } from "node:child_process";
import process from "node:process";
import { Command } from "commander";
import pc from "picocolors";
import { createStudioServer } from "../server/index.js";
import type { TargetConnectionConfig } from "../transports/transport.interface.js";
import { runScan } from "./scan.js";

export async function main() {
	const program = new Command();

	program
		.name("liop-studio")
		.description(
			"LIOP Sovereign Studio & Mesh Scanner (Universal MCP / LIOP Inspector)",
		)
		.version("1.0.0-alpha.0")
		.option("-p, --port <port>", "Port to bind local Studio server", "16000")
		.option("--no-open", "Do not automatically open browser on launch")
		.option(
			"--stdio <command>",
			"Initial target: Stdio command (e.g. 'node server.js')",
		)
		.option("--http <url>", "Initial target: HTTP / SSE MCP URL")
		.option("--grpc <target>", "Initial target: Native LIOP gRPC endpoint")
		.option("--mesh <multiaddr>", "Initial target: Libp2p P2P bootstrap node")
		.option(
			"--token <token>",
			"Bearer or access token for target authentication",
		)
		.action(async (options) => {
			const port = Number.parseInt(options.port, 10) || 16000;

			let initialTarget: TargetConnectionConfig | undefined;
			if (options.stdio) {
				const parts = options.stdio.trim().split(/\s+/);
				initialTarget = {
					type: "stdio",
					stdio: { command: parts[0], args: parts.slice(1) },
				};
			} else if (options.http) {
				initialTarget = {
					type: "http",
					http: { url: options.http, authToken: options.token },
				};
			} else if (options.grpc) {
				initialTarget = {
					type: "grpc",
					grpc: { target: options.grpc, token: options.token },
				};
			} else if (options.mesh) {
				initialTarget = {
					type: "mesh",
					mesh: { bootstrapNodes: [options.mesh] },
				};
			}

			const server = createStudioServer({ port, initialTarget });
			server.start();

			console.log(
				`\n${pc.bold(pc.cyan("◈ LIOP SOVEREIGN STUDIO"))} ${pc.green("Online")}`,
			);
			console.log(
				`  ${pc.bold("Web Interface:")} ${pc.underline(pc.cyan(`http://127.0.0.1:${port}`))}`,
			);
			console.log(
				`  ${pc.gray("Target:")}        ${initialTarget?.type?.toUpperCase() || "DEFAULT HTTP GATEWAY"}\n`,
			);

			if (options.open !== false) {
				try {
					const startCmd =
						process.platform === "darwin"
							? "open"
							: process.platform === "win32"
								? "start"
								: "xdg-open";
					exec(`${startCmd} http://127.0.0.1:${port}`);
				} catch {
					// Silent fallback if open fails
				}
			}
		});

	// Headless Scan Command
	program
		.command("scan <target>")
		.description(
			"Headless capability and health probe for an MCP or LIOP target",
		)
		.option("--token <token>", "Authentication token")
		.option("--json", "Emit raw JSON report instead of formatted table")
		.action(async (target, options) => {
			await runScan(target, options);
		});

	await program.parseAsync(process.argv);
}
