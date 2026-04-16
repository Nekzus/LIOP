import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

function getInfraDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..");
}

type RunOptions = {
  cwd?: string;
};

export function runDockerCompose(args: string[], options: RunOptions = {}): void {
  const res = spawnSync("docker", ["compose", ...args], {
    cwd: options.cwd ?? getInfraDir(),
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (res.error) throw res.error;
  if (typeof res.status === "number" && res.status !== 0) {
    process.exit(res.status);
  }
}

