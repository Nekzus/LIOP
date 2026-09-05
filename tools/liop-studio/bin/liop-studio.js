#!/usr/bin/env node

// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if running compiled or tsx in development
async function run() {
	const isDist = import.meta.url.includes("/dist/") || !import.meta.url.endsWith(".ts");
	
	try {
		// Prefer compiled CLI entrypoint if available
		const cliPath = path.resolve(__dirname, "../dist/cli/index.js");
		const mod = await import(cliPath);
		if (mod.main) {
			await mod.main();
		}
	} catch (err) {
		// Fallback to tsx for direct source execution in monorepo
		try {
			const srcCliPath = path.resolve(__dirname, "../src/cli/index.ts");
			const mod = await import(srcCliPath);
			if (mod.main) {
				await mod.main();
			}
		} catch (innerErr) {
			console.error("[LIOP-Studio] Failed to load CLI entrypoint:", innerErr);
			process.exit(1);
		}
	}
}

run();
