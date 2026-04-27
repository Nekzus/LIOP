import { runDocker, runDockerCompose } from "./_dockerCompose.js";

process.stdout.write("🧹 Starting deep cleanup for LIOP project...\n");

// 1. Full down including volumes and images
runDockerCompose(["down", "-v", "--rmi", "all", "--remove-orphans"]);

// 2. Prune dangling images related to this project using the label
process.stdout.write("🚿 Pruning orphan build layers...\n");
runDocker([
  "image",
  "prune",
  "--filter",
  "label=org.nekzus.liop.project=neural-mesh-protocol",
  "-f"
]);

process.stdout.write("✨ Cleanup complete. Docker environment is pristine.\n");
