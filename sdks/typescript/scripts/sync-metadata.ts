import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const rootDir = path.resolve(__dirname, "../../..");
const metadataPath = path.join(rootDir, "liop-metadata.json");

/**
 * Sync Metadata
 * Reads liop-metadata.json and propagates changes across the monorepo.
 */
async function syncMetadata() {
	if (!fs.existsSync(metadataPath)) {
		console.error(`[Sync] 🚨 Metadata file not found at: ${metadataPath}`);
		process.exit(1);
	}

	const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
	const { repo, docs } = metadata;
	const newRepoFull = `${repo.owner}/${repo.name}`;
	const newRepoUrl = `https://github.com/${newRepoFull}`;

	console.log(`[Sync] 🔄 Synchronizing to: ${newRepoFull} (${repo.branch})`);

	// 1. Update Root package.json
	updateJson(path.join(rootDir, "package.json"), (pkg) => {
		pkg.homepage = docs.url;
		// Optionally update repository if it exists
		if (pkg.repository) {
			pkg.repository.url = `git+${newRepoUrl}.git`;
		}
		return pkg;
	});

	// 2. Update TS SDK package.json
	updateJson(path.join(rootDir, "sdks/typescript/package.json"), (pkg) => {
		pkg.repository.url = `git+${newRepoUrl}.git`;
		pkg.bugs.url = `${newRepoUrl}/issues`;
		pkg.homepage = docs.url;
		return pkg;
	});

	// 3. Update docs/docs.json
	updateJson(path.join(rootDir, "docs/docs.json"), (config) => {
		config.name = docs.name;
		if (config.navbar?.links) {
			config.navbar.links[0].href = newRepoUrl;
		}
		// Update tabs with branch consistency
		if (config.navigation?.languages) {
			for (const lang of config.navigation.languages) {
				for (const tab of lang.tabs) {
					if (tab.href?.includes("github.com")) {
						tab.href = tab.href
							.replace(/github\.com\/[^/]+\/[^/]+/, `github.com/${newRepoFull}`)
							.replace(/\/blob\/[^/]+\//, `/blob/${repo.branch}/`);
					}
				}
			}
		}
		if (config.footer?.socials) {
			config.footer.socials.github = newRepoUrl;
		}
		return config;
	});

	// 4. Global String Replacement in READMEs and MDX
	const patterns = [
		{
			from: /github\.com\/Nekzus-Solutions\/LIOP-v1\.0-alpha/g,
			to: `github.com/${newRepoFull}`,
		},
		{ from: /github\.com\/Nekzus\/LIOP/g, to: `github.com/${newRepoFull}` },
		{ from: /\/blob\/alpha\//g, to: `/blob/${repo.branch}/` },
		{ from: /Nekzus-Solutions\/LIOP-v1\.0-alpha/g, to: newRepoFull },
		// Add more patterns if needed
	];

	const filesToSearch = [
		path.join(rootDir, "README.md"),
		path.join(rootDir, "sdks/typescript/README.md"),
		path.join(rootDir, "sdks/rust/README.md"),
		...getFilesRecursive(path.join(rootDir, "docs"), [".mdx", ".md"]),
	];

	for (const file of filesToSearch) {
		replaceInFile(file, patterns);
	}

	console.log("[Sync] ✅ Metadata synchronization complete!");
}

function updateJson(filePath: string, transform: (data: any) => any) {
	if (!fs.existsSync(filePath)) return;
	const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
	const updated = transform(data);
	fs.writeFileSync(filePath, `${JSON.stringify(updated, null, 2)}\n`, "utf-8");
	console.log(`[Sync] 📝 Updated: ${path.relative(rootDir, filePath)}`);
}

function replaceInFile(
	filePath: string,
	replacements: { from: RegExp; to: string }[],
) {
	if (!fs.existsSync(filePath)) return;
	let content = fs.readFileSync(filePath, "utf-8");
	let changed = false;

	for (const { from, to } of replacements) {
		if (from.test(content)) {
			content = content.replace(from, to);
			changed = true;
		}
	}

	if (changed) {
		fs.writeFileSync(filePath, content, "utf-8");
		console.log(`[Sync] ✒️  Patched: ${path.relative(rootDir, filePath)}`);
	}
}

function getFilesRecursive(dir: string, extensions: string[]): string[] {
	let results: string[] = [];
	const list = fs.readdirSync(dir);
	for (const file of list) {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);
		if (stat?.isDirectory()) {
			results = results.concat(getFilesRecursive(filePath, extensions));
		} else {
			if (extensions.some((ext) => file.endsWith(ext))) {
				results.push(filePath);
			}
		}
	}
	return results;
}

syncMetadata();
