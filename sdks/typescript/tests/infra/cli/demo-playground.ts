import { runDockerCompose } from "./_dockerCompose.js";

const sleepMs = Number.parseInt(process.env.LIOP_DEMO_SLEEP_MS ?? "20000", 10);
const shouldBuild =
  process.env.LIOP_DEMO_BUILD === "1" ||
  process.env.LIOP_DEMO_BUILD === "true";

runDockerCompose(["config", "--quiet"]);

if (shouldBuild) {
  process.stdout.write("🔨 Rebuilding demo images (including playground)...\n");
  runDockerCompose(["build", "nexus", "vault", "bank", "oracle", "playground"]);
}

process.stdout.write("🚀 Starting LIOP P2P Mesh with Playground...\n");
runDockerCompose(["up", "-d", "nexus", "vault", "bank", "oracle", "playground"]);

process.stdout.write("⏳ Waiting for mesh convergence and client connection...\n");
await new Promise((r) => setTimeout(r, Number.isFinite(sleepMs) ? sleepMs : 20000));

process.stdout.write("═════════════════════════════════════════════════════════\n");
process.stdout.write("        🌐 LIOP INTERACTIVE PLAYGROUND -- READY\n");
process.stdout.write("═════════════════════════════════════════════════════════\n");
runDockerCompose(["ps", "--format", "table {{.Name}}\t{{.Status}}\t{{.Ports}}"]);
process.stdout.write("\n");
process.stdout.write("  Playground Web UI: http://localhost:14000\n");
process.stdout.write("  Nexus Gateway:     http://localhost:13000\n");
process.stdout.write("\n");
process.stdout.write("  Next steps:\n");
process.stdout.write("    1. Open http://localhost:14000 in your browser\n");
process.stdout.write("    2. Select a template (Bank, Market, Medical, PII Attack)\n");
process.stdout.write("    3. Click 'Execute Logic' and watch the real-time timeline\n");
process.stdout.write("═════════════════════════════════════════════════════════\n");
