// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/cli/index.ts", "src/server/index.ts"],
	format: ["esm"],
	dts: {
		compilerOptions: {
			ignoreDeprecations: "6.0",
		},
	},
	splitting: false,
	sourcemap: true,
	clean: true,
	target: "node20",
	outDir: "dist",
});
