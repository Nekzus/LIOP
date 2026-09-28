import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runDockerCompose } from "../../cli/_dockerCompose.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const auditDir = path.resolve(here, "..");
const sdkRoot = path.resolve(auditDir, "../../..");

const shouldBuild = !process.argv.includes("--no-build");
const noCache = process.argv.includes("--no-cache");
const sleepMs = Number.parseInt(process.env.LIOP_AUDIT_SLEEP_MS ?? "25000", 10);

console.log("═════════════════════════════════════════════════════════");
console.log("  🚀 LIOP LOCAL PRODUCTION AUDIT (Fresh Local Tarball)");
console.log("  Parity testing of @nekzus/liop branch build in Docker");
console.log("═════════════════════════════════════════════════════════");

// 1. Pack fresh local tarball to auditDir
console.log("\n📦 [Stage 1/3] Packing fresh local distribution bundle...");
const packResult = spawnSync("pnpm", ["pack", "--pack-destination", auditDir], {
	cwd: sdkRoot,
	stdio: "inherit",
	shell: process.platform === "win32",
});
if (packResult.status !== 0) {
	console.error("❌ Failed to pack local distribution tarball.");
	process.exit(1);
}

const composeFiles = [
	"-f",
	"docker-compose.production-audit.yml",
	"-f",
	"docker-compose.local.yml",
];

runDockerCompose([...composeFiles, "config", "--quiet"], { cwd: auditDir });

if (shouldBuild) {
	console.log(`\n🔨 [Stage 2/3] Building local audit image (no-cache: ${noCache})...`);
	const buildArgs = noCache ? ["build", "--no-cache"] : ["build"];
	runDockerCompose([...composeFiles, ...buildArgs], { cwd: auditDir });
}

console.log("\n🌐 [Stage 3/3] Launching 8 Tri-Tier Sovereign Mesh nodes with local tarball...");
const services = [
	"nexus-prod",
	"blg-prod",
	"vault-prod",
	"bank-prod",
	"oracle-prod",
	"edge-prod",
	"relay-prod",
	"playground-prod",
];
runDockerCompose([...composeFiles, "up", "-d", "--force-recreate", ...services], { cwd: auditDir });

console.log(`\n⏳ Waiting ${sleepMs / 1000}s for P2P mesh convergence under WAN latency...`);
await new Promise((r) => setTimeout(r, sleepMs));

console.log("\n═════════════════════════════════════════════════════════");
console.log("  ✅ LOCAL TARBALL REALISTIC WAN AUDIT MESH — READY");
console.log("═════════════════════════════════════════════════════════");
runDockerCompose(
	[...composeFiles, "ps", "--format", "table {{.Name}}\t{{.Status}}\t{{.Ports}}"],
	{ cwd: auditDir },
);

console.log("\n  Endpoints:");
console.log("    Nexus Gateway:    http://localhost:15000");
console.log("    Playground UI:    http://localhost:16000");
console.log("    Metrics:          http://localhost:15000/metrics");
console.log("═════════════════════════════════════════════════════════\n");
