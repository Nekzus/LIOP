import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDockerCompose } from "./_dockerCompose.js";

const infraDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

const noBuild =
	process.argv.includes("--no-build") ||
	process.env.LIOP_NO_BUILD === "1" ||
	process.env.LIOP_NO_BUILD === "true";

const noTeardown =
	process.argv.includes("--no-teardown") ||
	process.env.LIOP_NO_TEARDOWN === "1" ||
	process.env.LIOP_NO_TEARDOWN === "true";

runDockerCompose(["config", "--quiet"]);

if (!noBuild) {
	process.stdout.write("🔨 Building test runner image...\n");
	// Only build test-runner if other service images already exist
	runDockerCompose(["build", "test-runner"]);
}

const up = spawnSync(
	"docker",
	[
		"compose",
		"up",
		"--abort-on-container-exit",
		"--exit-code-from",
		"test-runner",
	],
	{
		cwd: infraDir,
		stdio: "inherit",
		env: process.env,
		shell: process.platform === "win32",
	},
);

const exitCode = typeof up.status === "number" ? up.status : 1;

if (!noTeardown) {
	process.stdout.write("🧹 Tearing down test containers...\n");
	runDockerCompose(["down", "-v", "--remove-orphans"]);
} else {
	process.stdout.write("ℹ️ Preserving live demo containers (--no-teardown).\n");
}

process.exit(exitCode);
