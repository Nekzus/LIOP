import { runDockerCompose } from "./_dockerCompose.js";

runDockerCompose(["config", "--quiet"]);
runDockerCompose(["build", "nexus", "vault", "bank", "oracle"]);
process.stdout.write("✅ Demo images built.\n");

