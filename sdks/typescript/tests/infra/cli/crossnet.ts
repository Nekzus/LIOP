import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { runDockerCompose } from "./_dockerCompose.js";

const infraDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

runDockerCompose(["config", "--quiet"]);
runDockerCompose(["build"]);

const up = spawnSync("docker", ["compose", "up", "--abort-on-container-exit", "--exit-code-from", "test-runner"], {
  cwd: infraDir,
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

const exitCode = typeof up.status === "number" ? up.status : 1;

runDockerCompose(["down", "-v", "--remove-orphans"]);
process.exit(exitCode);

