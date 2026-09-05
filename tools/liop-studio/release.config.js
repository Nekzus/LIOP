// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * LIOP Studio - Release Configuration
 * Multi-Channel Dedicated Changelog & Verified GPG Commit Architecture
 */

const branch =
	process.env.GITHUB_REF_NAME ||
	process.env.GIT_BRANCH ||
	process.env.BRANCH_NAME ||
	"main";

const plugins = [
	[
		"@semantic-release/commit-analyzer",
		{
			preset: "angular",
			releaseRules: [
				{ type: "feat", scope: "studio", release: "minor" },
				{ type: "fix", scope: "studio", release: "patch" },
				{ type: "perf", scope: "studio", release: "patch" },
				{ scope: "studio", release: "patch" },
			],
		},
	],
	"@semantic-release/release-notes-generator",
	[
		"@semantic-release/changelog",
		{
			changelogFile: "tools/liop-studio/CHANGELOG.md",
			changelogTitle:
				"# LIOP Studio Changelog\n\nAll notable changes to @nekzus/liop-studio will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.",
		},
	],
	[
		"@semantic-release/npm",
		{
			pkgRoot: "tools/liop-studio",
			npmPublish: false,
		},
	],
	[
		"@semantic-release-extras/verified-git-commit",
		{
			assets: [
				"tools/liop-studio/package.json",
				"tools/liop-studio/CHANGELOG.md",
			],
			message:
				"chore(studio-release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
		},
	],
	"@semantic-release/github",
];

export default {
	tagFormat: "studio-v${version}",
	branches: [
		"main",
		{ name: "beta", prerelease: true },
		{ name: "alpha", prerelease: true },
	],
	plugins,
};
