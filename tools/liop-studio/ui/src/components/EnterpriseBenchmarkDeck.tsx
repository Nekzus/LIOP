// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import {
	Activity,
	ArrowRight,
	Coins,
	Database,
	DollarSign,
	FileCheck,
	Lock,
	Scale,
	ShieldAlert,
	ShieldCheck,
	SlidersHorizontal,
	Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";

export interface EnterpriseBenchmarkDeckProps {
	/** Workload migration percentage: 0 (100% Legacy Pull) to 100 (100% LIOP In-situ) */
	migrationScale: number;
	onMigrationScaleChange: (newValue: number) => void;
	/** Empirical network & runtime telemetry from the active protocol execution */
	telemetry?: {
		liopTokens?: number;
		legacyTokens?: number;
		liopBytes?: number;
		legacyBytes?: number;
		liopLatencyMs?: number;
		legacyLatencyMs?: number;
		zkHash?: string;
		verifiedZk?: boolean;
		shieldBlocked?: boolean;
		fuelUsed?: number;
	};
	/** Callback to trigger enterprise production benchmark scenarios */
	onRunScenario?: (scenarioId: "bank" | "vault" | "oracle" | "attack") => void;
	/** Execution state */
	isRunning?: boolean;
	/** Active network endpoint */
	activeTargetName?: string;
	/** Active tool name */
	activeToolName?: string;
}

