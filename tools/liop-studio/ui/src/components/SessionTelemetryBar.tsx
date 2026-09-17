// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { Activity, Clock, Cpu, Database } from "lucide-react";
import type { SessionTelemetry } from "../types";

interface SessionTelemetryBarProps {
	telemetry: SessionTelemetry | null;
}

export function SessionTelemetryBar({ telemetry }: SessionTelemetryBarProps) {
	if (!telemetry || telemetry.totalOperations === 0) {
		return null;
	}

	const formatNumber = (n: number) => n.toLocaleString();

	const formatUptime = (ms: number) => {
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remSec = seconds % 60;
		if (minutes < 60) return `${minutes}m ${remSec}s`;
		const hours = Math.floor(minutes / 60);
		return `${hours}h ${minutes % 60}m`;
	};

	return (
		<aside
			aria-label="Session Telemetry Overview"
			className="border-b border-border bg-surface1/60 px-4 py-1.5 transition-colors"
		>
			<div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
				<div className="flex items-center gap-4 text-zinc-400">
					<span className="flex items-center gap-1.5 text-zinc-300 font-semibold">
						<Activity className="h-3 w-3 text-cyan-400" />
						Session Telemetry
					</span>
					<span className="flex items-center gap-1">
						<Cpu className="h-3 w-3 text-zinc-500" />
						<span>Invocations:</span>
						<span className="text-white font-medium">
							{formatNumber(telemetry.totalOperations)}
						</span>
					</span>
					<span className="flex items-center gap-1">
						<Database className="h-3 w-3 text-zinc-500" />
						<span>Context Tokens:</span>
						<span className="text-cyan-300 font-medium">
							{formatNumber(telemetry.totalInputTokens)} in
						</span>
						<span className="text-zinc-500">/</span>
						<span className="text-emerald-300 font-medium">
							{formatNumber(telemetry.totalOutputTokens)} out
						</span>
					</span>
				</div>

				<div className="flex items-center gap-3 text-zinc-500">
					<span className="border border-white/10 px-1.5 py-0.2 rounded text-[10px] text-zinc-400">
						Tokenizer: {telemetry.estimatorName}
					</span>
					<span className="flex items-center gap-1 text-[10px]">
						<Clock className="h-2.5 w-2.5" />
						Uptime: {formatUptime(telemetry.sessionUptimeMs)}
					</span>
				</div>
			</div>
		</aside>
	);
}
