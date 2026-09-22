/**
 * Logic-Injection-on-Origin Protocol (LIOP) - Release Configuration
 * Multi-Channel Dedicated Changelog & Verified GPG Commit Architecture
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect current active release branch from CI environment
const rawBranch =
	process.env.GITHUB_REF_NAME ||
	process.env.GIT_BRANCH ||
	process.env.BRANCH_NAME ||
	"main";
const branch = rawBranch.replace(/^refs\/heads\//, "");

const plugins = [
	[
		"@semantic-release/commit-analyzer",
		{
			preset: "angular",
			releaseRules: [
				{ type: "feat", release: "minor" },
				{ type: "fix", release: "patch" },
				{ type: "perf", release: "patch" },
				{ scope: "license", release: "minor" },
				{ type: "license", release: "minor" },
			],
		},
	],
	"@semantic-release/release-notes-generator",
];

// 1. CHANGELOG: Maintained per branch with branch-specific releases
plugins.push([
	"@semantic-release/changelog",
	{
		changelogFile: "CHANGELOG.md",
		changelogTitle:
			"# Changelog\n\nAll notable changes to this project will be documented in this file. See\n[Conventional Commits](https://conventionalcommits.org) for commit guidelines.",
	},
]);

// 2. NPM: Bump version across TypeScript SDK workspace package
plugins.push([
	"@semantic-release/npm",
	{
		pkgRoot: "sdks/typescript",
		npmPublish: false,
	},
]);

// 3. MINTLIFY NAVBAR SYNC: Update docs/docs.json on stable main releases
plugins.push({
	prepare: async (_pluginConfig, context) => {
		const { nextRelease, logger } = context;
		if (branch === "main" && nextRelease?.version && !nextRelease.version.includes("-")) {
			const docsPath = path.resolve(__dirname, "docs/docs.json");
			if (fs.existsSync(docsPath)) {
				try {
					const config = JSON.parse(fs.readFileSync(docsPath, "utf-8"));
					if (config.navbar?.links) {
						const npmLink = config.navbar.links.find(
							(l) => l.icon === "npm" || l.href?.includes("npmjs.com"),
						);
						if (npmLink) {
							npmLink.label = `npm v${nextRelease.version}`;
							fs.writeFileSync(docsPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
							logger.log(
								`[Mintlify] Synchronized docs/docs.json navbar to npm v${nextRelease.version}`,
							);
						}
					}
				} catch (err) {
					logger.error(`[Mintlify] Failed to synchronize docs/docs.json: ${err.message}`);
				}
			}
		}
	},
});

// 4. VERIFIED GPG COMMIT VIA GITHUB API (Key ID: B5690EEEBB952194)
// Directly creates signed commits/tags on GitHub.com with green 'Verified' badge
plugins.push([
	"@semantic-release-extras/verified-git-commit",
	{
		assets: [
			"package.json",
			"CHANGELOG.md",
			"sdks/typescript/package.json",
			...(branch === "main" ? ["docs/docs.json"] : []),
		],
		message:
			"chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
	},
]);

// 5. GITHUB RELEASES (Creates Release Notes for all channels: alpha, beta, main)
plugins.push("@semantic-release/github");

export default {
	tagFormat: "v${version}",
	branches: [
		"main",
		{ name: "beta", prerelease: true },
		{ name: "alpha", prerelease: true },
	],
	plugins,
};
