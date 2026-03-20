import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const rootDir = path.resolve(__dirname, "../../..");
const sourceProtoDir = path.join(rootDir, "protocol/proto");
const targetProtoDir = path.resolve(__dirname, "../dist/protocol");

/**
 * Copy Protos to Dist
 * Ensures .proto files are available in the NPM package.
 */
function copyProtos() {
	if (!fs.existsSync(sourceProtoDir)) {
		console.error(
			`[Build] 🚨 Source proto directory not found: ${sourceProtoDir}`,
		);
		process.exit(1);
	}

	if (!fs.existsSync(targetProtoDir)) {
		fs.mkdirSync(targetProtoDir, { recursive: true });
	}

	const files = fs.readdirSync(sourceProtoDir);
	for (const file of files) {
		if (file.endsWith(".proto")) {
			const src = path.join(sourceProtoDir, file);
			const dest = path.join(targetProtoDir, file);
			fs.copyFileSync(src, dest);
			console.log(`[Build] 📄 Copied: ${file} -> dist/protocol/`);
		}
	}
}

copyProtos();
