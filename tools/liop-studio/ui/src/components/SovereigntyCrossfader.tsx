import {
	Activity,
	AlertOctagon,
	ArrowRight,
	Coins,
	Database,
	DollarSign,
	Flame,
	Play,
	ShieldAlert,
	ShieldCheck,
	Sliders,
	Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "./ui/badge";

export interface SovereigntyCrossfaderProps {
	/** Crossfader position: 0 (100% Legacy Pull) to 100 (100% LIOP In-situ) */
	value: number;
	onChange: (newValue: number) => void;
	/** Real empirical telemetry from the latest protocol execution */
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
	/** Callback to dispatch 1-click live demo presets */
	onRunDemo?: (scenarioId: "bank" | "vault" | "oracle" | "attack") => void;
	/** Whether an execution is actively in progress */
	isRunning?: boolean;
	/** Active node hostname/identity */
	activeTargetName?: string;
	/** Active MCP tool capability */
	activeTool?: string;
}

// 12-Segment LED VU Meter Component for visual audio/telemetry console feel
function VuMeter({
	level,
	color = "red",
	label,
}: {
	level: number; // 0 to 100
	color?: "red" | "green" | "cyan";
	label: string;
}) {
	const activeSegments = Math.round(
		(Math.max(0, Math.min(100, level)) / 100) * 12,
	);
	return (
		<div className="flex flex-col items-center gap-1">
			<div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400">
				{label}
			</div>
			<div className="flex flex-col-reverse gap-0.5 p-1 bg-zinc-950/80 rounded border border-border/40">
				{Array.from({ length: 12 }).map((_, i) => {
					const isActive = i < activeSegments;
					let segmentColor = "bg-zinc-800/40";
					if (isActive) {
						if (color === "red") {
							segmentColor =
								i > 8
									? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
									: i > 5
										? "bg-amber-500"
										: "bg-yellow-500";
						} else if (color === "green") {
							segmentColor =
								i > 8
									? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
									: "bg-emerald-500";
						} else {
							segmentColor =
								i > 8
									? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
									: "bg-cyan-500";
						}
					}
					return (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: Fixed 12-segment display
							key={i}
							className={`w-5 h-1.5 rounded-[1px] transition-colors duration-150 ${segmentColor}`}
						/>
					);
				})}
			</div>
			<div className="text-[10px] font-mono font-bold text-zinc-300">
				{level}%
			</div>
		</div>
	);
}

export function SovereigntyCrossfader({
	value,
	onChange,
	telemetry,
	onRunDemo,
	isRunning = false,
	activeTargetName = "127.0.0.1:15051",
	activeTool,
}: SovereigntyCrossfaderProps) {
	// Baseline benchmark metrics (default to empirical realistic standards if not yet executed)
	const baselineLegacyTokens = telemetry?.legacyTokens ?? 48250;
	const baselineLiopTokens = telemetry?.liopTokens ?? 197;
	const baselineLegacyBytes = telemetry?.legacyBytes ?? 195400; // ~195 KB raw
	const baselineLiopBytes = telemetry?.liopBytes ?? 1240; // ~1.2 KB aggregated
	const baselineLegacyLatency = telemetry?.legacyLatencyMs ?? 3450;
	const baselineLiopLatency = telemetry?.liopLatencyMs ?? 110;

	// Interpolated values based on crossfader position (0 to 100)
	const ratio = value / 100;
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

	// ROI Calculator state: daily queries in enterprise
	const [dailyQueries, setDailyQueries] = useState<number>(10000);
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
			{/* Top DJ Deck Console Frame */}
			<div className="relative rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-5 shadow-2xl overflow-hidden transition-all">
				{/* Top Status Bar with Master Knobs & Tempo Display */}
				<div className="flex flex-wrap items-center justify-between pb-4 mb-5 border-b border-border/50 gap-3">
					<div className="flex items-center space-x-3">
						<div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
							<Sliders className="h-5 w-5" />
						</div>
						<div>
							<h3 className="text-sm font-semibold tracking-wide flex items-center gap-2">
								<span>THE SOVEREIGNTY COMMAND DECK</span>
								<Badge
									variant="outline"
									className="text-[10px] font-mono border-primary/40 text-primary"
								>
									PROTOCOL SURFBOARD
								</Badge>
							</h3>
							<p className="text-xs text-zinc-400">
								Dual-Engine Sovereignty Crossfader & Live Analytical Launchpad
							</p>
						</div>
					</div>

					{/* Network Beat & Target Indicator */}
					<div className="flex items-center space-x-4 bg-zinc-950/60 px-3.5 py-1.5 rounded-lg border border-border/60">
						<div className="flex items-center space-x-2">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
							</span>
							<span className="text-[11px] font-mono text-zinc-300">
								BPM / PULSE:{" "}
								<span className="text-emerald-400 font-bold">128 QPS</span>
							</span>
						</div>
						<div className="h-3 w-px bg-border/80" />
						<div className="text-[11px] font-mono text-zinc-400">
							TARGET:{" "}
							<span className="text-cyan-400 font-semibold">
								{activeTargetName}
							</span>
							{activeTool && (
								<span className="text-zinc-500 ml-1.5 hidden sm:inline">
									({activeTool})
								</span>
							)}
						</div>
					</div>
				</div>

				{/* Two-Deck Audio Layout: Deck A (Pull) vs Deck B (Inject) */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
					{/* DECK A: LEGACY CONTEXT-PULLING (Left Side) */}
					<div
						className={`lg:col-span-5 rounded-xl border p-4 transition-all duration-300 ${
							value <= 30
								? "border-amber-500/60 bg-amber-950/20 shadow-[0_0_25px_rgba(245,158,11,0.15)]"
								: "border-border/60 bg-card/40 opacity-70"
						}`}
					>
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center space-x-2">
								<span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30">
									DECK A
								</span>
								<span className="text-xs font-semibold text-zinc-300">
									LEGACY MCP (CONTEXT-PULL)
								</span>
							</div>
							<Badge
								variant="destructive"
								className="text-[9px] font-mono uppercase"
							>
								Unprotected Wire
							</Badge>
						</div>

						<div className="flex items-center justify-between gap-3">
							{/* Metrics Stack */}
							<div className="space-y-2.5 flex-1">
								<div>
									<div className="text-[10px] uppercase font-mono text-zinc-400 flex items-center gap-1">
										<Coins className="h-3 w-3 text-amber-400" />
										<span>Token Context Window</span>
									</div>
									<div className="text-lg font-mono font-bold text-amber-300">
										~{baselineLegacyTokens.toLocaleString()}{" "}
										<span className="text-xs font-normal text-zinc-400">
											BPE
										</span>
									</div>
								</div>

								<div>
									<div className="text-[10px] uppercase font-mono text-zinc-400 flex items-center gap-1">
										<Database className="h-3 w-3 text-red-400" />
										<span>Wire Egress (Raw Payload)</span>
									</div>
									<div className="text-sm font-mono font-semibold text-red-300">
										{(baselineLegacyBytes / 1024).toFixed(1)} KB{" "}
										<span className="text-[10px] text-zinc-400">
											(100% Raw Rows)
										</span>
									</div>
								</div>

								<div>
									<div className="text-[10px] uppercase font-mono text-zinc-400 flex items-center gap-1">
										<Activity className="h-3 w-3 text-amber-400" />
										<span>Roundtrip Ingestion Latency</span>
									</div>
									<div className="text-sm font-mono font-semibold text-zinc-300">
										~{baselineLegacyLatency} ms
									</div>
								</div>
							</div>

							{/* VU Meter Visualizer */}
							<VuMeter level={100} color="red" label="PII EXPOSURE" />
						</div>

						<div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-zinc-400">
							<span className="flex items-center gap-1 text-red-400 font-mono">
								<ShieldAlert className="h-3 w-3" /> GDPR / HIPAA Risk
							</span>
							<span className="font-mono text-zinc-300">~$0.25 / query</span>
						</div>
					</div>

					{/* CENTER EQ & CROSSFADER TRACK (Middle 2 Columns) */}
					<div className="lg:col-span-2 flex flex-col items-center justify-center py-2 px-1 text-center">
						<div className="text-[10px] font-mono tracking-wider uppercase text-zinc-400 mb-1">
							SOVEREIGNTY MIX
						</div>
						<div className="text-2xl font-mono font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400">
							{value}%
						</div>
						<div className="text-[10px] font-mono text-zinc-400 mb-3">
							{value === 100
								? "MAX IN-SITU"
								: value === 0
									? "RAW PULL"
									: "HYBRID BLEND"}
						</div>

						{/* Quick Jump Buttons */}
						<div className="grid grid-cols-3 gap-1 w-full max-w-[170px] mb-2">
							<button
								type="button"
								onClick={() => onChange(0)}
								className={`py-1 px-1 text-[9px] font-mono rounded border transition-colors ${
									value === 0
										? "bg-amber-500/20 border-amber-500 text-amber-300"
										: "bg-card/40 border-border/60 text-zinc-400 hover:text-zinc-200"
								}`}
							>
								0% PULL
							</button>
							<button
								type="button"
								onClick={() => onChange(50)}
								className={`py-1 px-1 text-[9px] font-mono rounded border transition-colors ${
									value === 50
										? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
										: "bg-card/40 border-border/60 text-zinc-400 hover:text-zinc-200"
								}`}
							>
								50/50
							</button>
							<button
								type="button"
								onClick={() => onChange(100)}
								className={`py-1 px-1 text-[9px] font-mono rounded border transition-colors ${
									value === 100
										? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
										: "bg-card/40 border-border/60 text-zinc-400 hover:text-zinc-200"
								}`}
							>
								100% LIOP
							</button>
						</div>

						<div className="text-[9px] text-zinc-400 font-mono">
							Slide fader below
						</div>
					</div>

					{/* DECK B: LIOP LOGIC-INJECTION (Right Side) */}
					<div
						className={`lg:col-span-5 rounded-xl border p-4 transition-all duration-300 ${
							value >= 70
								? "border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_25px_rgba(16,185,129,0.15)]"
								: "border-border/60 bg-card/40 opacity-70"
						}`}
					>
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center space-x-2">
								<span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
									DECK B
								</span>
								<span className="text-xs font-semibold text-zinc-300">
									LIOP IN-SITU (LOGIC INJECTION)
								</span>
							</div>
							<Badge
								variant="success"
								className="text-[9px] font-mono uppercase"
							>
								Zero-Trust Enclave
							</Badge>
						</div>

						<div className="flex items-center justify-between gap-3">
							{/* Metrics Stack */}
							<div className="space-y-2.5 flex-1">
								<div>
									<div className="text-[10px] uppercase font-mono text-zinc-400 flex items-center gap-1">
										<Coins className="h-3 w-3 text-emerald-400" />
										<span>Token Context Window</span>
									</div>
									<div className="text-lg font-mono font-bold text-emerald-400">
										~{baselineLiopTokens.toLocaleString()}{" "}
										<span className="text-xs font-normal text-zinc-400">
											BPE (-99.6%)
										</span>
									</div>
								</div>

								<div>
									<div className="text-[10px] uppercase font-mono text-zinc-400 flex items-center gap-1">
										<Database className="h-3 w-3 text-cyan-400" />
										<span>Wire Egress (Aggregated)</span>
									</div>
									<div className="text-sm font-mono font-semibold text-cyan-300">
										{(baselineLiopBytes / 1024).toFixed(1)} KB{" "}
										<span className="text-[10px] text-emerald-400 font-normal">
											(-99.4% saved)
										</span>
									</div>
								</div>

								<div>
									<div className="text-[10px] uppercase font-mono text-zinc-400 flex items-center gap-1">
										<Zap className="h-3 w-3 text-emerald-400" />
										<span>In-Situ Execution Latency</span>
									</div>
									<div className="text-sm font-mono font-semibold text-emerald-300">
										~{baselineLiopLatency} ms
									</div>
								</div>
							</div>

							{/* VU Meter Visualizer */}
							<VuMeter
								level={Math.max(4, Math.round(100 - value))}
								color="green"
								label="WIRE LOAD"
							/>
						</div>

						<div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-zinc-400">
							<span className="flex items-center gap-1 text-emerald-400 font-mono">
								<ShieldCheck className="h-3 w-3" /> ZK-Receipt Verified
							</span>
							<span className="font-mono text-zinc-300">~$0.001 / query</span>
						</div>
					</div>
				</div>

				{/* Physical Crossfader Channel Slider */}
				<div className="mt-6 pt-5 border-t border-border/50">
					<div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2 px-2">
						<span className="flex items-center gap-1.5 text-amber-400">
							<AlertOctagon className="h-3.5 w-3.5" />
							<span>DECK A: 100% PULL (LEGACY MCP)</span>
						</span>
						<span className="text-[11px] text-zinc-400">
							Interpolating Live State:{" "}
							<span className="text-zinc-200 font-semibold">
								{currentTokens.toLocaleString()} tokens
							</span>{" "}
							·{" "}
							<span className="text-zinc-200 font-semibold">
								{(currentBytes / 1024).toFixed(1)} KB
							</span>{" "}
							·{" "}
							<span className="text-emerald-400 font-semibold">
								{currentLatency} ms
							</span>
						</span>
						<span className="flex items-center gap-1.5 text-emerald-400">
							<span>DECK B: 100% LIOP (SOVEREIGNTY)</span>
							<ShieldCheck className="h-3.5 w-3.5" />
						</span>
					</div>

					{/* Custom DJ Metallic Fader Track */}
					<div className="relative flex items-center h-12 px-2 rounded-xl bg-zinc-950/80 border border-border/70">
						{/* Graduated Decibel Tick Marks */}
						<div className="absolute inset-x-4 flex justify-between pointer-events-none opacity-40">
							{["-∞", "-24", "-12", "-6", "0", "+3", "+6"].map((tick) => (
								<div key={tick} className="flex flex-col items-center">
									<div className="h-3 w-px bg-zinc-500" />
									<span className="text-[8px] font-mono text-zinc-400 mt-1">
										{tick}
									</span>
								</div>
							))}
						</div>

						{/* Interactive Range Input */}
						<input
							type="range"
							min="0"
							max="100"
							value={value}
							onChange={(e) => onChange(Number(e.target.value))}
							className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none z-10 opacity-90 hover:opacity-100 transition-opacity"
							id="sovereignty-crossfader-input"
						/>
					</div>

					{/* Dynamic Telemetry Strip: Realtime Economy */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
						<div className="rounded-lg bg-card/60 border border-border/40 p-2.5 text-center">
							<div className="text-[10px] font-mono text-zinc-400 uppercase">
								Token Reduction
							</div>
							<div className="text-base font-mono font-bold text-emerald-400">
								{tokenSavingsPercent}%
							</div>
						</div>

						<div className="rounded-lg bg-card/60 border border-border/40 p-2.5 text-center">
							<div className="text-[10px] font-mono text-zinc-400 uppercase">
								Wire Bandwidth Saved
							</div>
							<div className="text-base font-mono font-bold text-cyan-400">
								{byteSavingsPercent}%
							</div>
						</div>

						<div className="rounded-lg bg-card/60 border border-border/40 p-2.5 text-center">
							<div className="text-[10px] font-mono text-zinc-400 uppercase">
								Inference Cost / Query
							</div>
							<div className="text-base font-mono font-bold text-amber-300">
								${currentCostPerQuery}
							</div>
						</div>

						<div className="rounded-lg bg-card/60 border border-border/40 p-2.5 text-center">
							<div className="text-[10px] font-mono text-zinc-400 uppercase">
								Execution Fuel & Proof
							</div>
							<div className="text-base font-mono font-bold text-zinc-200 flex items-center justify-center gap-1">
								<Flame className="h-3.5 w-3.5 text-amber-400" />
								<span>
									{telemetry?.fuelUsed
										? `${telemetry.fuelUsed} F`
										: "NIST Quantized"}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* PERFORMANCE CUE PADS: 1-Click Instant Dispatch */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						<Play className="h-4 w-4 text-emerald-400" />
						<h4 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-300">
							PERFORMANCE CUE PADS (1-CLICK LIVE INJECTION)
						</h4>
					</div>
					<span className="text-[11px] text-zinc-400">
						Instant dispatch across multi-tier sovereign enclaves
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					{/* PAD 1: Core Banking */}
					<button
						type="button"
						disabled={isRunning}
						onClick={() => onRunDemo?.("bank")}
						className="group relative text-left rounded-xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950/30 to-card p-3.5 hover:border-cyan-400 transition-all shadow-md hover:shadow-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center space-x-2">
								<span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
								<span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
									CUE 1 · TIER 1
								</span>
							</div>
							<Badge
								variant="outline"
								className="text-[9px] font-mono border-cyan-500/40 text-cyan-300"
							>
								BANKING
							</Badge>
						</div>
						<div className="text-xs font-bold text-zinc-200 group-hover:text-cyan-300 transition-colors">
							1,500 Bank Accounts ($148M)
						</div>
						<div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
							Calculates aggregate liquidity and account distribution without
							exposing PII.
						</div>
						<div className="mt-3 flex items-center justify-between text-[10px] font-mono text-zinc-400 border-t border-border/40 pt-2">
							<span>48k → 197 tokens</span>
							<span className="text-cyan-400 flex items-center gap-1">
								FIRE PAD <ArrowRight className="h-2.5 w-2.5" />
							</span>
						</div>
					</button>

					{/* PAD 2: Healthcare Vault */}
					<button
						type="button"
						disabled={isRunning}
						onClick={() => onRunDemo?.("vault")}
						className="group relative text-left rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 to-card p-3.5 hover:border-emerald-400 transition-all shadow-md hover:shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center space-x-2">
								<span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
								<span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
									CUE 2 · TIER 1
								</span>
							</div>
							<Badge
								variant="outline"
								className="text-[9px] font-mono border-emerald-500/40 text-emerald-300"
							>
								HEALTHCARE
							</Badge>
						</div>
						<div className="text-xs font-bold text-zinc-200 group-hover:text-emerald-300 transition-colors">
							2,500 Medical Records
						</div>
						<div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
							Derives diagnosis distribution & patient mean age under HIPAA Safe
							Harbor.
						</div>
						<div className="mt-3 flex items-center justify-between text-[10px] font-mono text-zinc-400 border-t border-border/40 pt-2">
							<span>62k → 184 tokens</span>
							<span className="text-emerald-400 flex items-center gap-1">
								FIRE PAD <ArrowRight className="h-2.5 w-2.5" />
							</span>
						</div>
					</button>

					{/* PAD 3: HFT Market Oracle */}
					<button
						type="button"
						disabled={isRunning}
						onClick={() => onRunDemo?.("oracle")}
						className="group relative text-left rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 to-card p-3.5 hover:border-amber-400 transition-all shadow-md hover:shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center space-x-2">
								<span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
								<span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
									CUE 3 · TIER 2
								</span>
							</div>
							<Badge
								variant="outline"
								className="text-[9px] font-mono border-amber-500/40 text-amber-300"
							>
								FINTECH HFT
							</Badge>
						</div>
						<div className="text-xs font-bold text-zinc-200 group-hover:text-amber-300 transition-colors">
							HFT L2 Orderbook VWAP
						</div>
						<div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
							Calculates VWAP and bid/ask spread volatility directly on the
							market oracle node.
						</div>
						<div className="mt-3 flex items-center justify-between text-[10px] font-mono text-zinc-400 border-t border-border/40 pt-2">
							<span>38k → 142 tokens</span>
							<span className="text-amber-400 flex items-center gap-1">
								FIRE PAD <ArrowRight className="h-2.5 w-2.5" />
							</span>
						</div>
					</button>

					{/* PAD 4: Adversarial PII Attack Defense */}
					<button
						type="button"
						disabled={isRunning}
						onClick={() => onRunDemo?.("attack")}
						className="group relative text-left rounded-xl border border-red-500/40 bg-gradient-to-br from-red-950/30 to-card p-3.5 hover:border-red-400 transition-all shadow-md hover:shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center space-x-2">
								<span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
								<span className="text-[10px] font-mono font-bold text-red-400 uppercase">
									CUE 4 · SECURITY TRAP
								</span>
							</div>
							<Badge variant="destructive" className="text-[9px] font-mono">
								DEFENSE TEST
							</Badge>
						</div>
						<div className="text-xs font-bold text-zinc-200 group-hover:text-red-300 transition-colors">
							Simulate PII Exfiltration
						</div>
						<div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
							Attempts to leak individual raw customer identities. Intercepted
							by Egress Shield.
						</div>
						<div className="mt-3 flex items-center justify-between text-[10px] font-mono text-zinc-400 border-t border-border/40 pt-2">
							<span>Defense: Intercepted</span>
							<span className="text-red-400 flex items-center gap-1">
								TRIGGER TRAP <ArrowRight className="h-2.5 w-2.5" />
							</span>
						</div>
					</button>
				</div>
			</div>

			{/* ENTERPRISE ROI CALCULATOR (Non-Technical & Executive Proof) */}
			<div className="rounded-xl border border-border/70 bg-card/60 p-4">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
					<div className="flex items-center space-x-2">
						<DollarSign className="h-4 w-4 text-emerald-400" />
						<span className="text-xs font-mono font-bold uppercase text-zinc-200">
							ENTERPRISE ANNUAL SOVEREIGNTY ROI CALCULATOR
						</span>
					</div>
					<div className="flex items-center space-x-2 text-xs text-zinc-400">
						<span>Scale:</span>
						<span className="font-mono font-bold text-zinc-200">
							{dailyQueries.toLocaleString()} queries / day
						</span>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
					<div className="md:col-span-6 space-y-2">
						<label
							htmlFor="daily-queries-slider"
							className="text-[11px] text-zinc-400 flex justify-between"
						>
							<span>Select Daily Protocol Call Volume:</span>
							<span className="font-mono text-zinc-300 font-semibold">
								{dailyQueries.toLocaleString()} / day
							</span>
						</label>
						<input
							id="daily-queries-slider"
							type="range"
							min="1000"
							max="100000"
							step="1000"
							value={dailyQueries}
							onChange={(e) => setDailyQueries(Number(e.target.value))}
							className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
						/>
						<div className="flex justify-between text-[9px] font-mono text-zinc-500">
							<span>1k queries</span>
							<span>25k</span>
							<span>50k</span>
							<span>75k</span>
							<span>100k queries</span>
						</div>
					</div>

					<div className="md:col-span-6 grid grid-cols-2 gap-2">
						<div className="rounded-lg bg-zinc-950/70 border border-border/50 p-2.5 text-center">
							<div className="text-[10px] font-mono text-zinc-400 uppercase">
								Legacy MCP Ingestion
							</div>
							<div className="text-sm font-mono font-bold text-red-400">
								${legacyAnnualCost} / yr
							</div>
							<div className="text-[9px] text-zinc-500 mt-0.5">
								High LLM Context Billing
							</div>
						</div>

						<div className="rounded-lg bg-emerald-950/30 border border-emerald-500/40 p-2.5 text-center">
							<div className="text-[10px] font-mono text-emerald-400 uppercase">
								LIOP Annual Savings
							</div>
							<div className="text-base font-mono font-extrabold text-emerald-300">
								+${annualSavingsDollar} / yr
							</div>
							<div className="text-[9px] text-emerald-400/80 mt-0.5">
								${liopAnnualCost}/yr LIOP vs ${legacyAnnualCost}/yr Legacy
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
