// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import pc from "picocolors";
import type { ScanReport } from "../transports/transport.interface.js";

export function formatScanTable(report: ScanReport): string {
	const lines: string[] = [];

	lines.push("");
	lines.push(
		`${pc.bold(pc.cyan("◈ LIOP SOVEREIGN STUDIO"))} ${pc.gray("—")} ${pc.bold("TARGET SCAN REPORT")}`,
	);
	lines.push(pc.gray("━".repeat(70)));

	// Target summary
	const statusBadge =
		report.status === "online"
			? pc.bgGreen(pc.black(" ONLINE "))
			: report.status === "degraded"
				? pc.bgYellow(pc.black(" DEGRADED "))
				: pc.bgRed(pc.white(" OFFLINE "));

	lines.push(`  ${pc.bold("Target:")}    ${report.targetAddress}`);
	lines.push(`  ${pc.bold("Protocol:")}  ${report.targetType.toUpperCase()}`);
	lines.push(
		`  ${pc.bold("Status:")}    ${statusBadge}  ${pc.gray(`(RTT: ${report.latencyMs} ms)`)}`,
	);

	if (report.serverInfo) {
		lines.push(
			`  ${pc.bold("Server:")}    ${report.serverInfo.name} ${pc.gray(`v${report.serverInfo.version}`)}`,
		);
	}

	if (report.error) {
		lines.push(`  ${pc.bold(pc.red("Error:"))}     ${report.error}`);
	}

	lines.push(pc.gray("─".repeat(70)));

	// Tools list
	lines.push(
		`  ${pc.bold("Discovered Capabilities:")} ${pc.cyan(report.totalTools.toString())}`,
	);
	lines.push("");

	if (report.tools.length === 0) {
		lines.push(`    ${pc.gray("No tools exposed by this endpoint.")}`);
	} else {
		// Table Header
		lines.push(
			`    ${pc.bold("Capability Name".padEnd(36))} ${pc.bold("Tier".padEnd(8))} ${pc.bold("Type".padEnd(10))} ${pc.bold("Domain")}`,
		);
		lines.push(`    ${pc.gray("─".repeat(66))}`);

		for (const tool of report.tools) {
			const nameStr = tool.name.padEnd(36);
			const tierStr = (tool.tier ? `Tier ${tool.tier}` : "Tier 2").padEnd(8);
			const typeStr = (
				tool.isLiopEnabled ? pc.green("LIOP/WASI") : pc.yellow("Standard")
			).padEnd(19);
			const domainStr = tool.domain || "General";

			lines.push(
				`    ${pc.white(nameStr)} ${pc.gray(tierStr)} ${typeStr} ${pc.gray(domainStr)}`,
			);
		}
	}

	lines.push(pc.gray("━".repeat(70)));
	lines.push(
		`${pc.gray("Verified at:")} ${report.timestamp} ${pc.gray("•")} ${pc.green("Zero-Trust Architecture")}`,
	);
	lines.push("");

	return lines.join("\n");
}
