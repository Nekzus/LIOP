// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useMemo, useState } from "react";
import { EnvironmentExplorer } from "./components/EnvironmentExplorer";
import { LogicEditor } from "./components/LogicEditor";
import { ResultsConsole, type ResultsTab } from "./components/ResultsConsole";
import { ServerScanPanel } from "./components/ServerScanPanel";
import { StudioHeader } from "./components/StudioHeader";
import { TargetConnectionBar } from "./components/TargetConnectionBar";
import { useStudioExecution } from "./hooks/useStudioExecution";
import { useStudioNetwork } from "./hooks/useStudioNetwork";
import { CANONICAL_TEMPLATES } from "./templates";
import type { CanonicalTemplate } from "./types";

export default function App() {
	// Theme state
	const [theme, setTheme] = useState<"obsidian" | "slate">(() => {
		return (
			(localStorage.getItem("liop_playground_theme") as "obsidian" | "slate") ||
			"obsidian"
		);
	});

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.remove("theme-obsidian", "theme-slate");
		document.documentElement.classList.add(`theme-${theme}`);
		localStorage.setItem("liop_playground_theme", theme);
	}, [theme]);

	// Modals and tabs state
	const [activeConsoleTab, setActiveConsoleTab] =
		useState<ResultsTab>("output");
	const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);

	// Execution Mode State: "logic" (LIOP WASI code) vs "form" (MCP Inspector Form)
	const [executionMode, setExecutionMode] = useState<"logic" | "form">("logic");
	// biome-ignore lint/suspicious/noExplicitAny: Form arguments map
	const [formArgs, setFormArgs] = useState<Record<string, any>>({});

	// Execution state hook
	const {
		isRunning,
		result,
		meta,
		errorAlert,
		setErrorAlert,
		timeline,
		handleExecute: executeCore,
	} = useStudioExecution();

	// Network state hook
	const {
		network,
		tools,
		nodes,
		scanSummary,
		targetType,
		setTargetType,
		stdioCmd,
		setStdioCmd,
		httpUrl,
		setHttpUrl,
		grpcTarget,
		setGrpcTarget,
		isConnecting,
		isScanning,
		loadingTools,
		activeConnectedTarget,
		secondsAgo,
		totalNodes,
		onlineNodes,
		hasNodeStats,
		fetchHealth,
		fetchTools,
		fetchNodes,
		handleSwitchTarget,
		handleConnectTarget,
	} = useStudioNetwork({
		onError: (err) => setErrorAlert(err),
		onTargetSwitched: (toolToSelect) => {
			if (toolToSelect) {
				setPendingToolName(toolToSelect);
			}
		},
	});

	// Pending template and tool selection queue to guarantee deterministic sync across async loads
	const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(
		null,
	);
	const [pendingToolName, setPendingToolName] = useState<string | null>(null);

	// Templates & Code State
	const [selectedTemplateId, setSelectedTemplateId] = useState(
		CANONICAL_TEMPLATES[0].id,
	);
	const [selectedToolName, setSelectedToolName] = useState(
		CANONICAL_TEMPLATES[0].tool,
	);
	const [code, setCode] = useState(CANONICAL_TEMPLATES[0].code);

	// Dynamic available templates: strictly matching tools exposed on the active target or mesh nodes
	const availableTemplates = useMemo(() => {
		const matched: CanonicalTemplate[] = [];

		// 1. Check canonical templates matching exposed tools on the target or any online node in the mesh
		for (const t of CANONICAL_TEMPLATES) {
			const cleanTTool = t.tool.toLowerCase().replace(/_/g, "");
			const toolExistsOnTarget = tools.some(
				(avail) =>
					avail.name.toLowerCase() === t.tool.toLowerCase() ||
					avail.name.toLowerCase().replace(/_/g, "") === cleanTTool,
			);
			const toolExistsInMesh = nodes.some(
				(n) =>
					n.status === "online" &&
					n.tools &&
					n.tools.some(
						(tn) =>
							tn.toLowerCase() === t.tool.toLowerCase() ||
							tn.toLowerCase().replace(/_/g, "") === cleanTTool,
					),
			);

			if (toolExistsOnTarget || toolExistsInMesh) {
				matched.push(t);
			}
		}

		// 2. For exposed tools on active target without a canonical template, create an in-situ dynamic template
		for (const avail of tools) {
			const alreadyHasTemplate = matched.some(
				(m) => m.tool.toLowerCase() === avail.name.toLowerCase(),
			);
			if (!alreadyHasTemplate) {
				const safeIdentifier =
					avail.name.replace(/[^a-zA-Z0-9]/g, "") || "OriginAnalysis";
				matched.push({
					id: `dyn-${avail.name}`,
					name: avail.name.replace(/_/g, " "),
					tool: avail.name,
					domain: avail.domain || "Dynamic Origin Capability",
					clearanceTier: `Tier ${avail.tier || 1}`,
					description:
						avail.description ||
						"Dynamic Logic-on-Origin capability discovered on target node.",
					code: `@LIOP{wasi_v1, ${safeIdentifier}}
const records = env.records || [];
// Return aggregated telemetry under zero-trust privacy
return {
  totalRecords: Array.isArray(records) ? records.length : (records ? 1 : 0),
  executionStatus: "PROCESSED_ON_ORIGIN",
  verifiedInSitu: true
};
@END`,
				});
			}
		}

		// Ensure workbench always has templates even during async initial scan
		return matched.length > 0 ? matched : CANONICAL_TEMPLATES;
	}, [tools, nodes]);

	// Auto-align selected template and code when availableTemplates changes or pending selection is set
	useEffect(() => {
		if (availableTemplates.length > 0) {
			if (pendingTemplateId) {
				const matching = availableTemplates.find(
					(t) => t.id === pendingTemplateId,
				);
				if (matching) {
					setSelectedTemplateId(matching.id);
					setSelectedToolName(matching.tool);
					setCode(matching.code);
					setPendingTemplateId(null);
					setPendingToolName(null);
					return;
				}
			}

			if (pendingToolName) {
				const matching = availableTemplates.find(
					(t) =>
						t.tool.toLowerCase() === pendingToolName.toLowerCase() ||
						t.tool.toLowerCase().replace(/_/g, "") ===
							pendingToolName.toLowerCase().replace(/_/g, ""),
				);
				if (matching) {
					setSelectedTemplateId(matching.id);
					setSelectedToolName(matching.tool);
					setCode(matching.code);
					setPendingToolName(null);
					return;
				}
			}

			const currentExists = availableTemplates.find(
				(t) => t.id === selectedTemplateId,
			);
			if (!currentExists) {
				const first = availableTemplates[0];
				setSelectedTemplateId(first.id);
				setSelectedToolName(first.tool);
				setCode(first.code);
			}
		}
	}, [
		availableTemplates,
		selectedTemplateId,
		pendingToolName,
		pendingTemplateId,
	]);

	// Smart Auto-Routing: selects template and seamlessly switches target node if required
	const handleSelectTemplate = useCallback(
		(templateId: string) => {
			const t =
				availableTemplates.find((x) => x.id === templateId) ||
				CANONICAL_TEMPLATES.find((x) => x.id === templateId);
			if (!t) return;

			// Auto-routing: Check if tool is provided by a specific online node
			const cleanTTool = t.tool.toLowerCase().replace(/_/g, "");
			const providerNode = nodes.find(
				(n) =>
					n.status === "online" &&
					(n.tools?.some(
						(tn) =>
							tn.toLowerCase() === t.tool.toLowerCase() ||
							tn.toLowerCase().replace(/_/g, "") === cleanTTool,
					) ||
						(t.id === "perimeter" && n.id === "blg") ||
						(t.id === "blg_banking" && n.id === "blg") ||
						(t.id === "blg_healthcare" && n.id === "blg") ||
						(t.id === "bank" && n.id === "bank") ||
						(t.id === "vault" && n.id === "vault") ||
						(t.id === "market" && n.id === "oracle") ||
						(t.id === "iot" && n.id === "edge") ||
						(t.id === "pii_attack" && n.id === "bank") ||
						(t.id === "mesh" && (n.id === "relay" || n.id === "oracle"))),
			);

			if (providerNode) {
				const port = providerNode.ports?.grpc ?? providerNode.ports?.http;
				const type: "grpc" | "http" = providerNode.ports?.grpc
					? "grpc"
					: "http";
				const targetStr =
					type === "grpc"
						? `${providerNode.host}:${port}`
						: `http://${providerNode.host}:${port}/mcp`;

				// If we are not connected to this node, switch seamlessly
				if (activeConnectedTarget !== targetStr) {
					setPendingTemplateId(t.id);
					setPendingToolName(t.tool);
					setSelectedTemplateId(t.id);
					setCode(t.code);
					setSelectedToolName(t.tool);
					handleSwitchTarget(targetStr, type, t.tool);
					return;
				}
			}

			// Same target or standalone
			setSelectedTemplateId(t.id);
			setCode(t.code);
			setSelectedToolName(t.tool);
		},
		[availableTemplates, nodes, activeConnectedTarget, handleSwitchTarget],
	);

	// Interactively select a tool and automatically load matching template
	const handleSelectTool = useCallback(
		(toolName: string) => {
			setSelectedToolName(toolName);
			const matchingTemplate =
				availableTemplates.find(
					(t) =>
						t.tool.toLowerCase() === toolName.toLowerCase() ||
						t.tool.toLowerCase().replace(/_/g, "") ===
							toolName.toLowerCase().replace(/_/g, ""),
				) ||
				CANONICAL_TEMPLATES.find(
					(t) =>
						t.tool.toLowerCase() === toolName.toLowerCase() ||
						t.tool.toLowerCase().replace(/_/g, "") ===
							toolName.toLowerCase().replace(/_/g, ""),
				);
			if (matchingTemplate) {
				setSelectedTemplateId(matchingTemplate.id);
				setCode(matchingTemplate.code);
			}
		},
		[availableTemplates],
	);

	const handleResetTemplate = useCallback(() => {
		const t = availableTemplates.find((x) => x.id === selectedTemplateId);
		if (t) {
			setCode(t.code);
		}
	}, [availableTemplates, selectedTemplateId]);

	// Capability support verification against current target
	const isToolSupported = useCallback(
		(toolName?: string): boolean => {
			if (!toolName || tools.length === 0) return false;
			const cleanTarget = toolName.toLowerCase().replace(/_/g, "");
			return tools.some(
				(t) =>
					t.name.toLowerCase() === toolName.toLowerCase() ||
					t.name.toLowerCase().replace(/_/g, "") === cleanTarget,
			);
		},
		[tools],
	);

	const currentTemplate = useMemo(() => {
		return availableTemplates.find((t) => t.id === selectedTemplateId);
	}, [availableTemplates, selectedTemplateId]);

	const isCurrentToolSupported = useMemo(() => {
		const toolToTest =
			executionMode === "form"
				? selectedToolName
				: currentTemplate?.tool || selectedToolName;
		return isToolSupported(toolToTest);
	}, [executionMode, selectedToolName, currentTemplate, isToolSupported]);

	const currentToolObj = useMemo(() => {
		return tools.find((t) => t.name === selectedToolName);
	}, [tools, selectedToolName]);

	// Execute action trigger
	const handleExecute = () => {
		const targetTool =
			selectedToolName ||
			currentTemplate?.tool ||
			availableTemplates[0]?.tool ||
			"";
		executeCore({
			targetTool,
			executionMode,
			code,
			formArgs,
			targetType,
		});
	};

	// Active layers count derived from live scan
	const activeTiers = useMemo(() => {
		const tiers = new Set<number>();
		for (const n of nodes) {
			if (
				n.status === "online" &&
				(n.tier === 1 || n.tier === 2 || n.tier === 3)
			) {
				tiers.add(n.tier);
			}
		}
		return tiers;
	}, [nodes]);

	const isTieredTopology = activeTiers.size > 0;

	return (
		<div className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground selection:bg-primary/20 selection:text-primary">
			{/* Header */}
			<StudioHeader
				onlineNodes={onlineNodes}
				totalNodes={totalNodes}
				hasNodeStats={hasNodeStats}
				isScanning={isScanning}
				secondsAgo={secondsAgo}
				theme={theme}
				onThemeChange={setTheme}
				onRescan={() => {
					fetchNodes(true, false);
					fetchTools();
					fetchHealth();
				}}
			/>

			{/* Target Transport Selector & Probe Bar */}
			<TargetConnectionBar
				targetType={targetType}
				onTargetTypeChange={setTargetType}
				stdioCmd={stdioCmd}
				onStdioCmdChange={setStdioCmd}
				httpUrl={httpUrl}
				onHttpUrlChange={setHttpUrl}
				grpcTarget={grpcTarget}
				onGrpcTargetChange={setGrpcTarget}
				onConnect={handleConnectTarget}
				isConnecting={isConnecting}
				activeConnectedTarget={activeConnectedTarget}
				connected={network?.status === "healthy"}
			/>

			{/* Main Workstation Layout */}
			<main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
					{/* Left Panel: Capabilities and Multi-Layer Server Scan (4 cols) */}
					<ServerScanPanel
						tools={tools}
						nodes={nodes}
						scanSummary={scanSummary}
						onlineNodes={onlineNodes}
						totalNodes={totalNodes}
						hasNodeStats={hasNodeStats}
						isScanning={isScanning}
						loadingTools={loadingTools}
						targetType={targetType}
						activeConnectedTarget={activeConnectedTarget}
						selectedToolName={selectedToolName}
						onSelectTool={handleSelectTool}
						onSwitchTarget={handleSwitchTarget}
					/>

					{/* Right Panel: Editor, Timeline and Results (8 cols) */}
					<section className="lg:col-span-8 flex flex-col space-y-6">
						<LogicEditor
							executionMode={executionMode}
							onExecutionModeChange={setExecutionMode}
							availableTemplates={availableTemplates}
							selectedTemplateId={selectedTemplateId}
							onSelectTemplate={handleSelectTemplate}
							selectedToolName={selectedToolName}
							onSelectTool={handleSelectTool}
							code={code}
							onCodeChange={setCode}
							isRunning={isRunning}
							tools={tools}
							isCurrentToolSupported={isCurrentToolSupported}
							currentTemplate={currentTemplate}
							currentToolObj={currentToolObj}
							activeConnectedTarget={activeConnectedTarget}
							isNetworkHealthy={network?.status === "healthy"}
							formArgs={formArgs}
							onFormArgChange={(field, val) =>
								setFormArgs((prev) => ({ ...prev, [field]: val }))
							}
							onResetTemplate={handleResetTemplate}
							onExecute={handleExecute}
							onOpenExportTab={() => setActiveConsoleTab("export")}
							onOpenEnvModal={() => setIsEnvModalOpen(true)}
						/>

						<ResultsConsole
							timeline={timeline}
							result={result}
							meta={meta}
							errorAlert={errorAlert}
							isRunning={isRunning}
							code={code}
							selectedToolName={selectedToolName}
							targetType={targetType}
							grpcTarget={grpcTarget}
							httpUrl={httpUrl}
							stdioCmd={stdioCmd}
							activeTab={activeConsoleTab}
							onTabChange={setActiveConsoleTab}
						/>
					</section>
				</div>
			</main>

			{/* Runtime Environment & Schema Inspector Modal */}
			<EnvironmentExplorer
				isOpen={isEnvModalOpen}
				onClose={() => setIsEnvModalOpen(false)}
				toolName={selectedToolName || "Analyze_Synthetic_Bank_Transactions"}
				tool={currentToolObj}
			/>

			{/* Footer: Dynamic and Sincere Topology Status */}
			<footer className="border-t border-border bg-card/60 py-3 mt-auto transition-colors">
				<div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-2">
					<div>
						© 2026 Nekzus Solutions. Logic-Injection-on-Origin Protocol (LIOP).
					</div>
					<div className="flex items-center space-x-4">
						<span className="flex items-center gap-1 font-mono">
							<span
								className={`inline-block w-1.5 h-1.5 rounded-full ${
									onlineNodes > 0 ? "bg-success" : "bg-rose-500"
								}`}
							></span>
							<span className="text-zinc-300">
								{isTieredTopology
									? "P2P Mesh: Multi-Tier Zero-Trust"
									: "Runtime: Direct Origin Execution"}
							</span>
						</span>
						<span className="font-mono text-zinc-300">
							{onlineNodes > 0
								? isTieredTopology
									? `${onlineNodes} Nodes Verified Across ${activeTiers.size} Layers`
									: `${onlineNodes} Target Node${onlineNodes > 1 ? "s" : ""} Online & Verified`
								: "Target Inactive (Offline)"}
						</span>
					</div>
				</div>
			</footer>
		</div>
	);
}
