// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	NetworkInfo,
	ScannedNode,
	ScanSummary,
	SessionTelemetry,
	Tool,
} from "../types";

export type TargetType = "stdio" | "http" | "grpc" | "mesh";

interface UseStudioNetworkOptions {
	onTargetSwitched?: (toolToSelect?: string) => void;
	onError?: (err: { title: string; desc: string }) => void;
}

export function useStudioNetwork(options: UseStudioNetworkOptions = {}) {
	const { onTargetSwitched, onError } = options;
	const onTargetSwitchedRef = useRef(onTargetSwitched);
	onTargetSwitchedRef.current = onTargetSwitched;
	const onErrorRef = useRef(onError);
	onErrorRef.current = onError;

	// Network & nodes state
	const [network, setNetwork] = useState<NetworkInfo | null>(null);
	const [tools, setTools] = useState<Tool[]>([]);
	const [nodes, setNodes] = useState<ScannedNode[]>([]);
	const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null);
	const [sessionTelemetry, setSessionTelemetry] =
		useState<SessionTelemetry | null>(null);

	// Target Connection State
	const [targetType, setTargetType] = useState<TargetType>("http");
	const targetTypeRef = useRef(targetType);
	targetTypeRef.current = targetType;
	const [stdioCmd, setStdioCmd] = useState(
		"npx -y @modelcontextprotocol/server-filesystem /tmp",
	);
	const [httpUrl, setHttpUrl] = useState("http://127.0.0.1:15000/mcp");
	const [grpcTarget, setGrpcTarget] = useState("127.0.0.1:13011");
	const [isConnecting, setIsConnecting] = useState(false);
	const [isScanning, setIsScanning] = useState(false);
	const [loadingTools, setLoadingTools] = useState(false);
	const [activeConnectedTarget, setActiveConnectedTarget] = useState<string>(
		"http://127.0.0.1:15000/mcp",
	);

	// Timers
	const [lastScanTimestamp, setLastScanTimestamp] = useState<number>(
		Date.now(),
	);
	const [secondsAgo, setSecondsAgo] = useState(0);

	// Derived topology stats
	const totalNodes =
		scanSummary?.totalNodes ?? network?.totalNodes ?? nodes.length;
	const onlineNodes =
		scanSummary?.onlineNodes ??
		network?.nodesOnline ??
		nodes.filter((n) => n.status === "online").length;
	const hasNodeStats = totalNodes > 0;

	// Auto-connect tracking
	const hasAutoConnectedRef = useRef(false);

	// Fetch network health
	const fetchHealth = useCallback(async () => {
		try {
			const res = await fetch("/api/health");
			if (res.ok) {
				const data = await res.json();
				setNetwork(data);
			}
		} catch (err) {
			console.error("Error fetching network health:", err);
		}
	}, []);

	// Fetch target tools
	const fetchTools = useCallback(async () => {
		setLoadingTools(true);
		try {
			const res = await fetch("/api/tools");
			if (res.ok) {
				const data = await res.json();
				const fetchedTools: Tool[] = data.tools || [];
				setTools(fetchedTools);
			}
		} catch (err) {
			console.error("Error fetching tools:", err);
		} finally {
			setLoadingTools(false);
		}
	}, []);

	// Fetch session-level accumulated telemetry
	const fetchTelemetry = useCallback(async () => {
		try {
			const res = await fetch("/api/telemetry");
			if (res.ok) {
				const data = await res.json();
				if (data.session) {
					setSessionTelemetry({
						sessionId: data.session.sessionId || "unknown",
						totalInputTokens: data.session.totalInputTokens || 0,
						totalOutputTokens: data.session.totalOutputTokens || 0,
						totalOperations: Array.isArray(data.session.operations)
							? data.session.operations.length
							: 0,
						sessionUptimeMs: data.session.sessionUptimeMs || 0,
						estimatorName: data.session.estimatorName || "o200k_base",
					});
				}
			}
		} catch (err) {
			console.error("Error fetching session telemetry:", err);
		}
	}, []);

	// Switch active connection target dynamically
	const handleSwitchTarget = useCallback(
		async (
			newTarget: string,
			type: "grpc" | "http" = (targetTypeRef.current as "grpc" | "http") ||
				"http",
			toolToSelect?: string,
		) => {
			setIsConnecting(true);
			try {
				if (type === "grpc") {
					setGrpcTarget(newTarget);
					setTargetType("grpc");
					const res = await fetch("/api/connect", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ type: "grpc", grpc: { target: newTarget } }),
					});
					if (!res.ok) {
						const data = await res.json();
						throw new Error(data.error || "Failed to connect to target");
					}
					setActiveConnectedTarget(newTarget);
				} else if (type === "http") {
					setHttpUrl(newTarget);
					setTargetType("http");
					const res = await fetch("/api/connect", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ type: "http", http: { url: newTarget } }),
					});
					if (!res.ok) {
						const data = await res.json();
						throw new Error(data.error || "Failed to connect to target");
					}
					setActiveConnectedTarget(newTarget);
				}
				await fetchHealth();
				await fetchTools();

				if (onTargetSwitchedRef.current && toolToSelect) {
					onTargetSwitchedRef.current(toolToSelect);
				}
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				onErrorRef.current?.({ title: "Target Switch Failed", desc: msg });
			} finally {
				setIsConnecting(false);
			}
		},
		[fetchHealth, fetchTools],
	);

	// Fetch mesh nodes & topology
	const fetchNodes = useCallback(
		async (force = false, silent = false) => {
			if (!silent) setIsScanning(true);
			try {
				const res = await fetch(`/api/nodes?force=${force}`);
				if (res.ok) {
					const data = await res.json();
					const fetchedNodes: ScannedNode[] = data.nodes || [];
					setNodes(fetchedNodes);
					setScanSummary(data.summary || null);
					setLastScanTimestamp(Date.now());
					setSecondsAgo(0);

					// Auto-connect to first online node with tools on initial load
					if (!hasAutoConnectedRef.current && fetchedNodes.length > 0) {
						const firstOnline = fetchedNodes.find(
							(n) => n.status === "online" && n.tools && n.tools.length > 0,
						);
						if (firstOnline) {
							hasAutoConnectedRef.current = true;
							const port = firstOnline.ports?.grpc ?? firstOnline.ports?.http;
							const type: "grpc" | "http" = firstOnline.ports?.grpc
								? "grpc"
								: "http";
							const targetStr =
								type === "grpc"
									? `${firstOnline.host}:${port}`
									: `http://${firstOnline.host}:${port}/mcp`;
							const initialTool = firstOnline.tools[0];
							handleSwitchTarget(targetStr, type, initialTool);
						}
					}
				}
			} catch (err) {
				console.error("Error scanning mesh nodes:", err);
			} finally {
				if (!silent) setIsScanning(false);
			}
		},
		[handleSwitchTarget],
	);

	// Connect / Probe Target from manual connection bar
	const handleConnectTarget = useCallback(async () => {
		setIsConnecting(true);
		try {
			// biome-ignore lint/suspicious/noExplicitAny: Target connection body
			const body: any = { type: targetType };
			if (targetType === "stdio") {
				const parts = stdioCmd.trim().split(/\s+/);
				body.stdio = { command: parts[0], args: parts.slice(1) };
			} else if (targetType === "http") {
				body.http = { url: httpUrl.trim() };
			} else if (targetType === "grpc") {
				body.grpc = { target: grpcTarget.trim() };
			} else if (targetType === "mesh") {
				body.mesh = {};
			}

			const res = await fetch("/api/connect", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Failed to connect to target");
			}

			setActiveConnectedTarget(
				targetType === "stdio"
					? stdioCmd
					: targetType === "http"
						? httpUrl
						: targetType === "grpc"
							? grpcTarget
							: "Audit Mesh (8 Nodes Swarm)",
			);

			await fetchHealth();
			await fetchTools();
			await fetchNodes(true);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			onErrorRef.current?.({ title: "Connection Failed", desc: msg });
		} finally {
			setIsConnecting(false);
		}
	}, [
		targetType,
		stdioCmd,
		httpUrl,
		grpcTarget,
		fetchHealth,
		fetchTools,
		fetchNodes,
	]);

	// Initial mount load (runs strictly once)
	useEffect(() => {
		fetchHealth();
		fetchTools();
		fetchNodes(true);
		fetchTelemetry();
	}, [fetchHealth, fetchTools, fetchNodes, fetchTelemetry]);

	// Background polling every 5s (health, nodes topology & telemetry)
	useEffect(() => {
		const interval = setInterval(() => {
			fetchHealth();
			fetchNodes(false, true);
			fetchTelemetry();
		}, 5000);
		return () => clearInterval(interval);
	}, [fetchHealth, fetchNodes, fetchTelemetry]);

	// Seconds counter tick
	useEffect(() => {
		const timer = setInterval(() => {
			setSecondsAgo(Math.floor((Date.now() - lastScanTimestamp) / 1000));
		}, 1000);
		return () => clearInterval(timer);
	}, [lastScanTimestamp]);

	return {
		network,
		version: network?.version || "1.0.0-alpha.5",
		tools,
		nodes,
		scanSummary,
		sessionTelemetry,
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
		lastScanTimestamp,
		secondsAgo,
		totalNodes,
		onlineNodes,
		hasNodeStats,
		fetchHealth,
		fetchTools,
		fetchNodes,
		fetchTelemetry,
		handleSwitchTarget,
		handleConnectTarget,
	};
}
