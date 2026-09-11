// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { motion } from "framer-motion";
import {
	Activity,
	Bug,
	CheckCircle2,
	FileCode,
	Loader2,
	Terminal,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import type { ExecutionMeta, TimelineStep } from "../types";
import { DebugTab } from "./results/DebugTab";
import { ExportTab } from "./results/ExportTab";
import { OutputTab } from "./results/OutputTab";
import { TelemetryTab } from "./results/TelemetryTab";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs } from "./ui/tabs";

export type ResultsTab = "output" | "debug" | "export" | "telemetry";

interface ResultsConsoleProps {
	timeline: TimelineStep[];
	result: Record<string, unknown> | null;
	meta: ExecutionMeta | null;
	errorAlert: { title: string; desc: string } | null;
	isRunning: boolean;
	code: string;
	selectedToolName: string;
	targetType: string;
	grpcTarget: string;
	httpUrl: string;
	stdioCmd: string;
	activeTab?: ResultsTab;
	onTabChange?: (tab: ResultsTab) => void;
}

export function ResultsConsole({
	timeline,
	result,
	meta,
	errorAlert,
	isRunning,
	code,
	selectedToolName,
	targetType,
	grpcTarget,
	httpUrl,
	stdioCmd,
	activeTab: controlledTab,
	onTabChange,
}: ResultsConsoleProps) {
	const [internalTab, setInternalTab] = useState<ResultsTab>("output");
	const activeResultsTab = controlledTab ?? internalTab;

	const handleTabClick = (tab: ResultsTab) => {
		if (onTabChange) {
			onTabChange(tab);
		} else {
			setInternalTab(tab);
		}
	};

	return (
		<div className="flex flex-col gap-3 min-h-0 flex-1">
			{/* Timeline Visualizer */}
			<Card className="p-3 bg-card border-border shadow-card shrink-0">
				<div className="flex items-center justify-between mb-2">
					<span className="text-xs font-semibold text-white flex items-center gap-1.5">
						<Activity className="h-3.5 w-3.5 text-primary" />
						Execution Timeline & Cryptographic Pipeline
					</span>
					{isRunning ? (
						<Badge
							variant="warning"
							className="text-[10px] font-mono flex items-center gap-1"
						>
							<Loader2 className="h-2.5 w-2.5 animate-spin" /> In-Situ
							Processing
						</Badge>
					) : (
						<span className="text-[10px] text-zinc-400 font-mono">
							{timeline.filter((s) => s.status === "success").length} /{" "}
							{timeline.length} Steps
						</span>
					)}
				</div>

				<div className="grid grid-cols-5 gap-2">
					{timeline.map((step) => {
						const isSuccess = step.status === "success";
						const isRunningStep = step.status === "running";
						const isFailed = step.status === "failed";

						return (
							<div
								key={step.phase}
								className={`p-2 rounded-lg border transition-all text-xs ${
									isSuccess
										? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
										: isRunningStep
											? "bg-amber-950/20 border-amber-500/40 text-amber-400 animate-pulse"
											: isFailed
												? "bg-rose-950/20 border-rose-500/40 text-rose-400"
												: "bg-surface1/40 border-border/50 text-zinc-500"
								}`}
							>
								<div className="flex items-center justify-between mb-1">
									<span className="font-semibold text-[11px] truncate">
										{step.label}
									</span>
									{isSuccess && (
										<CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
									)}
									{isRunningStep && (
										<Loader2 className="h-3 w-3 text-amber-400 animate-spin shrink-0" />
									)}
									{isFailed && (
										<XCircle className="h-3 w-3 text-rose-400 shrink-0" />
									)}
								</div>
								<div className="flex items-center justify-between text-[10px] font-mono">
									<span className="truncate text-zinc-400" title={step.detail}>
										{step.detail}
									</span>
									{step.durationMs !== undefined && (
										<span className="shrink-0 ml-1 text-zinc-300">
											{step.durationMs}ms
										</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</Card>

			{/* Unified 4-Tab Results Console */}
			<Card className="flex-1 min-h-0 bg-card border-border shadow-card flex flex-col overflow-hidden">
				<Tabs
					value={activeResultsTab}
					onValueChange={(val) => handleTabClick(val as ResultsTab)}
					className="flex-1 flex flex-col min-h-0"
				>
					<CardHeader className="py-2.5 px-5 border-b border-border bg-surface1/60 shrink-0 flex flex-row items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-1 p-0.5 bg-surface1 border border-border rounded-lg relative">
								{/* Tab 1: Output */}
								<button
									type="button"
									onClick={() => handleTabClick("output")}
									className="relative z-10 text-xs px-2.5 py-1 font-medium transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
								>
									{activeResultsTab === "output" && (
										<motion.div
											layoutId="resultsTabPill"
											className="absolute inset-0 bg-primary rounded shadow-sm"
											transition={{
												type: "spring",
												stiffness: 450,
												damping: 35,
											}}
										/>
									)}
									<Terminal
										className={`h-3.5 w-3.5 relative z-20 ${
											activeResultsTab === "output"
												? "text-black"
												: "text-zinc-400"
										}`}
									/>
									<span
										className={`relative z-20 font-medium transition-colors duration-200 ${
											activeResultsTab === "output"
												? "text-black font-semibold"
												: "text-zinc-300 hover:text-white"
										}`}
									>
										Output
									</span>
								</button>

								{/* Tab 2: Debug */}
								<button
									type="button"
									onClick={() => handleTabClick("debug")}
									className="relative z-10 text-xs px-2.5 py-1 font-medium transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
								>
									{activeResultsTab === "debug" && (
										<motion.div
											layoutId="resultsTabPill"
											className="absolute inset-0 bg-primary rounded shadow-sm"
											transition={{
												type: "spring",
												stiffness: 450,
												damping: 35,
											}}
										/>
									)}
									<Bug
										className={`h-3.5 w-3.5 relative z-20 ${
											activeResultsTab === "debug"
												? "text-black"
												: "text-amber-400"
										}`}
									/>
									<span
										className={`relative z-20 font-medium transition-colors duration-200 ${
											activeResultsTab === "debug"
												? "text-black font-semibold"
												: "text-zinc-300 hover:text-white"
										}`}
									>
										Debug
									</span>
								</button>

								{/* Tab 3: Export Code */}
								<button
									type="button"
									onClick={() => handleTabClick("export")}
									className="relative z-10 text-xs px-2.5 py-1 font-medium transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
								>
									{activeResultsTab === "export" && (
										<motion.div
											layoutId="resultsTabPill"
											className="absolute inset-0 bg-primary rounded shadow-sm"
											transition={{
												type: "spring",
												stiffness: 450,
												damping: 35,
											}}
										/>
									)}
									<FileCode
										className={`h-3.5 w-3.5 relative z-20 ${
											activeResultsTab === "export"
												? "text-black"
												: "text-cyan-400"
										}`}
									/>
									<span
										className={`relative z-20 font-medium transition-colors duration-200 ${
											activeResultsTab === "export"
												? "text-black font-semibold"
												: "text-zinc-300 hover:text-white"
										}`}
									>
										Export Code
									</span>
								</button>

								{/* Tab 4: Live Telemetry */}
								<button
									type="button"
									onClick={() => handleTabClick("telemetry")}
									className="relative z-10 text-xs px-2.5 py-1 font-medium transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
								>
									{activeResultsTab === "telemetry" && (
										<motion.div
											layoutId="resultsTabPill"
											className="absolute inset-0 bg-primary rounded shadow-sm"
											transition={{
												type: "spring",
												stiffness: 450,
												damping: 35,
											}}
										/>
									)}
									<Activity
										className={`h-3.5 w-3.5 relative z-20 ${
											activeResultsTab === "telemetry"
												? "text-black"
												: "text-emerald-400"
										}`}
									/>
									<span
										className={`relative z-20 font-medium transition-colors duration-200 ${
											activeResultsTab === "telemetry"
												? "text-black font-semibold"
												: "text-zinc-300 hover:text-white"
										}`}
									>
										Live Telemetry
									</span>
								</button>
							</div>
						</div>

						{meta?.latencyMs !== undefined && (
							<Badge
								variant="outline"
								className="text-[10px] font-mono flex items-center gap-1 border-white/15 bg-secondary/60 text-zinc-300"
							>
								<Activity className="h-3 w-3 text-primary" />
								{meta.latencyMs}ms total
							</Badge>
						)}
					</CardHeader>

					<CardContent className="flex-1 min-h-0 overflow-hidden p-0">
						<ScrollArea className="h-full px-5">
							<OutputTab
								result={result}
								errorAlert={errorAlert}
								isRunning={isRunning}
								meta={meta}
							/>

							<DebugTab
								timeline={timeline}
								targetType={targetType}
								meta={meta}
							/>

							<ExportTab
								toolName={selectedToolName}
								code={code}
								targetType={targetType}
								grpcTarget={grpcTarget}
								httpUrl={httpUrl}
								stdioCmd={stdioCmd}
							/>

							<TelemetryTab meta={meta} />
						</ScrollArea>
					</CardContent>
				</Tabs>
			</Card>
		</div>
	);
}
