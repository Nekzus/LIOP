// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { motion } from "framer-motion";
import {
	AlertTriangle,
	Check,
	Code,
	Copy,
	FileCode,
	Fuel,
	Layers,
	Loader2,
	Play,
	RotateCcw,
	ShieldBan,
	Terminal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { copyToClipboard } from "../lib/clipboard";
import type { CanonicalTemplate, Tool } from "../types";
import { DynamicToolForm } from "./DynamicToolForm";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";

interface LogicEditorProps {
	executionMode: "logic" | "form";
	onExecutionModeChange: (mode: "logic" | "form") => void;
	availableTemplates: CanonicalTemplate[];
	selectedTemplateId: string;
	onSelectTemplate: (templateId: string) => void;
	selectedToolName: string;
	onSelectTool: (toolName: string) => void;
	code: string;
	onCodeChange: (code: string) => void;
	isRunning: boolean;
	tools: Tool[];
	isCurrentToolSupported: boolean;
	currentTemplate?: CanonicalTemplate;
	currentToolObj?: Tool;
	activeConnectedTarget: string;
	isNetworkHealthy: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: Form args
	formArgs: Record<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: Form args setter
	onFormArgChange: (field: string, val: any) => void;
	onResetTemplate: () => void;
	onExecute: () => void;
	onOpenExportTab: () => void;
	onOpenEnvModal: () => void;
}

export function LogicEditor({
	executionMode,
	onExecutionModeChange,
	availableTemplates,
	selectedTemplateId,
	onSelectTemplate,
	selectedToolName,
	onSelectTool,
	code,
	onCodeChange,
	isRunning,
	tools,
	isCurrentToolSupported,
	currentTemplate,
	currentToolObj,
	activeConnectedTarget,
	isNetworkHealthy,
	formArgs,
	onFormArgChange,
	onResetTemplate,
	onExecute,
	onOpenExportTab,
	onOpenEnvModal,
}: LogicEditorProps) {
	const [copiedKey, setCopiedKey] = useState<string | null>(null);
	const [isReset, setIsReset] = useState(false);

	const handleCopy = async (text: string, key: string) => {
		const ok = await copyToClipboard(text);
		if (ok) {
			setCopiedKey(key);
			setTimeout(() => setCopiedKey(null), 1500);
		}
	};

	const handleResetClick = () => {
		onResetTemplate();
		setIsReset(true);
		setTimeout(() => setIsReset(false), 1500);
	};

	// Code editor metadata
	const editorStats = useMemo(() => {
		const lines = code.split("\n").length;
		const bytes = new TextEncoder().encode(code).length;
		const estTokens = Math.max(1, Math.ceil(code.trim().length / 3.8));
		return { lines, bytes, estTokens };
	}, [code]);

	// Real-time AST syntax validator for @LIOP envelopes and pure JavaScript
	const astValidation = useMemo(() => {
		const trimmed = code.trim();
		const envelopeMatch = trimmed.match(
			/^@LIOP\{([^}]+)\}\s*([\s\S]*?)\s*(?:@END)?$/,
		);

		let rawJs = trimmed;
		let runtime = "wasi_v1";
		let hasEnvelope = false;

		if (envelopeMatch) {
			hasEnvelope = true;
			runtime = envelopeMatch[1].split(",")[0]?.trim() || "wasi_v1";
			rawJs = envelopeMatch[2];
		}

		try {
			// Validate JavaScript syntax safely in isolated function constructor without executing
			new Function("env", rawJs);
			return {
				valid: true,
				error: null as string | null,
				runtime,
				hasEnvelope,
			};
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return {
				valid: false,
				error: message,
				runtime,
				hasEnvelope,
			};
		}
	}, [code]);

	return (
		<Card className="flex flex-col bg-card border-border shadow-card shrink-0">
			<CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1 p-0.5 bg-surface1 border border-white/10 rounded-lg">
						<button
							type="button"
							onClick={() => onExecutionModeChange("logic")}
							className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
								executionMode === "logic"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							<Code className="h-3.5 w-3.5" />
							<span>Logic Studio (@LIOP)</span>
						</button>

						<button
							type="button"
							onClick={() => onExecutionModeChange("form")}
							className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
								executionMode === "form"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							<Terminal className="h-3.5 w-3.5" />
							<span>MCP Tool Form</span>
						</button>
					</div>
				</div>

				{/* Dynamic Template Switcher */}
				{executionMode === "logic" && availableTemplates.length > 0 && (
					<div className="relative flex items-center bg-surface1 border border-white/15 p-0.5 rounded-lg flex-wrap gap-0.5">
						{availableTemplates.map((t) => {
							const isSelected = selectedTemplateId === t.id;
							return (
								<button
									key={t.id}
									type="button"
									onClick={() => onSelectTemplate(t.id)}
									className="relative z-10 text-[11px] px-2.5 py-1 font-medium transition-colors duration-200 flex items-center gap-1.5"
									title={t.description}
								>
									{isSelected && (
										<motion.div
											layoutId="templateActivePill"
											className="absolute inset-0 rounded-md shadow-sm bg-primary"
											transition={{
												type: "spring",
												stiffness: 450,
												damping: 35,
											}}
										/>
									)}
									<span
										className={`relative z-20 font-medium transition-colors duration-200 flex items-center gap-1 ${
											isSelected
												? "text-black font-semibold"
												: "text-zinc-300 hover:text-white"
										}`}
									>
										<span>{t.name}</span>
									</span>
								</button>
							);
						})}
					</div>
				)}
				{executionMode === "logic" && availableTemplates.length === 0 && (
					<div className="text-[11px] text-zinc-400 font-mono px-2 py-1 bg-surface1/60 rounded border border-white/10">
						{isNetworkHealthy
							? "Scanning target capabilities..."
							: "Target Offline (0 Capabilities)"}
					</div>
				)}
			</CardHeader>

			<CardContent className="space-y-3">
				{/* Target Offline Notice */}
				{executionMode === "logic" && tools.length === 0 && (
					<div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-200 flex items-start gap-3 animate-in fade-in duration-200">
						<ShieldBan className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<h4 className="text-xs font-semibold text-rose-300">
									Target Offline
								</h4>
								<span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 font-mono text-rose-200 border border-rose-500/30">
									ZERO-TRUST
								</span>
							</div>
							<p className="text-[11px] text-zinc-300 leading-relaxed">
								Target endpoint{" "}
								<span className="font-mono text-white font-medium">
									{activeConnectedTarget}
								</span>{" "}
								is unreachable. Zero computational enclaves detected. Connect to
								an active node or start your local mesh to dispatch logic.
							</p>
						</div>
					</div>
				)}

				{/* Capability Mismatch Notice */}
				{executionMode === "logic" &&
					tools.length > 0 &&
					!isCurrentToolSupported && (
						<div className="p-3 rounded-lg bg-red-950/30 border border-red-500/40 text-red-200 flex items-start gap-3 animate-in fade-in duration-200">
							<ShieldBan className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<h4 className="text-xs font-semibold text-red-300">
										Target Mismatch
									</h4>
									<span className="text-[9px] px-1 py-0.2 rounded bg-red-500/20 font-mono text-red-200 border border-red-500/30">
										ZERO-TRUST
									</span>
								</div>
								<p className="text-[11px] text-zinc-300 leading-relaxed">
									Active logic targets capability{" "}
									<span className="font-mono text-cyan-300 font-semibold">
										{currentTemplate?.tool || selectedToolName}
									</span>
									, not exposed by target{" "}
									<span className="font-mono text-white">
										{activeConnectedTarget}
									</span>
									. Execution paused to protect origin runtime.
								</p>
								<div className="text-[10px] text-zinc-400 font-mono pt-0.5 flex items-center gap-1.5 flex-wrap">
									<span>Available on target:</span>
									{tools.map((avail) => (
										<button
											key={avail.name}
											type="button"
											onClick={() => onSelectTool(avail.name)}
											className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
										>
											+ Switch to {avail.name}
										</button>
									))}
								</div>
							</div>
						</div>
					)}

				{executionMode === "form" ? (
					<DynamicToolForm
						toolName={selectedToolName}
						schema={currentToolObj?.inputSchema}
						values={formArgs}
						onChange={onFormArgChange}
						disabled={isRunning}
					/>
				) : (
					/* Code Editor Frame with Action Bar */
					<div className="relative border border-border rounded-lg bg-editor overflow-hidden">
						{/* Editor Header Bar */}
						<div className="flex items-center justify-between px-3 py-1.5 bg-secondary/40 border-b border-border/60 text-xs">
							<div className="flex items-center gap-2">
								<span className="text-[10px] font-mono text-primary font-semibold">
									@LIOP
								</span>
								<span className="text-border-muted">•</span>
								<span className="text-[11px] text-zinc-400 font-mono">
									wasi_v1 sandbox
								</span>
							</div>

							<div className="flex items-center space-x-1.5">
								<button
									type="button"
									onClick={onOpenEnvModal}
									className="text-[11px] flex items-center gap-1.5 transition-colors px-2.5 py-0.5 rounded shrink-0 font-medium border text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 cursor-pointer"
									title="Inspect confidential dataset schema and sandbox constraints"
								>
									<Layers className="h-3 w-3" />
									<span>Env Schema</span>
								</button>

								<button
									type="button"
									onClick={onOpenExportTab}
									className="text-[11px] flex items-center gap-1.5 transition-colors px-2.5 py-0.5 rounded shrink-0 font-medium border text-primary hover:text-white bg-secondary/80 hover:bg-white/10 border-border cursor-pointer"
									title="Export execution snippet to TypeScript, Python, or cURL"
								>
									<FileCode className="h-3 w-3" />
									<span>Export Code</span>
								</button>

								<button
									type="button"
									onClick={handleResetClick}
									className={`text-[11px] flex items-center gap-1.5 transition-colors px-2.5 py-0.5 rounded shrink-0 font-medium border cursor-pointer ${
										isReset
											? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
											: "text-zinc-300 hover:text-white bg-surface1/60 hover:bg-white/5 border-white/10"
									}`}
									title="Reset to template original code"
								>
									{isReset ? (
										<Check className="h-3 w-3 text-emerald-400" />
									) : (
										<RotateCcw className="h-3 w-3" />
									)}
									<span>{isReset ? "Reset Done" : "Reset"}</span>
								</button>

								<button
									type="button"
									onClick={() => handleCopy(code, "code")}
									className={`text-[11px] flex items-center gap-1.5 transition-colors px-2.5 py-0.5 rounded shrink-0 font-medium border cursor-pointer ${
										copiedKey === "code"
											? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
											: "text-zinc-300 hover:text-white bg-surface1/60 hover:bg-white/5 border-white/10"
									}`}
									title="Copy code payload"
								>
									{copiedKey === "code" ? (
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

						<textarea
							value={code}
							onChange={(e) => onCodeChange(e.target.value)}
							className="w-full h-[220px] p-3.5 bg-transparent font-mono text-xs md:text-sm text-[#7dd3fc] focus:outline-none resize-none leading-relaxed"
							style={{ fontFamily: "'JetBrains Mono', monospace" }}
							placeholder="// Write logic to inject on origin node..."
							disabled={isRunning}
							spellCheck={false}
						/>

						{/* Editor Status Footer with Real-time AST Validator */}
						<div className="flex items-center justify-between px-3 py-1 bg-secondary/30 border-t border-border/50 text-[10px] font-mono text-zinc-400">
							<div className="flex items-center gap-3">
								<span>{editorStats.lines} lines</span>
								<span>{editorStats.bytes} bytes</span>
								<span className="text-cyan-400 flex items-center gap-1">
									<Code className="h-3 w-3" />~{editorStats.estTokens} tok
									(input)
								</span>
							</div>
							<div className="flex items-center gap-3">
								{astValidation.valid ? (
									<span className="text-emerald-400 flex items-center gap-1 font-semibold">
										<Check className="h-3 w-3 text-emerald-400" />
										AST: Valid ({astValidation.runtime})
									</span>
								) : (
									<span
										className="text-rose-400 flex items-center gap-1 truncate max-w-[240px] font-semibold"
										title={astValidation.error || "Syntax Error"}
									>
										<AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />
										AST Error: {astValidation.error}
									</span>
								)}
								<span>•</span>
								<span className="text-zinc-300 flex items-center gap-1 font-mono">
									<Fuel className="h-3 w-3 text-amber-400" />
									Quota: 1M Fuel
								</span>
								<span>•</span>
								<span className="text-zinc-400">WASI Sandbox</span>
							</div>
						</div>
					</div>
				)}

				{/* Execute Action Bar */}
				<div className="flex items-center justify-between pt-1">
					<div className="text-xs text-zinc-400 flex items-center gap-1.5 flex-wrap">
						<span>Target:</span>
						<span
							className={`font-semibold font-mono text-[11px] ${
								isCurrentToolSupported
									? "text-white"
									: "text-red-400 line-through"
							}`}
						>
							{selectedToolName || "none"}
						</span>
						{!isCurrentToolSupported && (
							<Badge
								variant="outline"
								className="text-[9px] py-0 px-1 font-mono border-red-500/40 text-red-400 bg-red-500/10"
							>
								Unavailable on Target
							</Badge>
						)}
						{currentToolObj?.providerNode && (
							<Badge
								variant="outline"
								className="text-[9px] py-0 px-1 font-mono border-cyan-500/40 text-cyan-300"
							>
								{currentToolObj.providerNode}
							</Badge>
						)}
						{currentToolObj?.tier && (
							<Badge
								variant="outline"
								className="text-[9px] py-0 px-1 font-mono border-white/15 text-zinc-300"
							>
								Tier {currentToolObj.tier}
							</Badge>
						)}
					</div>
					<Button
						onClick={onExecute}
						disabled={
							isRunning ||
							!selectedToolName ||
							tools.length === 0 ||
							!isCurrentToolSupported ||
							(executionMode === "logic" && !astValidation.valid)
						}
						className={`h-9 px-6 font-bold tracking-wide shadow-md transition-all active:scale-[0.98] ${
							tools.length === 0 ||
							!isCurrentToolSupported ||
							(executionMode === "logic" && !astValidation.valid)
								? "opacity-60 cursor-not-allowed bg-zinc-800 hover:bg-zinc-800 text-zinc-400 border border-zinc-700"
								: ""
						}`}
					>
						{isRunning ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{executionMode === "logic" ? "Injecting..." : "Calling..."}
							</>
						) : tools.length === 0 ? (
							<>
								<ShieldBan className="mr-2 h-4 w-4 text-rose-400" />
								Target Offline
							</>
						) : !isCurrentToolSupported ? (
							<>
								<ShieldBan className="mr-2 h-4 w-4 text-red-400" />
								Blocked on Target
							</>
						) : executionMode === "logic" && !astValidation.valid ? (
							<>
								<AlertTriangle className="mr-2 h-4 w-4 text-rose-400" />
								Syntax Error
							</>
						) : (
							<>
								<Play className="mr-2 h-4 w-4 fill-current" />
								{executionMode === "logic" ? "Execute Logic" : "Execute Tool"}
							</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
