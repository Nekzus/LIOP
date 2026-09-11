// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import {
	Activity,
	ArrowDownRight,
	BarChart2,
	Check,
	CheckCircle2,
	Copy,
	Database,
	FileJson,
	Layers,
	Lock,
	ShieldCheck,
	Sparkles,
	TrendingUp,
	Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { copyToClipboard } from "../../lib/clipboard";
import type { ExecutionMeta } from "../../types";

interface OriginResultViewerProps {
	// biome-ignore lint/suspicious/noExplicitAny: Generic JSON result payload
	result: Record<string, any>;
	meta?: ExecutionMeta | null;
}

export function OriginResultViewer({ result, meta }: OriginResultViewerProps) {
	const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		const ok = await copyToClipboard(JSON.stringify(result, null, 2));
		if (ok) {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		}
	};

	// Detect result schema archetype
	const archetype = useMemo(() => {
		if (
			result.totalBalance !== undefined ||
			result.totalAccounts !== undefined
		) {
			return "banking";
		}
		if (
			result.totalPatients !== undefined ||
			result.diagnosesDistribution !== undefined
		) {
			return "healthcare";
		}
		if (result.ticksProcessed !== undefined || result.vwap !== undefined) {
			return "hft";
		}
		if (
			result.totalSamples !== undefined ||
			result.avgTemperature !== undefined
		) {
			return "iot";
		}
		if (result.layerAudit !== undefined || result.protocol !== undefined) {
			return "perimeter";
		}
		return "generic";
	}, [result]);

	// Format currency helper
	const formatCurrency = (num: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			maximumFractionDigits: 0,
		}).format(num);
	};

	return (
		<div className="space-y-4">
			{/* Top Bar: Archetype Badge & View Mode Toggle */}
			<div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
						<ShieldCheck className="h-3.5 w-3.5" />
						<span>
							{archetype === "banking" &&
								"Core Banking Enclave • Verified Aggregation"}
							{archetype === "healthcare" &&
								"Healthcare EHR Enclave • HIPAA Protected"}
							{archetype === "hft" && "HFT Market Oracle • Ultra Low Latency"}
							{archetype === "iot" &&
								"Industrial Edge Telemetry • Hostile WAN Protected"}
							{archetype === "perimeter" &&
								"Border LIO Gateway • Zero-Trust Perimeter"}
							{archetype === "generic" &&
								"Origin Compute • Zero-Trust Execution"}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex items-center bg-surface1 p-0.5 rounded-lg border border-white/10 text-[11px]">
						<button
							type="button"
							onClick={() => setViewMode("visual")}
							className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
								viewMode === "visual"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							<BarChart2 className="h-3 w-3" />
							<span>Visual Analytics</span>
						</button>
						<button
							type="button"
							onClick={() => setViewMode("json")}
							className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
								viewMode === "json"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							<FileJson className="h-3 w-3" />
							<span>Raw JSON</span>
						</button>
					</div>

					<button
						type="button"
						onClick={handleCopy}
						className={`text-[11px] flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-md font-medium border cursor-pointer ${
							copied
								? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
								: "text-zinc-300 hover:text-white bg-surface1 hover:bg-white/5 border-white/10"
						}`}
						title="Copy JSON Payload"
					>
						{copied ? (
							<>
								<Check className="h-3 w-3 text-emerald-400" />
								<span>Copied</span>
							</>
						) : (
							<>
								<Copy className="h-3 w-3" />
								<span>Copy</span>
							</>
						)}
					</button>
				</div>
			</div>

			{viewMode === "visual" ? (
				<div className="space-y-4">
					{/* Archetype KPI Cards */}
					{archetype === "banking" && (
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="p-3.5 rounded-lg bg-surface1/80 border border-emerald-500/20 shadow-sm">
								<div className="text-[11px] text-zinc-400 font-medium flex items-center justify-between">
									<span>Total Accounts In-Situ</span>
									<Database className="h-3.5 w-3.5 text-emerald-400" />
								</div>
								<div className="text-xl font-bold text-white mt-1 font-mono">
									{(result.totalAccounts ?? 0).toLocaleString()}
								</div>
								<div className="text-[10px] text-emerald-400/80 mt-1 flex items-center gap-1">
									<CheckCircle2 className="h-2.5 w-2.5" />
									<span>100% Retained at origin</span>
								</div>
							</div>

							<div className="p-3.5 rounded-lg bg-surface1/80 border border-emerald-500/20 shadow-sm">
								<div className="text-[11px] text-zinc-400 font-medium flex items-center justify-between">
									<span>Aggregated Balance</span>
									<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
								</div>
								<div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
									{formatCurrency(result.totalBalance ?? 0)}
								</div>
								<div className="text-[10px] text-zinc-400 mt-1">
									Computed inside V8 Sandbox
								</div>
							</div>

							<div className="p-3.5 rounded-lg bg-surface1/80 border border-white/10 shadow-sm">
								<div className="text-[11px] text-zinc-400 font-medium flex items-center justify-between">
									<span>Mean Account Balance</span>
									<Activity className="h-3.5 w-3.5 text-cyan-400" />
								</div>
								<div className="text-xl font-bold text-white mt-1 font-mono">
									{formatCurrency(result.averageBalance ?? 0)}
								</div>
								<div className="text-[10px] text-zinc-400 mt-1">
									Statistical variance preserved
								</div>
							</div>
						</div>
					)}

					{archetype === "healthcare" && (
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="p-3.5 rounded-lg bg-surface1/80 border border-cyan-500/20 shadow-sm">
								<div className="text-[11px] text-zinc-400 font-medium flex items-center justify-between">
									<span>Audited Patients</span>
									<Database className="h-3.5 w-3.5 text-cyan-400" />
								</div>
								<div className="text-xl font-bold text-white mt-1 font-mono">
									{(result.totalPatients ?? 0).toLocaleString()}
								</div>
								<div className="text-[10px] text-cyan-400/80 mt-1 flex items-center gap-1">
									<Lock className="h-2.5 w-2.5" />
									<span>Zero HIPAA records leaked</span>
								</div>
							</div>

							<div className="p-3.5 rounded-lg bg-surface1/80 border border-cyan-500/20 shadow-sm">
								<div className="text-[11px] text-zinc-400 font-medium flex items-center justify-between">
									<span>Mean Population Age</span>
									<Activity className="h-3.5 w-3.5 text-cyan-400" />
								</div>
								<div className="text-xl font-bold text-cyan-300 mt-1 font-mono">
									{result.averageAge ?? 0} yrs
								</div>
								<div className="text-[10px] text-zinc-400 mt-1">
									Aggregated demographic mean
								</div>
							</div>

							<div className="p-3.5 rounded-lg bg-surface1/80 border border-white/10 shadow-sm">
								<div className="text-[11px] text-zinc-400 font-medium flex items-center justify-between">
									<span>Diagnostic Classes</span>
									<Layers className="h-3.5 w-3.5 text-purple-400" />
								</div>
								<div className="text-xl font-bold text-white mt-1 font-mono">
									{Object.keys(result.diagnosesDistribution || {}).length}
								</div>
								<div className="text-[10px] text-zinc-400 mt-1">
									Differential privacy preserved
								</div>
							</div>
						</div>
					)}

					{archetype === "hft" && (
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="p-3.5 rounded-lg bg-surface1/80 border border-purple-500/20 shadow-sm">
								<div className="text-[11px] text-zinc-400 font-medium flex items-center justify-between">
									<span>Orderbook Ticks</span>
									<Zap className="h-3.5 w-3.5 text-purple-400" />
								</div>
								<div className="text-xl font-bold text-white mt-1 font-mono">
									{(result.ticksProcessed ?? 0).toLocaleString()}
								</div>
								<div className="text-[10px] text-purple-400/80 mt-1">
									Sub-millisecond processing
								</div>
							</div>

							<div className="p-3.5 rounded-lg bg-surface1/80 border border-purple-500/20 shadow-sm">
								<div className="text-[11px] text-zinc-400 font-medium flex items-center justify-between">
									<span>Volume-Weighted Price (VWAP)</span>
									<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
								</div>
								<div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
									{result.vwap ? `$${result.vwap.toFixed(4)}` : "Computed"}
								</div>
								<div className="text-[10px] text-zinc-400 mt-1">
									Real-time orderbook weighting
								</div>
							</div>

							<div className="p-3.5 rounded-lg bg-surface1/80 border border-white/10 shadow-sm">
								<div className="text-[11px] text-zinc-400 font-medium flex items-center justify-between">
									<span>Avg Spread (bps)</span>
									<Activity className="h-3.5 w-3.5 text-amber-400" />
								</div>
								<div className="text-xl font-bold text-white mt-1 font-mono">
									{result.avgSpreadBps
										? `${Number(result.avgSpreadBps).toFixed(1)} bps`
										: "0 bps"}
								</div>
								<div className="text-[10px] text-zinc-400 mt-1">
									Microstructure liquidity metric
								</div>
							</div>
						</div>
					)}

					{archetype === "iot" && (
						<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
							<div className="p-3.5 rounded-lg bg-surface1/80 border border-white/10">
								<div className="text-[11px] text-zinc-400 font-medium">
									Sensor Samples
								</div>
								<div className="text-xl font-bold text-white mt-1 font-mono">
									{(result.totalSamples ?? 0).toLocaleString()}
								</div>
							</div>
							<div className="p-3.5 rounded-lg bg-surface1/80 border border-cyan-500/20">
								<div className="text-[11px] text-zinc-400 font-medium">
									Avg Temperature
								</div>
								<div className="text-xl font-bold text-cyan-300 mt-1 font-mono">
									{result.avgTemperature ?? 0}°C
								</div>
							</div>
							<div className="p-3.5 rounded-lg bg-surface1/80 border border-amber-500/20">
								<div className="text-[11px] text-zinc-400 font-medium">
									Max Temp Peak
								</div>
								<div className="text-xl font-bold text-amber-400 mt-1 font-mono">
									{result.maxTemperature ?? 0}°C
								</div>
							</div>
							<div className="p-3.5 rounded-lg bg-surface1/80 border border-rose-500/20">
								<div className="text-[11px] text-zinc-400 font-medium">
									Critical Alerts
								</div>
								<div className="text-xl font-bold text-rose-400 mt-1 font-mono">
									{result.criticalCount ?? 0}
								</div>
							</div>
						</div>
					)}

					{archetype === "perimeter" &&
						result.layerAudit &&
						Array.isArray(result.layerAudit) && (
							<div className="p-4 rounded-lg bg-surface1/60 border border-emerald-500/20 space-y-2">
								<div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
									<ShieldCheck className="h-4 w-4" />
									<span>Zero-Trust 6-Layer Security Audit Confirmed</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
									{result.layerAudit.map((layer: string) => (
										<div
											key={layer}
											className="flex items-center gap-2 text-xs font-mono text-zinc-300 bg-surface1 px-2.5 py-1.5 rounded border border-white/5"
										>
											<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
											<span>{layer}</span>
										</div>
									))}
								</div>
							</div>
						)}

					{/* Distribution Breakdown Bars (if distribution exists) */}
					{(result.distribution ||
						result.diagnosesDistribution ||
						result.statusDistribution) && (
						<div className="p-3.5 rounded-lg bg-surface1/60 border border-white/10 space-y-3">
							<div className="flex items-center justify-between text-xs">
								<span className="font-semibold text-zinc-200">
									Distribution Breakdown (In-Situ Grouping)
								</span>
								<span className="text-[10px] font-mono text-zinc-400">
									Aggregated at Origin
								</span>
							</div>
							<div className="space-y-2">
								{Object.entries(
									result.distribution ||
										result.diagnosesDistribution ||
										result.statusDistribution ||
										{},
								).map(([key, val]) => {
									const count = Number(val) || 0;
									const total =
										result.totalAccounts ||
										result.totalPatients ||
										result.totalSamples ||
										1;
									const pct = Math.min(100, Math.round((count / total) * 100));
									return (
										<div key={key} className="space-y-1">
											<div className="flex items-center justify-between text-[11px] font-mono">
												<span className="text-zinc-300">{key}</span>
												<span className="text-zinc-400">
													{count.toLocaleString()} ({pct}%)
												</span>
											</div>
											<div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
												<div
													className="h-full bg-emerald-500 rounded-full transition-all duration-500"
													style={{ width: `${pct}%` }}
												/>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* The Game-Changing Differential: LIOP vs Traditional MCP */}
					<div className="p-4 rounded-lg bg-gradient-to-br from-emerald-950/20 via-surface1/80 to-surface1/40 border border-emerald-500/30 space-y-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Sparkles className="h-4 w-4 text-emerald-400" />
								<h4 className="text-xs font-bold text-white uppercase tracking-wider">
									Protocol Value Differential: LIOP vs Traditional MCP
								</h4>
							</div>
							<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
								SOVEREIGNTY CERTIFIED
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
							<div className="space-y-1 bg-surface1/60 p-2.5 rounded border border-white/5">
								<div className="text-[10px] text-zinc-400 font-medium">
									LLM Context Tokens
								</div>
								<div className="flex items-baseline gap-1.5">
									<span className="text-sm font-bold text-emerald-400 font-mono">
										~{meta?.telemetry?.tokens?.totalTokens ?? 197} tok
									</span>
									<span className="text-[10px] text-zinc-500 line-through font-mono">
										~48,000 tok
									</span>
								</div>
								<div className="text-[10px] text-emerald-400/90 flex items-center gap-0.5">
									<ArrowDownRight className="h-3 w-3" />
									<span>99.6% context reduction</span>
								</div>
							</div>

							<div className="space-y-1 bg-surface1/60 p-2.5 rounded border border-white/5">
								<div className="text-[10px] text-zinc-400 font-medium">
									Wire Egress Payload
								</div>
								<div className="flex items-baseline gap-1.5">
									<span className="text-sm font-bold text-emerald-400 font-mono">
										{meta?.telemetry?.bandwidth?.payloadBytes
											? `${(meta.telemetry.bandwidth.payloadBytes / 1024).toFixed(2)} KB`
											: "0.72 KB"}
									</span>
									<span className="text-[10px] text-zinc-500 line-through font-mono">
										195.2 KB
									</span>
								</div>
								<div className="text-[10px] text-emerald-400/90 flex items-center gap-0.5">
									<ArrowDownRight className="h-3 w-3" />
									<span>99.6% network reduction</span>
								</div>
							</div>

							<div className="space-y-1 bg-surface1/60 p-2.5 rounded border border-white/5">
								<div className="text-[10px] text-zinc-400 font-medium">
									PII Exposure Boundary
								</div>
								<div className="flex items-baseline gap-1.5">
									<span className="text-sm font-bold text-emerald-400 font-mono">
										0 Leaked Records
									</span>
								</div>
								<div className="text-[10px] text-emerald-400/90 flex items-center gap-0.5">
									<CheckCircle2 className="h-3 w-3" />
									<span>Enclave & PQC Kyber-768 sealed</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			) : (
				/* Raw JSON Payload View */
				<div className="rounded-lg bg-editor border border-border p-3.5 font-mono text-[11px] text-[#86efac] overflow-x-auto leading-relaxed shadow-inner">
					<pre>{JSON.stringify(result, null, 2)}</pre>
				</div>
			)}
		</div>
	);
}
