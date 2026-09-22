// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const IMAGES_DIR = path.join(REPO_ROOT, "docs", "images");
const DOCS_DIR = path.join(REPO_ROOT, "docs");

console.log("🔍 Starting LIOP Documentation Diagram Health & Parity Audit...");
let hasErrors = false;

// Whitelisted dark-only SVGs (no light counterpart required)
const DARK_ONLY_WHITELIST = new Set(["animated-docker-infra-dark.svg"]);

// Banned legacy substrings & AI slop patterns in diagrams
const BANNED_PATTERNS = [
	{
		pattern: /@nekzus\/neural-mesh/i,
		reason: "Legacy package name detected (must be @nekzus/liop)",
	},
	{
		pattern: /\b(revolutionary|groundbreaking|game-changer|zero-latency|delve|tapestry|testament|pivotal|foster|bolster|seamless|flawless|incredible|ultimate|unleash|breathtaking|meticulous)\b/i,
		reason: "AI slop or non-verifiable superlative detected in diagram text",
	},
];

// 1. Scan all SVG files in docs/images
if (!fs.existsSync(IMAGES_DIR)) {
	console.error(`❌ Images directory not found: ${IMAGES_DIR}`);
	process.exit(1);
}

const svgFiles = fs
	.readdirSync(IMAGES_DIR)
	.filter((file) => file.endsWith(".svg"));
console.log(
	`📊 Discovered ${svgFiles.length} SVG diagram(s) in docs/images/...`,
);

// 2. Scan all documentation files (.mdx, .md)
function getDocFiles(dir: string): string[] {
	const results: string[] = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (
			entry.isDirectory() &&
			entry.name !== "node_modules" &&
			entry.name !== ".git"
		) {
			results.push(...getDocFiles(fullPath));
		} else if (
			entry.isFile() &&
			(entry.name.endsWith(".mdx") || entry.name.endsWith(".md"))
		) {
			results.push(fullPath);
		}
	}
	return results;
}

const docFiles = getDocFiles(DOCS_DIR);
const rootReadme = path.join(REPO_ROOT, "README.md");
if (fs.existsSync(rootReadme)) {
	docFiles.push(rootReadme);
}

// Map each SVG to its list of referencing documents
const svgReferences = new Map<string, string[]>();
for (const svg of svgFiles) {
	svgReferences.set(svg, []);
}

// Extract all /images/*.svg references from docs
const brokenReferences: { doc: string; ref: string }[] = [];
const imgRegex = /["'\(]\/images\/([a-zA-Z0-9_\-\.]+\.svg)["'\)]/g;

for (const doc of docFiles) {
	const content = fs.readFileSync(doc, "utf-8");
	let match: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
	while ((match = imgRegex.exec(content)) !== null) {
		const referencedSvg = match[1];
		const refs = svgReferences.get(referencedSvg);
		if (refs !== undefined) {
			refs.push(path.relative(REPO_ROOT, doc));
		} else {
			brokenReferences.push({
				doc: path.relative(REPO_ROOT, doc),
				ref: referencedSvg,
			});
		}
	}
}

// 3. Check for broken links (404s)
if (brokenReferences.length > 0) {
	console.error("\n❌ Broken diagram references found in documentation:");
	for (const broken of brokenReferences) {
		console.error(`  - ${broken.doc} references missing: ${broken.ref}`);
	}
	hasErrors = true;
} else {
	console.log("  ✅ Zero broken diagram links across all documentation files.");
}

// 4. Check for orphan SVGs
const orphanSvgs = svgFiles.filter((svg) => {
	const refs = svgReferences.get(svg);
	return !refs || refs.length === 0;
});

if (orphanSvgs.length > 0) {
	console.error(
		`\n❌ ${orphanSvgs.length} orphan SVG file(s) found (not referenced anywhere):`,
	);
	for (const orphan of orphanSvgs) {
		console.error(`  - docs/images/${orphan}`);
	}
	hasErrors = true;
} else {
	console.log(
		"  ✅ 100% of SVG diagrams are actively referenced in documentation.",
	);
}

// 5. Check dark/light parity
const missingLightCounterparts: string[] = [];
for (const svg of svgFiles) {
	if (svg.endsWith("-dark.svg") && !DARK_ONLY_WHITELIST.has(svg)) {
		const lightCounterpart = svg.replace(/-dark\.svg$/, "-light.svg");
		if (!svgFiles.includes(lightCounterpart)) {
			missingLightCounterparts.push(svg);
		}
	}
}

if (missingLightCounterparts.length > 0) {
	console.error(
		`\n❌ Missing -light.svg counterparts for ${missingLightCounterparts.length} file(s):`,
	);
	for (const missing of missingLightCounterparts) {
		console.error(`  - ${missing} (expected ${missing.replace(/-dark\.svg$/, "-light.svg")})`);
	}
	hasErrors = true;
} else {
	console.log("  ✅ Complete Dark/Light parity across all required diagrams.");
}

// 6. Check content hygiene (banned legacy patterns)
const contentViolations: { svg: string; reason: string }[] = [];
for (const svg of svgFiles) {
	const fullPath = path.join(IMAGES_DIR, svg);
	const content = fs.readFileSync(fullPath, "utf-8");
	for (const bp of BANNED_PATTERNS) {
		if (bp.pattern.test(content)) {
			contentViolations.push({ svg, reason: bp.reason });
		}
	}
}

if (contentViolations.length > 0) {
	console.error(
		`\n❌ Content hygiene violations found in ${contentViolations.length} SVG(s):`,
	);
	for (const v of contentViolations) {
		console.error(`  - docs/images/${v.svg}: ${v.reason}`);
	}
	hasErrors = true;
} else {
	console.log(
		"  ✅ Zero banned legacy terms or deprecated package identifiers in SVGs.",
	);
}

// 7. Check root <svg> dimensions (must have fixed width/height attributes for IDE/viewer compatibility)
const dimensionViolations: string[] = [];
for (const svg of svgFiles) {
	const fullPath = path.join(IMAGES_DIR, svg);
	const content = fs.readFileSync(fullPath, "utf-8");
	const rootSvgMatch = content.match(/<svg\b([^>]*)>/i);
	if (!rootSvgMatch) {
		dimensionViolations.push(`${svg}: Missing <svg> root element`);
		continue;
	}
	const attrs = rootSvgMatch[1];
	const widthMatch = attrs.match(/\bwidth="([^"]+)"/i);
	const heightMatch = attrs.match(/\bheight="([^"]+)"/i);
	if (!widthMatch || !heightMatch) {
		dimensionViolations.push(`${svg}: Missing explicit width or height attributes`);
	} else if (widthMatch[1].includes("%") || heightMatch[1] === "auto") {
		dimensionViolations.push(
			`${svg}: Incompatible relative dimensions width="${widthMatch[1]}" height="${heightMatch[1]}" (must be fixed pixels)`,
		);
	}
}

