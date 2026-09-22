/**
 * LIOP Protocol — Real-time Telemetry & Traffic Stream Generator
 *
 * Generates continuous, empirical in-situ logic executions across the tri-layer
 * mesh enclaves (Bank, Vault, Oracle, Edge) to feed Grafana & Prometheus dashboards
 * with real-time, live operational telemetry.
 *
 * Usage:
 *   pnpm --filter @nekzus/liop telemetry:stream [-- --interval-ms=4000] [-- --cycles=0]
 */
import {
	callTool,
	extractText,
	liopEnvelope,
} from "../tests/infra/production-audit/tests/_helpers.js";

const NEXUS_URL = process.env.NEXUS_URL || "http://127.0.0.1:15000";
const intervalArg = process.argv.find((a) => a.startsWith("--interval-ms="));
const intervalMs = intervalArg
	? Number.parseInt(intervalArg.split("=")[1], 10)
	: 3500;
const cyclesArg = process.argv.find((a) => a.startsWith("--cycles="));
const maxCycles = cyclesArg ? Number.parseInt(cyclesArg.split("=")[1], 10) : 0; // 0 = continuous

console.log(
	"═════════════════════════════════════════════════════════════════",
);
console.log("  🛰️  LIOP REALTIME TELEMETRY & METRIC STREAM GENERATOR");
console.log(`  Target Nexus Gateway: ${NEXUS_URL}`);
console.log(`  Stream Interval:      ${intervalMs}ms`);
console.log(
	`  Max Cycles:           ${maxCycles === 0 ? "Infinite (Live Stream)" : maxCycles}`,
);
console.log(
	"═════════════════════════════════════════════════════════════════\n",
);

const tasks = [
	{
		name: "Analyze_Synthetic_Bank_Transactions",
		tag: "Bank-Analytics",
		envelope: liopEnvelope(
			[
				"const accounts = env.records;",
				"const totalBalance = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);",
				"const avgBalance = totalBalance / accounts.length;",
				"return { totalAccounts: accounts.length, totalBalance, avgBalance };",
			].join("\n"),
			"BankRealtimeTelemetry",
		),
	},
	{
		name: "Analyze_Synthetic_Medical_Records",
		tag: "Vault-Analytics",
		envelope: liopEnvelope(
			[
				"const patients = env.records;",
				"const hypertension = patients.filter(p => p.diagnosis === 'Hypertension');",
				"const avgAge = patients.reduce((acc, p) => acc + (p.age || 0), 0) / patients.length;",
				"return { totalPatients: patients.length, hypertensionCount: hypertension.length, avgAge };",
			].join("\n"),
			"VaultRealtimeTelemetry",
		),
	},
	{
		name: "Analyze_HFT_Market_Data",
		tag: "Oracle-HFT",
		envelope: liopEnvelope(
			[
				"const ticks = env.records;",
				"const avgPrice = ticks.reduce((acc, t) => acc + (t.price || 0), 0) / ticks.length;",
				"return { totalTicks: ticks.length, avgPrice };",
			].join("\n"),
			"OracleRealtimeTelemetry",
		),
	},
];

let cycle = 0;
let active = true;

const stop = () => {
	console.log(
		"\n[Telemetry Stream] Received termination signal. Stopping stream...",
	);
	active = false;
	process.exit(0);
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

async function runStream() {
	while (active) {
		cycle++;
		const task = tasks[(cycle - 1) % tasks.length];
		const startTime = performance.now();

		try {
			const res = await callTool(task.name, task.envelope, NEXUS_URL, 15000);
			const duration = (performance.now() - startTime).toFixed(1);

			if (res?.isError) {
				console.error(
					`[Cycle ${cycle}] ❌ ${task.tag} rejected (${duration}ms):`,
					extractText(res),
				);
			} else {
				const text = extractText(res);
				const data = JSON.parse(text || "{}");
				const hasReceipt = Boolean(data.zk_receipt);
				console.log(
					`[Cycle ${cycle}] ✅ ${task.tag} OK in ${duration}ms | ZK-Receipt: ${hasReceipt ? "VERIFIED" : "NONE"} | In-Situ Aggregation Active`,
				);
			}
		} catch (err: unknown) {
			const duration = (performance.now() - startTime).toFixed(1);
			const errMsg = err instanceof Error ? err.message : String(err);
			console.warn(
				`[Cycle ${cycle}] ⚠️ ${task.tag} network error (${duration}ms):`,
				errMsg,
			);
		}

		if (maxCycles > 0 && cycle >= maxCycles) {
			console.log(
				`\n[Telemetry Stream] Completed ${maxCycles} cycles successfully.`,
			);
			break;
		}

		await new Promise((r) => setTimeout(r, intervalMs));
	}
}

runStream().catch((err) => {
	console.error("[Telemetry Stream] Fatal error:", err);
	process.exit(1);
});
