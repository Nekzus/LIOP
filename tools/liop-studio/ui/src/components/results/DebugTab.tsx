// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { Bug, ShieldCheck } from "lucide-react";
import type { ExecutionMeta, TimelineStep } from "../../types";
import { Badge } from "../ui/badge";
import { TabsContent } from "../ui/tabs";

interface DebugTabProps {
	timeline: TimelineStep[];
	targetType: string;
	meta: ExecutionMeta | null;
}

export function DebugTab({ timeline, targetType, meta }: DebugTabProps) {
	return (
		<TabsContent value="debug" className="m-0 space-y-3 pb-5">
			<div className="space-y-3 pt-1 text-xs">
				{/* Execution Phase Trace */}
				<div className="p-3 rounded-lg bg-surface1 border border-border space-y-2">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-white text-[11px] flex items-center gap-1.5">
							<Bug className="h-3.5 w-3.5 text-amber-400" />
							Pipeline Execution Phase Trace
						</span>
						<span className="font-mono text-[10px] text-zinc-400">
							Target: {targetType.toUpperCase()}
						</span>
					</div>
					<div className="border border-border/80 rounded-md overflow-hidden">
						<table className="w-full text-left font-mono text-[11px]">
							<thead className="bg-secondary/40 text-zinc-400 border-b border-border/80 text-[10px] uppercase">
								<tr>
									<th className="px-2.5 py-1.5">Phase</th>
									<th className="px-2.5 py-1.5">Status</th>
									<th className="px-2.5 py-1.5">Latency</th>
									<th className="px-2.5 py-1.5">Detail</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/50 bg-background/40">
								{timeline.map((step) => (
									<tr key={step.phase} className="hover:bg-white/5">
										<td className="px-2.5 py-1.5 font-semibold text-white">
											{step.label}
										</td>
										<td className="px-2.5 py-1.5">
											<span
												className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${
													step.status === "success"
														? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
														: step.status === "running"
															? "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
															: step.status === "failed"
																? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
																: "bg-zinc-800 text-zinc-500"
												}`}
											>
												{step.status.toUpperCase()}
											</span>
										</td>
										<td className="px-2.5 py-1.5 text-zinc-300">
											{step.durationMs !== undefined
												? `${step.durationMs}ms`
												: "—"}
										</td>
										<td className="px-2.5 py-1.5 text-zinc-400 truncate max-w-[200px]">
											{step.detail}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* Egress Shield Verification Status */}
				<div className="p-3 rounded-lg bg-surface1 border border-border space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-white text-[11px] flex items-center gap-1.5">
							<ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
							Layer 4 Egress PII Shield Audit
						</span>
						<Badge
							variant={meta?.shieldBlocked ? "destructive" : "success"}
							className="font-mono text-[10px]"
						>
							{meta?.shieldBlocked ? "INTERCEPTED" : "PASSED"}
						</Badge>
					</div>
					<p className="text-[11px] text-zinc-400 leading-relaxed">
						{meta?.shieldBlocked
							? "Active defense triggered: Attempt to exfiltrate raw unaggregated rows intercepted by Zero-Trust Egress Shield. Data transfer was truncated before exiting origin host."
							: "Zero-Trust egress verification confirmed. Logic module produced only compliant aggregates with zero PII side-channel exposure."}
					</p>
				</div>

				{/* AST & Isolation Parameters */}
				<div className="p-3 rounded-lg bg-surface1 border border-border flex items-center justify-between text-[11px] font-mono">
					<span className="text-zinc-400">
						Sandbox:{" "}
						<strong className="text-primary">V8 Isolate / wasi_v1</strong>
					</span>
					<span className="text-zinc-400">
						PQC Session:{" "}
						<strong className="text-emerald-400">ML-KEM-768</strong>
					</span>
					<span className="text-zinc-400">
						Protocol: <strong className="text-cyan-300">LIOP v1.0</strong>
					</span>
				</div>
			</div>
		</TabsContent>
	);
}