if (dimensionViolations.length > 0) {
	console.error(
		`\n❌ Dimension compatibility violations found in ${dimensionViolations.length} SVG(s):`,
	);
	for (const d of dimensionViolations) {
		console.error(`  - docs/images/${d}`);
	}
	hasErrors = true;
} else {
	console.log(
		"  ✅ All SVG diagrams define explicit fixed dimensions for universal viewer compatibility.",
	);
}

// 8. Check Mintlify theme-switching class compliance on all .mdx image embeds
const themeViolations: string[] = [];
const mdxFiles = docFiles.filter((f) => f.endsWith(".mdx"));

for (const mdx of mdxFiles) {
	const content = fs.readFileSync(mdx, "utf-8");
	const relPath = path.relative(REPO_ROOT, mdx);

	// Ban <picture> or srcset in Mintlify MDX
	if (/<picture\b|<source\b[^>]*srcset/i.test(content)) {
		themeViolations.push(
			`${relPath}: Prohibited <picture>/<source> tags detected (must use canonical <Frame><img className="...">)`,
		);
	}

	// Match each <img ... />
	const imgTagRegex = /<img\b([^>]*)\/?>/gi;
	let imgMatch: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop
	while ((imgMatch = imgTagRegex.exec(content)) !== null) {
		const tag = imgMatch[1];
		const srcMatch = tag.match(/src=["']\/images\/([^"']+)["']/i);
		const classMatch = tag.match(/className=["']([^"']+)["']/i);
		if (!srcMatch) continue;

		const imgFile = srcMatch[1];
		const classVal = classMatch ? classMatch[1] : "";

		if (imgFile.endsWith("-light.svg")) {
			if (!classVal.includes("block") || !classVal.includes("dark:hidden")) {
				themeViolations.push(
					`${relPath}: Light image ${imgFile} missing required 'block dark:hidden' class`,
				);
			}
		} else if (
			imgFile.endsWith("-dark.svg") &&
			!DARK_ONLY_WHITELIST.has(imgFile)
		) {
			if (!classVal.includes("hidden") || !classVal.includes("dark:block")) {
				themeViolations.push(
					`${relPath}: Dark image ${imgFile} missing required 'hidden dark:block' class`,
				);
			}
		}
	}
}

if (themeViolations.length > 0) {
	console.error(
		`\n❌ Mintlify theme-switching violations found in ${themeViolations.length} place(s):`,
	);
	for (const tv of themeViolations) {
		console.error(`  - ${tv}`);
	}
	hasErrors = true;
} else {
	console.log(
		"  ✅ 100% of MDX image embeds strictly adhere to Mintlify dark/light mode classes.",
	);
}

// Summary
console.log("\n==================================================");
if (hasErrors) {
	console.error("❌ Diagram Health Audit FAILED. Please resolve errors above.");
	process.exit(1);
} else {
	console.log(
		`✅ All ${svgFiles.length} SVG diagrams verified healthy and synchronized with documentation.`,
	);
	process.exit(0);
}
