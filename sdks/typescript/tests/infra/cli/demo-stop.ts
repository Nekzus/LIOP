import { runDockerCompose } from "./_dockerCompose.js";

runDockerCompose(["down", "-v", "--remove-orphans"]);
process.stdout.write("✅ LIOP mesh stopped.\n");

