// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import {
	AlertTriangle,
	Check,
	Copy,
	Cpu,
	Globe,
	Loader2,
	Search,
	Server,
	ShieldCheck,
	Waypoints,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { copyToClipboard } from "../lib/clipboard";
import type { ScannedNode, ScanSummary, Tool } from "../types";
import { NodeCard } from "./NodeCard";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";

interface ServerScanPanelProps {
	tools: Tool[];
	nodes: ScannedNode[];
	scanSummary: ScanSummary | null;
	onlineNodes: number;
	totalNodes: number;
	hasNodeStats: boolean;
	isScanning: boolean;
	loadingTools: boolean;
	targetType: string;
	grpcTarget: string;
	activeConnectedTarget: string;
	selectedToolName: string;
	onSelectTool: (toolName: string) => void;
	onSwitchTarget: (
		target: string,
		type: "grpc" | "http",
		toolToSelect?: string,
	) => void;
}

export function ServerScanPanel({
	tools,
	nodes,
	scanSummary,
	onlineNodes,
	totalNodes,
	hasNodeStats,
	isScanning,
	loadingTools,
	targetType,
	grpcTarget,
	activeConnectedTarget,
	selectedToolName,
	onSelectTool,
	onSwitchTarget,
}: ServerScanPanelProps) {
	const [activeLeftTab, setActiveLeftTab] = useState<"capabilities" | "nodes">(
		"nodes",
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [filterTier, setFilterTier] = useState<
		"all" | 1 | 2 | 3 | "standalone"
	>("all");
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	const handleCopy = async (text: string, key: string) => {
		const ok = await copyToClipboard(text);
		if (ok) {
			setCopiedKey(key);
			setTimeout(() => setCopiedKey(null), 1500);
		}
	};

	// Detect available tiers and standalone targets dynamically
	const availableTiers = useMemo(() => {
		const set = new Set<1 | 2 | 3>();
		for (const n of nodes) {
			if (n.tier === 1 || n.tier === 2 || n.tier === 3) set.add(n.tier);
		}
		return Array.from(set).sort();
	}, [nodes]);

	const hasStandaloneNodes = useMemo(
		() => nodes.some((n) => n.tier === undefined || n.tier === null),
		[nodes],
	);

	const isTieredTopology = availableTiers.length > 0;

	// Filter tools based on query
	const filteredTools = useMemo(() => {
		if (!searchQuery.trim()) return tools;
		const q = searchQuery.toLowerCase();
		return tools.filter(
			(t) =>
				t.name.toLowerCase().includes(q) ||
				t.description?.toLowerCase().includes(q) ||
				t.domain?.toLowerCase().includes(q) ||
				t.taxonomy?.domain?.toLowerCase().includes(q),
		);
	}, [tools, searchQuery]);

	// Filter nodes based on tier or standalone
	const filteredNodes = useMemo(() => {
		if (filterTier === "all") return nodes;
		if (filterTier === "standalone") {
			return nodes.filter((n) => n.tier === undefined || n.tier === null);
		}
		return nodes.filter((n) => n.tier === filterTier);
	}, [nodes, filterTier]);

	const standaloneNodes = useMemo(
		() => filteredNodes.filter((n) => n.tier === undefined || n.tier === null),
		[filteredNodes],
	);
	const tier1Nodes = useMemo(
		() => filteredNodes.filter((n) => n.tier === 1),
		[filteredNodes],
	);
	const tier2Nodes = useMemo(
		() => filteredNodes.filter((n) => n.tier === 2),
		[filteredNodes],
	);
	const tier3Nodes = useMemo(
		() => filteredNodes.filter((n) => n.tier === 3),
		[filteredNodes],
	);

	const isConnectedToNode = (n: ScannedNode): boolean => {
		if (targetType === "grpc") {
			const targetPort = grpcTarget.split(":")[1] || "";
			const activePort = activeConnectedTarget.split(":")[1] || "";
			return Boolean(
				(n.ports?.grpc &&
					(String(n.ports.grpc) === targetPort ||
						String(n.ports.grpc) === activePort)) ||
					(n.host &&
						(grpcTarget.includes(n.host) ||
							activeConnectedTarget.includes(n.host)) &&
						targetPort === String(n.ports?.grpc)) ||
					grpcTarget.toLowerCase().includes(n.id.toLowerCase()) ||
					activeConnectedTarget.toLowerCase().includes(n.id.toLowerCase()),
			);
		}
		if (targetType === "http") {
			const portMatch = activeConnectedTarget.match(/:(\d+)/)?.[1] || "";
			return Boolean(
				(n.ports?.http && String(n.ports.http) === portMatch) ||
					activeConnectedTarget.toLowerCase().includes(n.id.toLowerCase()),
			);
		}
		return n.id === "bank" || n.status === "online";
	};

	return (
		<section className="lg:col-span-4 flex flex-col space-y-6">
			{/* Main Card: Tabbed Switcher between Mesh Capabilities & Multi-Layer Server Scan */}
			<Card className="flex flex-col h-[560px] overflow-hidden bg-card border-border shadow-card">
				<CardHeader className="pb-2.5 shrink-0 border-b border-border/40">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-1.5 p-0.5 bg-surface1 border border-white/10 rounded-lg">
							<button
								type="button"
								onClick={() => setActiveLeftTab("nodes")}
								className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
									activeLeftTab === "nodes"
										? "bg-primary text-black font-semibold shadow-sm"
										: "text-zinc-400 hover:text-white"
								}`}
							>
								<Server className="h-3.5 w-3.5" />
								Server Scan{" "}
								{hasNodeStats ? `(${onlineNodes}/${totalNodes})` : ""}
							</button>
							<button
								type="button"
								onClick={() => setActiveLeftTab("capabilities")}
								className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
									activeLeftTab === "capabilities"
										? "bg-primary text-black font-semibold shadow-sm"
										: "text-zinc-400 hover:text-white"
								}`}
							>
								<Waypoints className="h-3.5 w-3.5" />
								Capabilities ({tools.length})
							</button>
						</div>

						<Badge
							variant="outline"
							className="text-[10px] font-mono border-white/15 text-zinc-300"
						>
							{activeLeftTab === "capabilities"
								? `${tools.length} tools`
								: isTieredTopology
									? `${availableTiers.length} Active Layer${availableTiers.length > 1 ? "s" : ""}`
									: `${totalNodes} Targets`}
						</Badge>
					</div>

					{activeLeftTab === "capabilities" ? (
						<>
							<CardDescription className="text-xs text-zinc-400">
								Discovered runtime capabilities ready for secure in-situ
								execution.
							</CardDescription>
							{/* Search / Filter bar */}
							<div className="relative mt-2">
								<Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Filter by capability or domain..."
									spellCheck={false}
									autoComplete="off"
									autoCorrect="off"
									className="w-full h-8 pl-8 pr-7 bg-surface1 border border-white/15 rounded text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
								/>
								{searchQuery && (
									<button
										type="button"
										onClick={() => setSearchQuery("")}
										className="absolute right-2 top-2 text-zinc-400 hover:text-white p-0.5 rounded transition-colors"
										title="Clear filter"
									>
										<X className="h-3.5 w-3.5" />
									</button>
								)}
							</div>
						</>
					) : (
						<div className="flex items-center justify-between mt-1">
							<span className="text-[11px] text-zinc-400">
								{isTieredTopology
									? "Live scan across network layers:"
									: "Discovered network targets:"}
							</span>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => setFilterTier("all")}
									className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
										filterTier === "all"
											? "bg-primary/20 text-cyan-400 border border-cyan-500/40"
											: "text-zinc-400 hover:text-zinc-200 border border-transparent"
									}`}
								>
									All
								</button>
								{hasStandaloneNodes && (
									<button
										type="button"
										onClick={() => setFilterTier("standalone")}
										className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
											filterTier === "standalone"
												? "bg-primary/20 text-cyan-400 border border-cyan-500/40"
												: "text-zinc-400 hover:text-zinc-200 border border-transparent"
										}`}
									>
										Direct
									</button>
								)}
								{availableTiers.map((tierVal) => (
									<button
										key={tierVal}
										type="button"
										onClick={() => setFilterTier(tierVal)}
										className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
											filterTier === tierVal
												? "bg-primary/20 text-cyan-400 border border-cyan-500/40"
												: "text-zinc-400 hover:text-zinc-200 border border-transparent"
										}`}
									>
										T{tierVal}
									</button>
								))}
							</div>
						</div>
					)}
				</CardHeader>

				<CardContent className="flex-1 min-h-0 overflow-hidden p-0">
					<ScrollArea className="h-full px-4 py-2">
						{activeLeftTab === "capabilities" ? (
							/* Capabilities List */
							loadingTools ? (
								<div className="flex flex-col items-center justify-center py-12 text-zinc-400 space-y-2">
									<Loader2 className="h-5 w-5 animate-spin text-primary" />
									<span className="text-xs text-zinc-300">
										Discovering capabilities across tiers...
									</span>
								</div>
							) : filteredTools.length === 0 ? (
								<div className="text-center py-12 text-zinc-400 space-y-2">
									<AlertTriangle className="h-6 w-6 mx-auto text-warning" />
									<p className="text-xs font-medium text-zinc-200">
										No capabilities found
									</p>
									<p className="text-[11px] text-zinc-400 max-w-[200px] mx-auto">
										Try adjusting your search query.
									</p>
								</div>
							) : (
								<div className="space-y-2.5 pb-4">
									{filteredTools.map((t) => {
										const isSelected = selectedToolName === t.name;
										const tier =
											t.tier ||
											(t.taxonomy?.clearanceTier === 1
												? 1
												: t.taxonomy?.clearanceTier === 3
													? 3
													: 2);

										return (
											<button
												type="button"
												key={t.name}
												onClick={() => onSelectTool(t.name)}
												className={`w-full text-left p-3 rounded-md border transition-all cursor-pointer ${
													isSelected
														? "bg-primary/10 border-primary/60 text-white shadow-sm ring-1 ring-primary/30"
														: "bg-secondary/40 border-border/70 hover:bg-secondary/80 hover:border-border"
												}`}
											>
												<div className="flex items-center justify-between mb-1">
													<span className="font-semibold text-xs text-zinc-100 truncate max-w-[190px]">
														{t.name}
													</span>
													<Badge
														variant={
															tier === 1
																? "success"
																: tier === 2
																	? "warning"
																	: "default"
														}
														className="text-[10px] py-0 px-1.5 font-normal"
													>
														Tier {tier}
													</Badge>
												</div>
												<p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
													{t.description || "No description available."}
												</p>
												<div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400">
													<span className="flex items-center gap-1 truncate max-w-[180px]">
														<span
															className={`w-1.5 h-1.5 rounded-full ${tier === 1 ? "bg-emerald-400" : tier === 2 ? "bg-cyan-400" : "bg-purple-400"}`}
														></span>
														{t.providerNode ||
															t.taxonomy?.domain ||
															"Mesh Node"}
													</span>
													<span className="font-mono text-[9px] opacity-75 shrink-0">
														WASI In-situ
													</span>
												</div>
											</button>
										);
									})}
								</div>
							)
						) : (
							/* Multi-Layer Server Scan View */
							<div className="space-y-4 pb-4">
								{nodes.length === 0 ? (
									<div className="text-center py-10 px-4 bg-surface1/20 rounded-lg border border-white/5 space-y-2">
										<Server className="h-7 w-7 text-cyan-400 mx-auto opacity-70 animate-pulse" />
										<p className="text-xs font-semibold text-zinc-200">
											Scanning Network Nodes...
										</p>
										<p className="text-[11px] text-zinc-400 font-mono">
											Querying {activeConnectedTarget}
										</p>
									</div>
								) : (
									<>
										{/* Standalone / Direct Compute Targets */}
										{(filterTier === "all" || filterTier === "standalone") &&
											standaloneNodes.length > 0 && (
												<div className="space-y-2">
													<div className="flex items-center justify-between text-[11px] font-semibold text-sky-400 border-b border-sky-500/20 pb-1">
														<span className="flex items-center gap-1.5">
															<Server className="h-3.5 w-3.5 text-sky-400" />
															Direct Connection & Standalone Targets
														</span>
														<span className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300">
															Direct Compute
														</span>
													</div>

													{standaloneNodes.map((n) => (
														<NodeCard
															key={n.id}
															node={n}
															isConnected={
																isConnectedToNode(n) && n.status === "online"
															}
															onSwitchTarget={onSwitchTarget}
															onSelectTool={onSelectTool}
														/>
													))}
												</div>
											)}

										{/* Tier 1 Group: Sovereign Core Enclaves */}
										{isTieredTopology &&
											(filterTier === "all" || filterTier === 1) && (
												<div className="space-y-2">
													<div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400 border-b border-emerald-500/20 pb-1">
														<span className="flex items-center gap-1.5">
															<ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
															Tier 1: Sovereign Core Enclaves
														</span>
														<span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
															Zero-Trust • PSK
														</span>
													</div>

													{tier1Nodes.length === 0 ? (
														<div className="text-[10px] text-zinc-500 italic py-2 px-2.5 bg-surface1/30 rounded border border-white/5 flex items-center gap-1.5">
															<AlertTriangle className="h-3 w-3 text-zinc-500" />
															No Tier 1 nodes detected on scanned target
														</div>
													) : (
														tier1Nodes.map((n) => (
															<NodeCard
																key={n.id}
																node={n}
																isConnected={
																	isConnectedToNode(n) && n.status === "online"
																}
																onSwitchTarget={onSwitchTarget}
																onSelectTool={onSelectTool}
															/>
														))
													)}
												</div>
											)}

										{/* Tier 2 Group: Consortium Relays & Gateways */}
										{isTieredTopology &&
											(filterTier === "all" || filterTier === 2) && (
												<div className="space-y-2">
													<div className="flex items-center justify-between text-[11px] font-semibold text-cyan-400 border-b border-cyan-500/20 pb-1">
														<span className="flex items-center gap-1.5">
															<Globe className="h-3.5 w-3.5 text-cyan-400" />
															Tier 2: Consortium Relays & Gateways
														</span>
														<span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
															BLG • mTLS
														</span>
													</div>

													{tier2Nodes.length === 0 ? (
														<div className="text-[10px] text-zinc-500 italic py-2 px-2.5 bg-surface1/30 rounded border border-white/5 flex items-center gap-1.5">
															<AlertTriangle className="h-3 w-3 text-zinc-500" />
															No Tier 2 nodes detected on scanned target
														</div>
													) : (
														tier2Nodes.map((n) => (
															<NodeCard
																key={n.id}
																node={n}
																isConnected={
																	isConnectedToNode(n) && n.status === "online"
																}
																onSwitchTarget={onSwitchTarget}
																onSelectTool={onSelectTool}
															/>
														))
													)}
												</div>
											)}

										{/* Tier 3 Group: Public Backbone & Client Edge */}
										{isTieredTopology &&
											(filterTier === "all" || filterTier === 3) && (
												<div className="space-y-2">
													<div className="flex items-center justify-between text-[11px] font-semibold text-purple-400 border-b border-purple-500/20 pb-1">
														<span className="flex items-center gap-1.5">
															<Cpu className="h-3.5 w-3.5 text-purple-400" />
															Tier 3: Public Backbone & Client Edge
														</span>
														<span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
															AutoNAT / WAN
														</span>
													</div>

													{tier3Nodes.length === 0 ? (
														<div className="text-[10px] text-zinc-500 italic py-2 px-2.5 bg-surface1/30 rounded border border-white/5 flex items-center gap-1.5">
															<AlertTriangle className="h-3 w-3 text-zinc-500" />
															No Tier 3 edge nodes active on scanned target
														</div>
													) : (
														tier3Nodes.map((n) => (
															<NodeCard
																key={n.id}
																node={n}
																isConnected={
																	isConnectedToNode(n) && n.status === "online"
																}
																onSwitchTarget={onSwitchTarget}
																onSelectTool={onSelectTool}
															/>
														))
													)}
												</div>
											)}
									</>
								)}
							</div>
						)}
					</ScrollArea>
				</CardContent>
			</Card>

			{/* Card: Mesh Discovery Telemetry Summary */}
			<Card className="p-4 bg-card border-border shadow-card shrink-0">
				<h3 className="text-xs font-semibold text-white mb-3 flex items-center justify-between">
					<span>Mesh Discovery Telemetry</span>
					<span className="font-mono text-[10px] text-zinc-400 font-normal flex items-center gap-1">
						{isScanning && (
							<Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
						)}
						{targetType.toUpperCase()} / WASI
					</span>
				</h3>
				<div className="space-y-2.5 text-xs">
					<div className="flex items-center justify-between border-b border-border/50 pb-2">
						<span className="text-zinc-400">Mesh Topology:</span>
						<div className="flex items-center gap-1.5">
							<span
								className={`h-2 w-2 rounded-full ${
									onlineNodes > 0 ? "bg-emerald-400" : "bg-rose-500"
								}`}
							/>
							<span
								className={`font-mono text-[11px] font-medium ${
									onlineNodes > 0 ? "text-white" : "text-zinc-500"
								}`}
							>
								{onlineNodes > 0
									? `${onlineNodes}/${totalNodes} Nodes Online`
									: "0 Nodes Online (Offline)"}
							</span>
						</div>
					</div>

					<div className="flex items-center justify-between border-b border-border/50 pb-2">
						<span className="text-zinc-400">Architecture Mode:</span>
						<span
							className={`font-mono text-[11px] ${
								onlineNodes > 0 ? "text-cyan-400" : "text-zinc-500"
							}`}
						>
							{onlineNodes > 0
								? isTieredTopology
									? `${availableTiers.length} Active Layer${availableTiers.length > 1 ? "s" : ""}`
									: "Direct Standalone Node"
								: "Offline"}
						</span>
					</div>

					<div className="flex items-center justify-between border-b border-border/50 pb-2">
						<span className="text-zinc-400">Discovered Tools:</span>
						<span
							className={`font-mono text-[11px] ${
								tools.length > 0 ? "text-emerald-400" : "text-zinc-500"
							}`}
						>
							{tools.length > 0
								? `${tools.length} Capabilities`
								: "0 Available"}
						</span>
					</div>

					<div className="flex items-center justify-between border-b border-border/50 pb-2">
						<span className="text-zinc-400">Avg Round-Trip Time:</span>
						<span
							className={`font-mono text-[11px] ${
								onlineNodes > 0 ? "text-white font-semibold" : "text-zinc-500"
							}`}
						>
							{onlineNodes > 0
								? scanSummary?.avgLatencyMs !== undefined &&
									scanSummary.avgLatencyMs > 0
									? `${scanSummary.avgLatencyMs} ms`
									: nodes.some((n) => n.rttMs > 0 && n.status === "online")
										? `${Math.round(
												nodes
													.filter((n) => n.status === "online" && n.rttMs > 0)
													.reduce((acc, curr) => acc + curr.rttMs, 0) /
													Math.max(
														1,
														nodes.filter(
															(n) => n.status === "online" && n.rttMs > 0,
														).length,
													),
											)} ms`
										: "—"
								: "—"}
						</span>
					</div>

					<div className="flex items-center justify-between pt-0.5">
						<span className="text-zinc-400">Active Target:</span>
						<div className="flex items-center gap-1.5">
							<span
								className="font-mono text-[11px] text-zinc-300 truncate max-w-[130px]"
								title={activeConnectedTarget}
							>
								{activeConnectedTarget}
							</span>
							<button
								type="button"
								onClick={() => handleCopy(activeConnectedTarget, "target")}
								className="text-zinc-400 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
								title="Copy Target Address"
							>
								{copiedKey === "target" ? (
									<Check className="h-3 w-3 text-emerald-400" />
								) : (
									<Copy className="h-3 w-3" />
								)}
							</button>
						</div>
					</div>
				</div>
			</Card>
		</section>
	);
}
