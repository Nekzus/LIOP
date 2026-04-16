import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

type RunResult = {
	index: number;
	exitCode: number;
	elapsedMs: number;
};

const iterations = Number.parseInt(process.env.LIOP_CROSSNET_BURN_RUNS ?? "3", 10);
const stopOnFailure =
	process.env.LIOP_CROSSNET_STOP_ON_FAIL === "1" ||
	process.env.LIOP_CROSSNET_STOP_ON_FAIL === "true";

if (!Number.isFinite(iterations) || iterations <= 0) {
	throw new Error("LIOP_CROSSNET_BURN_RUNS must be a positive integer.");
}

const sdkRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const results: RunResult[] = [];

for (let i = 1; i <= iterations; i++) {
	process.stdout.write(`\n[burn] Run ${i}/${iterations}: pnpm run test:crossnet\n`);
	const startedAt = Date.now();
	const proc = spawnSync("pnpm", ["run", "test:crossnet"], {
		cwd: sdkRoot,
		stdio: "inherit",
		env: process.env,
		shell: process.platform === "win32",
	});

	const elapsedMs = Date.now() - startedAt;
	const exitCode = typeof proc.status === "number" ? proc.status : 1;
	results.push({ index: i, exitCode, elapsedMs });

	process.stdout.write(
		`[burn] Run ${i} finished with code=${exitCode} in ${(elapsedMs / 1000).toFixed(1)}s\n`,
	);

	if (exitCode !== 0 && stopOnFailure) {
		process.stdout.write("[burn] Stopping early due to failure.\n");
		break;
	}
}

const passed = results.filter((r) => r.exitCode === 0).length;
const failed = results.length - passed;
const totalMs = results.reduce((acc, r) => acc + r.elapsedMs, 0);
const averageMs = results.length > 0 ? Math.round(totalMs / results.length) : 0;
const successRate = results.length > 0 ? (passed / results.length) * 100 : 0;

const gatePass = failed === 0;
const generatedAt = new Date().toISOString();
const reportPath = path.join(sdkRoot, "tests", "crossnet", "CROSSNET_RELEASE_READINESS.md");

const lines: string[] = [
	"# Crossnet Release Readiness",
	"",
	`Generated at: ${generatedAt}`,
	"",
	"## Burn-in Summary",
	"",
	`- Runs executed: ${results.length}`,
	`- Passed: ${passed}`,
	`- Failed: ${failed}`,
	`- Success rate: ${successRate.toFixed(2)}%`,
	`- Average duration: ${(averageMs / 1000).toFixed(1)}s`,
	`- Gate result: ${gatePass ? "PASS" : "FAIL"}`,
	"",
	"## Run Details",
	"",
	"| Run | Exit Code | Duration (s) |",
	"|---:|---:|---:|",
	...results.map((r) => `| ${r.index} | ${r.exitCode} | ${(r.elapsedMs / 1000).toFixed(1)} |`),
	"",
	"## Release Gate",
	"",
	"- PASS criteria: 0 failed runs in burn-in window.",
	"- FAIL criteria: one or more failed runs (flaky or deterministic break).",
	"",
	"## Notes",
	"",
	"- Configure run count with `LIOP_CROSSNET_BURN_RUNS` (default: 3).",
	"- Set `LIOP_CROSSNET_STOP_ON_FAIL=1` to stop after first failure.",
];

mkdirSync(path.dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
process.stdout.write(`\n[burn] Release readiness report: ${reportPath}\n`);

process.exit(gatePass ? 0 : 1);

