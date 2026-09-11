import { Cpu, Globe, Server, ShieldCheck, Terminal, Zap } from "lucide-react";
import type { ScannedNode } from "../types";

interface NodeCardProps {
	node: ScannedNode;
	isConnected: boolean;
	onSwitchTarget: (
		target: string,
		type: "grpc" | "http",
		toolToSelect?: string,
	) => void;
	onSelectTool: (tool: string) => void;
}

export function NodeCard({
	node,
	isConnected,
	onSwitchTarget,
	onSelectTool,
}: NodeCardProps) {
	const isOffline = node.status === "offline";
	const tier = node.tier;

	// Visual theme per tier or transport
	const isStdio = node.transportType === "stdio";
	const isGrpc = node.transportType === "grpc" || Boolean(node.ports?.grpc);
	const isHttp = node.transportType === "http" || Boolean(node.ports?.http);

	const tierConfig =
		tier === 1
			? {
					bgActive: "bg-tier1 border-emerald-500/60 ring-1 ring-emerald-500/30",
					bgInactive: "bg-tier1 border-emerald-500/30 hover:brightness-110",
					textAccent: "text-emerald-400",
					badgeBorder: "border-emerald-500/30",
					badgeBg: "bg-emerald-500/15",
					badgeText: "text-emerald-300",
					icon: ShieldCheck,
				}
			: tier === 2
				? {
						bgActive: "bg-tier2 border-cyan-500/60 ring-1 ring-cyan-500/30",
						bgInactive: "bg-tier2 border-cyan-500/30 hover:brightness-110",
						textAccent: "text-cyan-400",
						badgeBorder: "border-cyan-500/30",
						badgeBg: "bg-cyan-500/15",
						badgeText: "text-cyan-200",
						icon: Globe,
					}
				: tier === 3
					? {
							bgActive: "bg-tier3 border-cyan-500/60 ring-1 ring-cyan-500/30",
							bgInactive: "bg-tier3 border-purple-500/30 hover:brightness-110",
							textAccent: "text-purple-400",
							badgeBorder: "border-purple-500/30",
							badgeBg: "bg-purple-500/15",
							badgeText: "text-purple-200",
							icon: Cpu,
						}
					: {
							// Standalone / Direct Node
							bgActive:
								"bg-surface1 border-cyan-500/60 ring-1 ring-cyan-500/30",
							bgInactive:
								"bg-surface1/60 border-border hover:border-border/80 hover:brightness-110",
							textAccent: isStdio
								? "text-amber-400"
								: isGrpc
									? "text-cyan-400"
									: "text-sky-400",
							badgeBorder: "border-white/15",
							badgeBg: "bg-white/10",
							badgeText: "text-zinc-200",
							icon: isStdio ? Terminal : isGrpc ? Cpu : isHttp ? Globe : Server,
						};

	const TierIcon = tierConfig.icon;

	const handleConnect = () => {
		const port = node.ports?.grpc ?? node.ports?.http;
		const type = node.ports?.grpc ? "grpc" : "http";
		const targetStr =
			type === "grpc"
				? `${node.host}:${port}`
				: `http://${node.host}:${port}/mcp`;
		onSwitchTarget(targetStr, type);
	};

	const handleToolClick = (tool: string) => {
		if (!isConnected) {
			const port = node.ports?.grpc ?? node.ports?.http;
			const type = node.ports?.grpc ? "grpc" : "http";
			const targetStr =
				type === "grpc"
					? `${node.host}:${port}`
					: `http://${node.host}:${port}/mcp`;
			onSwitchTarget(targetStr, type, tool);
		} else {
			onSelectTool(tool);
		}
	};

	const displayAddress = isStdio
		? "stdio (local pipeline)"
		: node.ports?.grpc
			? `${node.host}:${node.ports.grpc}`
			: node.ports?.http
				? `${node.host}:${node.ports.http}`
				: node.host;

	return (
		<div
			className={`p-2.5 rounded-md border transition-all ${
				isOffline
					? "border-border/40 bg-surface1/20 opacity-60"
					: isConnected
						? `${tierConfig.bgActive} shadow-sm`
						: tierConfig.bgInactive
			}`}
		>
			<div className="flex items-center justify-between mb-1">
				<div className="flex items-center gap-1.5">
					<TierIcon
						className={`h-3 w-3 ${
							isOffline ? "text-zinc-500" : tierConfig.textAccent
						}`}
					/>
					<span
						className={`text-xs font-semibold ${
							isOffline ? "text-zinc-400" : "text-zinc-100"
						}`}
					>
						{node.name}
					</span>
					{isConnected && (
						<span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 font-bold flex items-center gap-1">
							<span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
							ACTIVE TARGET
						</span>
					)}
				</div>
				<div className="flex items-center gap-1.5">
					{!isConnected && !isOffline && (
						<button
							type="button"
							onClick={handleConnect}
							className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface1 hover:bg-primary hover:text-black border border-white/10 text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
							title={`Connect to ${node.name}`}
						>
							<Zap className="h-2.5 w-2.5 text-cyan-400" />
							<span>Connect</span>
						</button>
					)}
					<span
						className={`inline-block h-1.5 w-1.5 rounded-full ${
							isOffline
								? "bg-rose-500"
								: tierConfig.textAccent.replace("text-", "bg-")
						}`}
					></span>
					<span
						className={`text-[10px] font-mono ${
							isOffline ? "text-zinc-500 font-medium" : tierConfig.textAccent
						}`}
					>
						{isOffline ? "OFFLINE" : `${node.rttMs}ms`}
					</span>
				</div>
			</div>

			<p className="text-[10px] text-zinc-400 mb-1">{node.role}</p>

			<div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
				<span>{displayAddress}</span>
				<span
					className={`text-[9px] ${
						isOffline ? "text-zinc-500" : tierConfig.textAccent
					}`}
				>
					{node.isolation?.split("+")[0] ||
						node.tierLabel?.split(":")[0] ||
						(tier === 1
							? "Sovereign Node"
							: tier === 2
								? "Consortium Node"
								: tier === 3
									? "Client Edge"
									: "Direct Target")}
				</span>
			</div>

			{!isOffline && node.tools.length > 0 && (
				<div className="mt-1.5 flex flex-wrap gap-1">
					{node.tools.map((tool) => (
						<button
							key={tool}
							type="button"
							onClick={() => handleToolClick(tool)}
							className={`text-[9px] px-1.5 py-0.5 rounded ${tierConfig.badgeBg} hover:opacity-80 border ${tierConfig.badgeBorder} ${tierConfig.badgeText} transition-colors cursor-pointer`}
							title={
								isConnected
									? `Load ${tool} in Logic Studio`
									: `Connect to ${node.name} and load ${tool}`
							}
						>
							+ {tool}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
