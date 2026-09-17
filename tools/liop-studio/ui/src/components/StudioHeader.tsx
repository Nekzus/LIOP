// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { motion } from "framer-motion";
import { Layers, Moon, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

// Official LIOP Protocol Vector Mark (Regular Octagon with core origin node and 8 logic injection waves)
export function LiopLogo({
	className = "h-8 w-8 text-primary",
}: {
	className?: string;
}) {
	return (
		<svg
			className={className}
			viewBox="0 0 120 120"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>LIOP Protocol Logo</title>
			<g
				stroke="currentColor"
				strokeWidth="6"
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			>
				<polygon points="100,76.57 76.57,100 43.43,100 20,76.57 20,43.43 43.43,20 76.57,20 100,43.43" />
				<circle cx="60" cy="60" r="10" fill="currentColor" stroke="none" />
				<path d="M 60 60 C 60 45, 100 75, 100 60" />
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(45 60 60)"
				/>
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(90 60 60)"
				/>
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(135 60 60)"
				/>
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(180 60 60)"
				/>
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(225 60 60)"
				/>
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(270 60 60)"
				/>
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(315 60 60)"
				/>
			</g>
		</svg>
	);
}

interface StudioHeaderProps {
	onlineNodes: number;
	totalNodes: number;
	hasNodeStats: boolean;
	isScanning: boolean;
	secondsAgo: number;
	theme: "obsidian" | "slate";
	version?: string;
	activeTiersCount?: number;
	onThemeChange: (theme: "obsidian" | "slate") => void;
	onRescan: () => void;
}

export function StudioHeader({
	onlineNodes,
	totalNodes,
	hasNodeStats,
	isScanning,
	secondsAgo,
	theme,
	version,
	activeTiersCount,
	onThemeChange,
	onRescan,
}: StudioHeaderProps) {
	return (
		<header className="border-b border-border bg-card/90 backdrop-blur-sm sticky top-0 z-50 transition-colors">
			<div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<LiopLogo className="h-8 w-8 text-primary shrink-0 transition-transform duration-200 hover:scale-105" />

					<div className="flex items-center gap-2">
						<div>
							<h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
								<span>LIOP Studio</span>
								<span className="text-[10px] font-mono font-medium px-1.5 py-0.2 text-cyan-300 border border-cyan-500/30 rounded bg-cyan-500/10">
									{version ? `v${version}` : "v1.0.0-alpha.5"}
								</span>
							</h1>
							<p className="text-[10px] text-zinc-400 -mt-0.5 hidden sm:block">
								Sovereign Logic & MCP Multi-Transport Inspector
							</p>
						</div>
					</div>
				</div>

				<div className="flex items-center space-x-2.5">
					{/* Live Mesh Status Badge */}
					<div className="flex items-center space-x-2 bg-secondary/80 border border-white/10 px-3 py-1 rounded-md text-xs">
						<span className="relative flex h-2 w-2">
							{onlineNodes > 0 ? (
								<>
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
									<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
								</>
							) : (
								<span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
							)}
						</span>
						<span
							className={`font-medium ${
								onlineNodes > 0 ? "text-white" : "text-rose-400"
							}`}
						>
							{hasNodeStats
								? onlineNodes > 0
									? `${onlineNodes}/${totalNodes} Nodes Online`
									: "0 Nodes Online (Offline)"
								: isScanning
									? "Scanning Mesh Nodes..."
									: "Topology Offline"}
						</span>
						{activeTiersCount !== undefined && activeTiersCount > 0 && (
							<span className="text-cyan-400 font-mono text-[10px] hidden sm:inline">
								({activeTiersCount} {activeTiersCount === 1 ? "Tier" : "Tiers"})
							</span>
						)}
						<span className="text-zinc-400 font-mono text-[10px] border-l border-white/15 pl-1.5 hidden md:inline">
							{secondsAgo === 0 ? "live" : `${secondsAgo}s ago`}
						</span>
					</div>

					{/* Scan Mesh Button */}
					<Button
						size="sm"
						variant="outline"
						onClick={onRescan}
						disabled={isScanning}
						className="h-8 px-2.5 border-white/15 bg-surface1 text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-1.5 text-xs"
						title="Re-scan mesh topology across all layers"
					>
						<RefreshCw
							className={`h-3.5 w-3.5 text-cyan-400 ${isScanning ? "animate-spin" : ""}`}
						/>
						<span className="hidden md:inline font-mono text-[11px]">Scan</span>
					</Button>

					{/* Sliding Pill Theme Switcher */}
					<div className="relative flex items-center bg-surface1 border border-white/15 p-0.5 rounded-md">
						<button
							type="button"
							onClick={() => onThemeChange("obsidian")}
							className="relative z-10 text-[11px] px-2.5 py-1 font-medium flex items-center gap-1.5 transition-colors duration-200"
							title="OLED Obsidian Theme"
						>
							{theme === "obsidian" && (
								<motion.div
									layoutId="themeActivePill"
									className="absolute inset-0 bg-primary rounded shadow-sm"
									transition={{ type: "spring", stiffness: 450, damping: 35 }}
								/>
							)}
							<Moon
								className={`relative z-20 h-3.5 w-3.5 transition-colors duration-200 ${
									theme === "obsidian" ? "text-black" : "text-zinc-400"
								}`}
							/>
							<span
								className={`relative z-20 font-medium transition-colors duration-200 ${
									theme === "obsidian"
										? "text-black"
										: "text-zinc-300 hover:text-white"
								}`}
							>
								Obsidian
							</span>
						</button>
						<button
							type="button"
							onClick={() => onThemeChange("slate")}
							className="relative z-10 text-[11px] px-2.5 py-1 font-medium flex items-center gap-1.5 transition-colors duration-200"
							title="Slate Dark Theme"
						>
							{theme === "slate" && (
								<motion.div
									layoutId="themeActivePill"
									className="absolute inset-0 bg-primary rounded shadow-sm"
									transition={{ type: "spring", stiffness: 450, damping: 35 }}
								/>
							)}
							<Layers
								className={`relative z-20 h-3.5 w-3.5 transition-colors duration-200 ${
									theme === "slate" ? "text-black" : "text-zinc-400"
								}`}
							/>
							<span
								className={`relative z-20 font-medium transition-colors duration-200 ${
									theme === "slate"
										? "text-black"
										: "text-zinc-300 hover:text-white"
								}`}
							>
								Slate
							</span>
						</button>
					</div>
				</div>
			</div>
		</header>
	);
}
