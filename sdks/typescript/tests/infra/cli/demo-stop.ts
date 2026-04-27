import { runDockerCompose } from "./_dockerCompose.js";

runDockerCompose(["down", "-v", "--rmi", "local", "--remove-orphans"]);
process.stdout.write("✅ LIOP mesh stopped and service images removed.\n");

