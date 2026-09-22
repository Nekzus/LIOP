import { Cpu, Globe, Loader2, Play, Terminal, Waypoints } from "lucide-react";
import type React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export interface TargetConnectionBarProps {
	targetType: "stdio" | "http" | "grpc" | "mesh";
	onTargetTypeChange: (type: "stdio" | "http" | "grpc" | "mesh") => void;
	stdioCmd: string;
	onStdioCmdChange: (cmd: string) => void;
	httpUrl: string;
	onHttpUrlChange: (url: string) => void;
	grpcTarget: string;
	onGrpcTargetChange: (target: string) => void;
	onConnect: () => Promise<void>;
	isConnecting: boolean;
	activeConnectedTarget: string;
	connected: boolean;
}

export const TargetConnectionBar: React.FC<TargetConnectionBarProps> = ({
	targetType,
	onTargetTypeChange,
	stdioCmd,
	onStdioCmdChange,
	httpUrl,
	onHttpUrlChange,
	grpcTarget,
	onGrpcTargetChange,
	onConnect,
	isConnecting,
	activeConnectedTarget,
	connected,
}) => {
	return (
		<div className="w-full bg-surface1/90 border-b border-border px-4 py-2.5 backdrop-blur-sm transition-colors">
			<div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
				{/* Transport Type Pills */}
				<div className="flex items-center gap-1.5 p-0.5 bg-background/80 border border-white/10 rounded-lg shrink-0">
					<button
						type="button"
						onClick={() => onTargetTypeChange("stdio")}
						className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
							targetType === "stdio"
								? "bg-primary text-black font-semibold shadow-sm"
								: "text-zinc-400 hover:text-white"
						}`}
					>
						<Terminal className="h-3.5 w-3.5" />
						<span>Stdio</span>
					</button>

					<button
						type="button"
						onClick={() => onTargetTypeChange("http")}
						className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
							targetType === "http"
								? "bg-primary text-black font-semibold shadow-sm"
								: "text-zinc-400 hover:text-white"
						}`}
					>
						<Globe className="h-3.5 w-3.5" />
						<span>HTTP / SSE</span>
					</button>

					<button
						type="button"
						onClick={() => onTargetTypeChange("grpc")}
						className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
							targetType === "grpc"
								? "bg-primary text-black font-semibold shadow-sm"
								: "text-zinc-400 hover:text-white"
						}`}
					>
						<Cpu className="h-3.5 w-3.5" />
						<span>gRPC</span>
					</button>

					<button
						type="button"
						onClick={() => onTargetTypeChange("mesh")}
						className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
							targetType === "mesh"
								? "bg-primary text-black font-semibold shadow-sm"
								: "text-zinc-400 hover:text-white"
						}`}
					>
						<Waypoints className="h-3.5 w-3.5" />
						<span>LIOP Mesh</span>
					</button>
				</div>

				{/* Dynamic Transport Input & Action */}
				<div className="flex-1 flex items-center gap-2">
					{targetType === "stdio" && (
						<div className="flex-1 relative">
							<Input
								type="text"
								value={stdioCmd}
								onChange={(e) => onStdioCmdChange(e.target.value)}
								placeholder="Command and arguments, e.g.: npx -y @modelcontextprotocol/server-filesystem /tmp"
								className="font-mono text-[11px] h-8 bg-background/90"
							/>
						</div>
					)}

					{targetType === "http" && (
						<div className="flex-1 relative">
							<Input
								type="text"
								value={httpUrl}
								onChange={(e) => onHttpUrlChange(e.target.value)}
								placeholder="MCP Server Endpoint URL, e.g.: http://127.0.0.1:15000/mcp"
								className="font-mono text-[11px] h-8 bg-background/90"
							/>
						</div>
					)}

					{targetType === "grpc" && (
						<div className="flex-1 relative">
							<Input
								type="text"
								value={grpcTarget}
								onChange={(e) => onGrpcTargetChange(e.target.value)}
								placeholder="Tonic gRPC Host:Port, e.g.: 127.0.0.1:13011"
								className="font-mono text-[11px] h-8 bg-background/90"
							/>
						</div>
					)}

					{targetType === "mesh" && (
						<div className="flex-1 flex items-center px-3 py-1 bg-background/80 border border-white/10 rounded-md font-mono text-[11px] text-zinc-300">
							<span className="text-cyan-400 mr-2">Preset Topology:</span>
							<span>
								8 Sovereign Origin Nodes across 3 Tiers (Kademlia DHT + Swarm
								PSK)
							</span>
						</div>
					)}

					<Button
						size="sm"
						onClick={onConnect}
						disabled={isConnecting}
						className="h-8 px-4 text-xs font-semibold shrink-0"
					>
						{isConnecting ? (
							<>
								<Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
								Connecting...
							</>
						) : (
							<>
								<Play className="h-3 w-3 fill-current mr-1.5" />
								Connect / Probe
							</>
						)}
					</Button>
				</div>

				{/* Active Target Indicator Badge */}
				<div className="flex items-center gap-1.5 px-2.5 py-1 bg-background/90 border border-white/10 rounded-md shrink-0">
					<span className="relative flex h-2 w-2">
						{connected ? (
							<span className="inline-flex rounded-full h-2 w-2 bg-emerald-500" />
						) : (
							<span className="inline-flex rounded-full h-2 w-2 bg-rose-500" />
						)}
					</span>
					<span
						className={`font-mono text-[11px] truncate max-w-[220px] ${
							connected ? "text-zinc-300" : "text-rose-400 font-medium"
						}`}
						title={activeConnectedTarget}
					>
						{connected
							? activeConnectedTarget || "Ready to connect"
							: activeConnectedTarget
								? `${activeConnectedTarget} (Offline)`
								: "Target Offline"}
					</span>
				</div>
			</div>
		</div>
	);
};
