// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getPackageVersion(): string {
	try {
		let currentDir = __dirname;
		for (let i = 0; i < 4; i++) {
			const candidate = path.join(currentDir, "package.json");
			if (fs.existsSync(candidate)) {
				const raw = fs.readFileSync(candidate, "utf-8");
				const parsed = JSON.parse(raw);
				if (
					parsed.name === "@nekzus/liop-studio" &&
					typeof parsed.version === "string"
				) {
					return parsed.version;
				}
			}
			currentDir = path.dirname(currentDir);
		}
	} catch {
		// Graceful fallback
	}
	return "1.0.0-alpha.5";
}

export const STUDIO_VERSION = getPackageVersion();
