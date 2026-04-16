import { runDockerCompose } from "./_dockerCompose.js";

const sleepMs = Number.parseInt(process.env.LIOP_DEMO_SLEEP_MS ?? "20000", 10);
const shouldBuild =
	process.env.LIOP_DEMO_BUILD === "1" ||
	process.env.LIOP_DEMO_BUILD === "true";

runDockerCompose(["config", "--quiet"]);
if (shouldBuild) {
	process.stdout.write("🔨 Rebuilding demo images...\n");
	runDockerCompose(["build", "nexus", "vault", "bank", "oracle"]);
}
runDockerCompose(["up", "-d", "--no-build", "nexus", "vault", "bank", "oracle"]);

process.stdout.write("⏳ Waiting for mesh convergence...\n");
await new Promise((r) => setTimeout(r, Number.isFinite(sleepMs) ? sleepMs : 20000));

process.stdout.write("═══════════════════════════════════════\n");
process.stdout.write("  🌐 LIOP Demo Mesh — READY\n");
process.stdout.write("═══════════════════════════════════════\n");
runDockerCompose(["ps", "--format", "table {{.Name}}\t{{.Status}}\t{{.Ports}}"]);
process.stdout.write("\n");
process.stdout.write("  Auto-Discovery URL: http://localhost:13000\n");
process.stdout.write("  Next (Windows / PowerShell):\n");
process.stdout.write("    pnpm -C sdks/typescript run demo:claude\n");
process.stdout.write("═══════════════════════════════════════\n");

