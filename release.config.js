/**
 * Logic-Injection-on-Origin Protocol (LIOP) - Release Configuration
 * Multi-Channel Clean Changelog & Verified GPG Commit Architecture
 */

// Detect current active release branch from CI environment
const branch =
	process.env.GITHUB_REF_NAME ||
	process.env.GIT_BRANCH ||
	process.env.BRANCH_NAME ||
	"main";
const isPrerelease = branch === "alpha" || branch === "beta";

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

// 1. CHANGELOG: Exclusively generated on stable 'main' release branch
// Prevents cross-channel pollution and eliminates PR merge conflicts
if (!isPrerelease) {
	plugins.push([
		"@semantic-release/changelog",
		{
			changelogFile: "CHANGELOG.md",
			changelogTitle:
				"# Changelog\n\nAll notable changes to this project will be documented in this file. See\n[Conventional Commits](https://conventionalcommits.org) for commit guidelines.",
		},
	]);
}

// 2. NPM: Bump version across TypeScript SDK workspace package
plugins.push([
	"@semantic-release/npm",
	{
		pkgRoot: "sdks/typescript",
		npmPublish: false,
	},
]);

// 3. VERIFIED GPG COMMIT VIA GITHUB API (Key ID: B5690EEEBB952194)
// Directly creates signed commits/tags on GitHub.com with green 'Verified' badge
plugins.push([
	"@semantic-release-extras/verified-git-commit",
	{
		assets: isPrerelease
			? ["package.json", "sdks/typescript/package.json"]
			: ["package.json", "CHANGELOG.md", "sdks/typescript/package.json"],
		message:
			"chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
	},
]);

// 4. GITHUB RELEASES (Creates Release Notes for all channels: alpha, beta, main)
plugins.push("@semantic-release/github");

export default {
	branches: [
		"main",
		{ name: "beta", prerelease: true },
		{ name: "alpha", prerelease: true },
	],
	plugins,
};
