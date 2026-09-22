// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { CheckCircle2, Clock, RotateCcw, Trash2, XCircle } from "lucide-react";
import type { ExecutionHistoryEntry } from "../../hooks/useStudioExecution";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface HistoryTabProps {
	history: ExecutionHistoryEntry[];
	onSelectEntry: (entry: ExecutionHistoryEntry) => void;
	onClearHistory: () => void;
}

export function HistoryTab({
	history,
	onSelectEntry,
	onClearHistory,
}: HistoryTabProps) {
	if (history.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
				<Clock className="h-8 w-8 mb-2 stroke-1 opacity-50" />
				<p className="text-xs font-mono">
					No execution history recorded in this session.
				</p>
				<p className="text-[11px] text-zinc-600 mt-1">
					Executed operations and their cryptographic receipts will be preserved
					here.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between border-b border-border pb-2">
				<div className="flex items-center gap-2">
					<span className="text-xs font-mono text-zinc-300">
						{history.length} Execution{history.length > 1 ? "s" : ""} Recorded
					</span>
					<span className="text-[10px] text-zinc-500 font-mono">
						(Max 20 preserved in memory)
					</span>
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={onClearHistory}
					className="h-6 px-2 text-[10px] font-mono border-white/10 text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10"
				>
					<Trash2 className="h-3 w-3 mr-1" />
					Clear
				</Button>
			</div>

			<div className="divide-y divide-border/60">
				{history.map((entry) => {
					const dateStr = new Date(entry.timestamp).toLocaleTimeString();
					const isSuccess = entry.status === "success";
					const isCancelled = entry.status === "cancelled";

					return (
						<div
							key={entry.id}
							className="py-2.5 flex items-center justify-between gap-4 hover:bg-surface1/30 px-2 rounded-md transition-colors"
						>
							<div className="flex items-center gap-3 min-w-0">
								{isSuccess ? (
									<CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
								) : isCancelled ? (
									<Clock className="h-4 w-4 text-amber-400 shrink-0" />
								) : (
									<XCircle className="h-4 w-4 text-rose-400 shrink-0" />
								)}

								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<span className="text-xs font-mono text-white truncate font-medium">
											{entry.tool}
										</span>
										<Badge
											variant="outline"
											className="text-[9px] py-0 px-1 font-mono border-white/10 text-zinc-400 uppercase"
										>
											{entry.mode}
										</Badge>
									</div>
									<div className="text-[10px] font-mono text-zinc-500 flex items-center gap-2 mt-0.5">
										<span>{dateStr}</span>
										{entry.durationMs !== undefined && (
											<>
												<span>•</span>
												<span>{entry.durationMs}ms</span>
											</>
										)}
										{entry.meta?.telemetry?.fuel && (
											<>
												<span>•</span>
												<span>{entry.meta.telemetry.fuel.consumed} Fuel</span>
											</>
										)}
									</div>
								</div>
							</div>

							<Button
								size="sm"
								variant="ghost"
								onClick={() => onSelectEntry(entry)}
								className="h-7 px-2.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 shrink-0"
								title="Inspect this execution result"
							>
								<RotateCcw className="h-3 w-3 mr-1" />
								Inspect
							</Button>
						</div>
					);
				})}
			</div>
		</div>
	);
}