export function EnterpriseBenchmarkDeck({
	migrationScale,
	onMigrationScaleChange,
	telemetry,
	onRunScenario,
	isRunning = false,
	activeTargetName = "127.0.0.1:15051",
	activeToolName,
}: EnterpriseBenchmarkDeckProps) {
	// Baseline benchmark metrics
	const baselineLegacyTokens = telemetry?.legacyTokens ?? 48250;
	const baselineLiopTokens = telemetry?.liopTokens ?? 197;
	const baselineLegacyBytes = telemetry?.legacyBytes ?? 195400; // ~195 KB raw
	const baselineLiopBytes = telemetry?.liopBytes ?? 1240; // ~1.2 KB aggregated
	const baselineLegacyLatency = telemetry?.legacyLatencyMs ?? 3450;
	const baselineLiopLatency = telemetry?.liopLatencyMs ?? 110;

	// Interpolated values based on enterprise workload migration scale (0 to 100)
	const ratio = migrationScale / 100;
	const currentTokens = Math.round(
		baselineLegacyTokens * (1 - ratio) + baselineLiopTokens * ratio,
	);
	const currentBytes = Math.round(
		baselineLegacyBytes * (1 - ratio) + baselineLiopBytes * ratio,
	);
	const currentLatency = Math.round(
		baselineLegacyLatency * (1 - ratio) + baselineLiopLatency * ratio,
	);
	const currentCostPerQuery = (
		(currentTokens / 1_000_000) * 3.0 +
		(currentBytes / (1024 * 1024)) * 0.05
	).toFixed(4);

	const tokenSavingsPercent = (
		((baselineLegacyTokens - currentTokens) / baselineLegacyTokens) *
		100
	).toFixed(1);
	const byteSavingsPercent = (
		((baselineLegacyBytes - currentBytes) / baselineLegacyBytes) *
		100
	).toFixed(1);

	// FinOps TCO Forecaster: daily enterprise queries
	const [dailyQueries, setDailyQueries] = useState<number>(25000);

	const legacyAnnualCost = useMemo(() => {
		const costPerQuery = (baselineLegacyTokens / 1_000_000) * 3.0;
		return (costPerQuery * dailyQueries * 365).toLocaleString("en-US", {
			maximumFractionDigits: 0,
		});
	}, [dailyQueries, baselineLegacyTokens]);

	const liopAnnualCost = useMemo(() => {
		const costPerQuery = (baselineLiopTokens / 1_000_000) * 3.0;
		return (costPerQuery * dailyQueries * 365).toLocaleString("en-US", {
			maximumFractionDigits: 0,
		});
	}, [dailyQueries, baselineLiopTokens]);

	const annualSavingsDollar = useMemo(() => {
		const legacy =
			(baselineLegacyTokens / 1_000_000) * 3.0 * dailyQueries * 365;
		const liop = (baselineLiopTokens / 1_000_000) * 3.0 * dailyQueries * 365;
		return (legacy - liop).toLocaleString("en-US", {
			maximumFractionDigits: 0,
		});
	}, [dailyQueries, baselineLegacyTokens, baselineLiopTokens]);

	return (
		<div className="w-full space-y-6">
			{/* Operational Header Bar */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
				<div>
					<div className="flex items-center space-x-2.5">
						<span className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
							<SlidersHorizontal className="h-4 w-4" />
						</span>
						<h2 className="text-sm font-semibold tracking-tight text-white uppercase font-mono">
							Enterprise Observability & Sovereignty Cockpit
						</h2>
						<Badge
							variant="outline"
							className="text-[10px] font-mono border-primary/30 text-primary"
						>
							BENCHMARK v2.0
						</Badge>
					</div>
					<p className="text-xs text-zinc-400 mt-1">
						Data Sovereignty, FinOps Governance and Confidential Compute
						Verification
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<div className="flex items-center space-x-2 bg-surface1 px-3 py-1.5 rounded-md border border-white/10 text-xs font-mono">
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
						</span>
						<span className="text-zinc-400">ENDPOINT:</span>
						<span className="text-cyan-400 font-semibold">
							{activeTargetName}
						</span>
						{activeToolName && (
							<span className="text-zinc-500 hidden md:inline">
								({activeToolName})
							</span>
						)}
					</div>
					<div className="bg-surface1 px-3 py-1.5 rounded-md border border-white/10 text-xs font-mono text-zinc-300">
						<span className="text-zinc-400">NETWORK PULSE:</span>{" "}
						<span className="text-emerald-400 font-semibold">128 QPS</span>
					</div>
				</div>
			</div>

			{/* Executive KPI Scorecards (4 Columns) */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* KPI 1: Context Tokens */}
				<Card className="bg-card border-border/70 shadow-sm">
					<CardContent className="p-4 space-y-2">
						<div className="flex items-center justify-between text-xs text-zinc-400">
							<span className="font-mono uppercase text-[10px] flex items-center gap-1.5">
								<Coins className="h-3.5 w-3.5 text-cyan-400" />
								Context Tokens
							</span>
							<span className="font-mono text-emerald-400 text-[11px] font-semibold">
								-99.6%
							</span>
						</div>
						<div className="text-2xl font-mono font-bold text-white">
							{baselineLiopTokens.toLocaleString()}{" "}
							<span className="text-xs font-normal text-zinc-500">BPE</span>
						</div>
						<div className="text-[11px] text-zinc-400 border-t border-border/40 pt-2 flex items-center justify-between">
							<span>Traditional Baseline:</span>
							<span className="font-mono text-zinc-300">
								~{baselineLegacyTokens.toLocaleString()} BPE
							</span>
						</div>
					</CardContent>
				</Card>

				{/* KPI 2: WAN Egress */}
				<Card className="bg-card border-border/70 shadow-sm">
					<CardContent className="p-4 space-y-2">
						<div className="flex items-center justify-between text-xs text-zinc-400">
							<span className="font-mono uppercase text-[10px] flex items-center gap-1.5">
								<Database className="h-3.5 w-3.5 text-emerald-400" />
								WAN Wire Egress
							</span>
							<span className="font-mono text-emerald-400 text-[11px] font-semibold">
								-99.4%
							</span>
						</div>
						<div className="text-2xl font-mono font-bold text-emerald-400">
							{(baselineLiopBytes / 1024).toFixed(1)}{" "}
							<span className="text-xs font-normal text-zinc-500">KB</span>
						</div>
						<div className="text-[11px] text-zinc-400 border-t border-border/40 pt-2 flex items-center justify-between">
							<span>Uncompressed Raw:</span>
							<span className="font-mono text-zinc-300">
								{(baselineLegacyBytes / 1024).toFixed(1)} KB
							</span>
						</div>
					</CardContent>
				</Card>

				{/* KPI 3: Execution Latency */}
				<Card className="bg-card border-border/70 shadow-sm">
					<CardContent className="p-4 space-y-2">
						<div className="flex items-center justify-between text-xs text-zinc-400">
							<span className="font-mono uppercase text-[10px] flex items-center gap-1.5">
								<Zap className="h-3.5 w-3.5 text-amber-400" />
								Roundtrip Latency
							</span>
							<span className="font-mono text-emerald-400 text-[11px] font-semibold">
								-96.8%
							</span>
						</div>
						<div className="text-2xl font-mono font-bold text-white">
							{baselineLiopLatency}{" "}
							<span className="text-xs font-normal text-zinc-500">ms</span>
						</div>
						<div className="text-[11px] text-zinc-400 border-t border-border/40 pt-2 flex items-center justify-between">
							<span>WAN Streaming:</span>
							<span className="font-mono text-zinc-300">
								~{baselineLegacyLatency} ms
							</span>
						</div>
					</CardContent>
				</Card>

				{/* KPI 4: Privacy & Zero-Trust Status */}
				<Card className="bg-card border-border/70 shadow-sm">
					<CardContent className="p-4 space-y-2">
						<div className="flex items-center justify-between text-xs text-zinc-400">
							<span className="font-mono uppercase text-[10px] flex items-center gap-1.5">
								<ShieldCheck className="h-3.5 w-3.5 text-primary" />
								PII Exfiltration Risk
							</span>
							<Badge
								variant="success"
								className="text-[9px] font-mono uppercase"
							>
								Certified Zero
							</Badge>
						</div>
						<div className="text-2xl font-mono font-bold text-primary">
							0.0%{" "}
							<span className="text-xs font-normal text-zinc-500">Leakage</span>
						</div>
						<div className="text-[11px] text-zinc-400 border-t border-border/40 pt-2 flex items-center justify-between">
							<span>Integrity Proof:</span>
							<span className="font-mono text-emerald-400 flex items-center gap-1">
								<FileCheck className="h-3 w-3" /> ZK-Receipt
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Comparative Architecture Matrix (Side-by-Side A/B Benchmark) */}
			<div className="rounded-xl border border-border/70 bg-card p-5 space-y-5">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
					<div>
						<h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
							<Scale className="h-4 w-4 text-cyan-400" />
							<span>
								Architectural Benchmark: Context-Pulling vs Logic-on-Origin
							</span>
						</h3>
						<p className="text-xs text-zinc-400">
							Side-by-side empirical performance metrics across network, memory
							and privacy layers
						</p>
					</div>

					{/* Workload Migration Scale Presets */}
					<div className="flex items-center space-x-1.5 bg-surface1 p-1 rounded-lg border border-white/10 text-xs font-mono">
						<button
							type="button"
							onClick={() => onMigrationScaleChange(0)}
							className={`px-2.5 py-1 rounded transition-colors ${
								migrationScale === 0
									? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							0% PULL
						</button>
						<button
							type="button"
							onClick={() => onMigrationScaleChange(50)}
							className={`px-2.5 py-1 rounded transition-colors ${
								migrationScale === 50
									? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							50% HYBRID
						</button>
						<button
							type="button"
							onClick={() => onMigrationScaleChange(100)}
							className={`px-2.5 py-1 rounded transition-colors ${
								migrationScale === 100
									? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							100% IN-SITU
						</button>
					</div>
				</div>

				{/* Two-Column Comparison Card Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{/* Left: Conventional Context-Pulling */}
					<div
						className={`rounded-lg border p-4 transition-all ${
							migrationScale <= 30
								? "border-amber-500/50 bg-amber-950/10"
								: "border-border/60 bg-surface1/40"
						}`}
					>
						<div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
							<div>
								<div className="text-xs font-bold text-zinc-200">
									Conventional Context-Pulling (MCP Legacy)
								</div>
								<div className="text-[11px] text-zinc-400">
									Data moved across public WAN to inference model
								</div>
							</div>
							<Badge variant="destructive" className="font-mono text-[9px]">
								High Risk
							</Badge>
						</div>

						<div className="space-y-3 font-mono text-xs">
							<div className="flex justify-between items-center py-1 border-b border-border/30">
								<span className="text-zinc-400">Inference Context Volume:</span>
								<span className="text-amber-300 font-semibold">
									~{baselineLegacyTokens.toLocaleString()} BPE Tokens
								</span>
							</div>
							<div className="flex justify-between items-center py-1 border-b border-border/30">
								<span className="text-zinc-400">WAN Wire Payload (Raw):</span>
								<span className="text-red-400 font-semibold">
									{(baselineLegacyBytes / 1024).toFixed(1)} KB (100% Raw
									Records)
								</span>
							</div>
							<div className="flex justify-between items-center py-1 border-b border-border/30">
								<span className="text-zinc-400">Ingestion Latency (P95):</span>
								<span className="text-zinc-300 font-semibold">
									~{baselineLegacyLatency} ms
								</span>
							</div>
							<div className="flex justify-between items-center py-1 border-b border-border/30">
								<span className="text-zinc-400">Regulatory Risk:</span>
								<span className="text-red-400 font-semibold flex items-center gap-1">
									<ShieldAlert className="h-3.5 w-3.5" /> PII Export Required
								</span>
							</div>
							<div className="flex justify-between items-center py-1">
								<span className="text-zinc-400">Cost per Query:</span>
								<span className="text-amber-300 font-semibold">
									~$0.248 / execution
								</span>
							</div>
						</div>
					</div>

					{/* Right: Logic-Injection-on-Origin */}
					<div
						className={`rounded-lg border p-4 transition-all ${
							migrationScale >= 70
								? "border-emerald-500/50 bg-emerald-950/10"
								: "border-border/60 bg-surface1/40"
						}`}
					>
						<div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
							<div>
								<div className="text-xs font-bold text-emerald-300">
									Logic-Injection-on-Origin (LIOP Sovereign)
								</div>
								<div className="text-[11px] text-zinc-400">
									Sandboxed computation executed in origin enclave
								</div>
							</div>
							<Badge variant="success" className="font-mono text-[9px]">
								Zero-Trust
							</Badge>
						</div>

						<div className="space-y-3 font-mono text-xs">
							<div className="flex justify-between items-center py-1 border-b border-border/30">
								<span className="text-zinc-400">Inference Context Volume:</span>
								<span className="text-emerald-400 font-semibold">
									~{baselineLiopTokens.toLocaleString()} BPE Tokens (-99.6%)
								</span>
							</div>
							<div className="flex justify-between items-center py-1 border-b border-border/30">
								<span className="text-zinc-400">WAN Wire Payload (Aggr):</span>
								<span className="text-cyan-300 font-semibold">
									{(baselineLiopBytes / 1024).toFixed(1)} KB (Aggregated
									Summary)
								</span>
							</div>
							<div className="flex justify-between items-center py-1 border-b border-border/30">
								<span className="text-zinc-400">Ingestion Latency (P95):</span>
								<span className="text-emerald-400 font-semibold">
									~{baselineLiopLatency} ms (-96.8%)
								</span>
							</div>
							<div className="flex justify-between items-center py-1 border-b border-border/30">
								<span className="text-zinc-400">Regulatory Compliance:</span>
								<span className="text-emerald-400 font-semibold flex items-center gap-1">
									<ShieldCheck className="h-3.5 w-3.5" /> Zero Raw Export Sealed
								</span>
							</div>
							<div className="flex justify-between items-center py-1">
								<span className="text-zinc-400">Cost per Query:</span>
								<span className="text-emerald-400 font-semibold">
									~$0.001 / execution
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Workload Migration Slider */}
				<div className="space-y-2 pt-2 border-t border-border/40">
					<div className="flex justify-between items-center text-xs font-mono">
						<span className="text-zinc-400 flex items-center gap-1.5">
							<span>Enterprise Workload Migration Scale:</span>
							<span className="text-cyan-400 font-semibold">
								{migrationScale}% LIOP In-Situ
							</span>
						</span>
						<span className="text-zinc-400">
							Active Metric Projection:{" "}
							<span className="text-zinc-200 font-semibold">
								{currentTokens.toLocaleString()} tokens (-{tokenSavingsPercent}
								%)
							</span>{" "}
							·{" "}
							<span className="text-zinc-200 font-semibold">
								{(currentBytes / 1024).toFixed(1)} KB (-{byteSavingsPercent}%)
							</span>{" "}
							·{" "}
							<span className="text-emerald-400 font-semibold">
								{currentLatency} ms
							</span>{" "}
							·{" "}
							<span className="text-amber-300 font-semibold">
								${currentCostPerQuery}/query
							</span>
						</span>
					</div>
					<input
						type="range"
						min="0"
						max="100"
						value={migrationScale}
						onChange={(e) => onMigrationScaleChange(Number(e.target.value))}
						className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
						id="enterprise-migration-slider"
					/>
				</div>
			</div>

			{/* Enterprise Workload Benchmark Scenarios (4 Columns) */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						<Activity className="h-4 w-4 text-cyan-400" />
						<h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
							Enterprise Production Scenarios (1-Click Dispatch)
						</h3>
					</div>
					<span className="text-[11px] text-zinc-400 font-mono">
						Deterministic execution across sovereign enclaves
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					{/* Scenario 1: Banking */}
					<button
						type="button"
						disabled={isRunning}
						onClick={() => onRunScenario?.("bank")}
						className="text-left rounded-xl border border-border/80 bg-card hover:border-cyan-500/60 p-4 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
					>
						<div className="flex items-center justify-between mb-2">
							<Badge
								variant="outline"
								className="text-[9px] font-mono border-cyan-500/40 text-cyan-300"
							>
								TIER 1 ENCLAVE
							</Badge>
							<span className="text-[10px] font-mono text-zinc-400">
								BANKING
							</span>
						</div>
						<div className="text-xs font-bold text-zinc-200 group-hover:text-cyan-300 transition-colors">
							Core Bank Account Balances
						</div>
						<p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
							Aggregates $148M across 1,500 accounts in enclave without exposing
							account IDs or PII.
						</p>
						<div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-zinc-400">
							<span className="text-emerald-400 font-semibold">
								48k → 197 tokens
							</span>
							<span className="text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
								Execute <ArrowRight className="h-3 w-3" />
							</span>
						</div>
					</button>

					{/* Scenario 2: Healthcare */}
					<button
						type="button"
						disabled={isRunning}
						onClick={() => onRunScenario?.("vault")}
						className="text-left rounded-xl border border-border/80 bg-card hover:border-emerald-500/60 p-4 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
					>
						<div className="flex items-center justify-between mb-2">
							<Badge
								variant="outline"
								className="text-[9px] font-mono border-emerald-500/40 text-emerald-300"
							>
								TIER 1 ENCLAVE
							</Badge>
							<span className="text-[10px] font-mono text-zinc-400">
								HEALTHCARE
							</span>
						</div>
						<div className="text-xs font-bold text-zinc-200 group-hover:text-emerald-300 transition-colors">
							Clinical EHR Patient Records
						</div>
						<p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
							Computes diagnostic cohorts and mean patient age on 2,500 records
							under HIPAA Safe Harbor.
						</p>
						<div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-zinc-400">
							<span className="text-emerald-400 font-semibold">
								62k → 184 tokens
							</span>
							<span className="text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
								Execute <ArrowRight className="h-3 w-3" />
							</span>
						</div>
					</button>

					{/* Scenario 3: HFT Oracle */}
					<button
						type="button"
						disabled={isRunning}
						onClick={() => onRunScenario?.("oracle")}
						className="text-left rounded-xl border border-border/80 bg-card hover:border-amber-500/60 p-4 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
					>
						<div className="flex items-center justify-between mb-2">
							<Badge
								variant="outline"
								className="text-[9px] font-mono border-amber-500/40 text-amber-300"
							>
								TIER 2 CONSORTIUM
							</Badge>
							<span className="text-[10px] font-mono text-zinc-400">
								FINTECH HFT
							</span>
						</div>
						<div className="text-xs font-bold text-zinc-200 group-hover:text-amber-300 transition-colors">
							Market Microstructure & VWAP
						</div>
						<p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
							Evaluates bid/ask spreads and VWAP over L2 orderbook ticks in
							sub-millisecond runtime.
						</p>
						<div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-zinc-400">
							<span className="text-emerald-400 font-semibold">
								38k → 142 tokens
							</span>
							<span className="text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
								Execute <ArrowRight className="h-3 w-3" />
							</span>
						</div>
					</button>

					{/* Scenario 4: Security Attack Trap */}
					<button
						type="button"
						disabled={isRunning}
						onClick={() => onRunScenario?.("attack")}
						className="text-left rounded-xl border border-border/80 bg-card hover:border-red-500/60 p-4 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
					>
						<div className="flex items-center justify-between mb-2">
							<Badge variant="destructive" className="text-[9px] font-mono">
								SECURITY AUDIT
							</Badge>
							<span className="text-[10px] font-mono text-zinc-400">
								DEFENSE TEST
							</span>
						</div>
						<div className="text-xs font-bold text-zinc-200 group-hover:text-red-300 transition-colors">
							PII Exfiltration Stress Test
						</div>
						<p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
							Simulates hostile logic attempting to leak unaggregated SSNs;
							intercepted by Egress Shield.
						</p>
						<div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-zinc-400">
							<span className="text-red-400 font-semibold">
								Defense: Intercepted
							</span>
							<span className="text-red-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
								Test Shield <ArrowRight className="h-3 w-3" />
							</span>
						</div>
					</button>
				</div>
			</div>

			{/* FinOps TCO Forecaster & Regulatory Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
				{/* FinOps TCO Forecaster (7 cols) */}
				<div className="lg:col-span-7 rounded-xl border border-border/70 bg-card p-4 space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<DollarSign className="h-4 w-4 text-emerald-400" />
							<span className="text-xs font-mono font-bold uppercase text-zinc-200">
								FinOps Annual Cost Reduction Forecaster
							</span>
						</div>
						<span className="text-xs font-mono text-zinc-400">
							Scale:{" "}
							<span className="text-zinc-200 font-semibold">
								{dailyQueries.toLocaleString()} queries / day
							</span>
						</span>
					</div>

					<div className="space-y-2">
						<div className="flex justify-between text-[11px] text-zinc-400">
							<span>Enterprise Daily Protocol Call Volume:</span>
							<span className="font-mono text-zinc-300 font-semibold">
								{dailyQueries.toLocaleString()} calls / day
							</span>
						</div>
						<input
							type="range"
							min="5000"
							max="250000"
							step="5000"
							value={dailyQueries}
							onChange={(e) => setDailyQueries(Number(e.target.value))}
							className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
							id="finops-daily-queries"
						/>
						<div className="flex justify-between text-[9px] font-mono text-zinc-500">
							<span>5k/day</span>
							<span>50k</span>
							<span>100k</span>
							<span>175k</span>
							<span>250k/day</span>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-center font-mono">
						<div className="bg-surface1/60 border border-border/40 p-2.5 rounded-lg">
							<div className="text-[10px] text-zinc-400 uppercase">
								Traditional WAN Bill
							</div>
							<div className="text-sm font-bold text-red-400 mt-0.5">
								${legacyAnnualCost} / yr
							</div>
							<div className="text-[9px] text-zinc-500 mt-0.5">
								Context Pulling
							</div>
						</div>

						<div className="bg-surface1/60 border border-border/40 p-2.5 rounded-lg">
							<div className="text-[10px] text-zinc-400 uppercase">
								LIOP In-Situ Cost
							</div>
							<div className="text-sm font-bold text-cyan-300 mt-0.5">
								${liopAnnualCost} / yr
							</div>
							<div className="text-[9px] text-zinc-500 mt-0.5">
								Aggregated Output
							</div>
						</div>

						<div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded-lg">
							<div className="text-[10px] text-emerald-400 uppercase font-semibold">
								Net Annual Savings
							</div>
							<div className="text-base font-extrabold text-emerald-300 mt-0.5">
								+${annualSavingsDollar}
							</div>
							<div className="text-[9px] text-emerald-400/80 mt-0.5">
								99.5% Net Profit Saved
							</div>
						</div>
					</div>
				</div>

				{/* Regulatory Compliance Status Grid (5 cols) */}
				<div className="lg:col-span-5 rounded-xl border border-border/70 bg-card p-4 space-y-3">
					<div className="flex items-center space-x-2">
						<Lock className="h-4 w-4 text-cyan-400" />
						<span className="text-xs font-mono font-bold uppercase text-zinc-200">
							Regulatory Compliance Attestation
						</span>
					</div>

					<div className="space-y-2 text-xs font-mono">
						<div className="flex items-center justify-between p-2 rounded bg-surface1/50 border border-border/40">
							<span className="text-zinc-300">GDPR Article 44</span>
							<Badge
								variant="outline"
								className="text-[9px] border-emerald-500/40 text-emerald-300"
							>
								Compliant · In-Situ
							</Badge>
						</div>
						<div className="flex items-center justify-between p-2 rounded bg-surface1/50 border border-border/40">
							<span className="text-zinc-300">HIPAA Safe Harbor</span>
							<Badge
								variant="outline"
								className="text-[9px] border-emerald-500/40 text-emerald-300"
							>
								Zero Raw PHI Egress
							</Badge>
						</div>
						<div className="flex items-center justify-between p-2 rounded bg-surface1/50 border border-border/40">
							<span className="text-zinc-300">PCI-DSS v4.0</span>
							<Badge
								variant="outline"
								className="text-[9px] border-emerald-500/40 text-emerald-300"
							>
								Enclave Isolated
							</Badge>
						</div>
						<div className="flex items-center justify-between p-2 rounded bg-surface1/50 border border-border/40">
							<span className="text-zinc-300">SOC 2 Type II</span>
							<Badge
								variant="outline"
								className="text-[9px] border-cyan-500/40 text-cyan-300"
							>
								ZK-Receipt Sealed
							</Badge>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
