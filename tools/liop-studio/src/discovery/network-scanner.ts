// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import type {
	EnrichedTool,
	ScannedTargetNode,
} from "../transports/transport.interface.js";

interface KnownNodeProfile {
	id: string;
	defaultName: string;
	grpcPort?: number;
	httpPort: number;
	tier: 1 | 2 | 3;
	tierLabel: string;
	role: string;
	isolation: string;
	dataset?: string;
	defaultTool?: string;
}

const DEFAULT_PRESET_PROFILES: KnownNodeProfile[] = [
	{
		id: "vault",
		defaultName: "The Vault (Clinical Enclave)",
		grpcPort: 15011,
		httpPort: 15013,
		tier: 1,
		tierLabel: "Tier 1: Sovereign Enclaves (In-Situ Origin)",
		role: "Clinical Healthcare & EHR Patient Records",
		isolation: "pnet Swarm Key (PSK) + HIPAA Strict Mode",
		dataset: "2,500 clinical EHR patient records",
		defaultTool: "Analyze_Synthetic_Medical_Records",
	},
	{
		id: "bank",
		defaultName: "The Bank (Financial Enclave)",
		grpcPort: 15021,
		httpPort: 15014,
		tier: 1,
		tierLabel: "Tier 1: Sovereign Enclaves (In-Situ Origin)",
		role: "Core Banking & Financial Settlement",
		isolation: "pnet Swarm Key (PSK) + Differential Privacy",
		dataset: "1,500 synthetic accounts ($148M balance)",
		defaultTool: "Analyze_Synthetic_Bank_Transactions",
	},
	{
		id: "blg",
		defaultName: "Border LIO Gateway (BLG)",
		grpcPort: 15051,
		httpPort: 15018,
		tier: 1,
		tierLabel: "Tier 1: Sovereign Enclaves (In-Situ Origin)",
		role: "Dual-NIC Perimeter Security Bridge (Tier 1 <-> Tier 2)",
		isolation: "6-Layer Zero-Trust + AST Guardian + Egress Shield",
		defaultTool: "BLG_Inspect_Enclave_Perimeter",
	},
	{
		id: "oracle",
		defaultName: "The Oracle (HFT Consortium)",
		grpcPort: 15031,
		httpPort: 15015,
		tier: 2,
		tierLabel: "Tier 2: Consortium Routing & Gateways",
		role: "Real-time High Frequency Trading Market Simulator",
		isolation: "Consortium Node + 50ms Tick Streaming Buffer",
		dataset: "8 Instruments + L2 Orderbook",
		defaultTool: "Analyze_HFT_Market_Data",
	},
	{
		id: "relay",
		defaultName: "P2P Circuit Relay Hub",
		httpPort: 15017,
		tier: 2,
		tierLabel: "Tier 2: Consortium Routing & Gateways",
		role: "Kademlia DHT & libp2p Circuit Relay v2 Node",
		isolation: "Public Swarm Mesh Relay",
		defaultTool: "LiopMeshStatus",
	},
	{
		id: "nexus",
		defaultName: "LIOP Nexus (OIDC & CA)",
		httpPort: 15000,
		tier: 2,
		tierLabel: "Tier 2: Consortium Routing & Gateways",
		role: "OAuth 2.1 RFC 8707 Auth Server & Mesh Authority",
		isolation: "Zero-Trust Identity Provider",
		defaultTool: "Authenticate_Client",
	},
	{
		id: "edge",
		defaultName: "Edge Industrial IoT",
		grpcPort: 15041,
		httpPort: 15016,
		tier: 3,
		tierLabel: "Tier 3: Public Backbone & Client Edge",
		role: "Edge Telemetry & Hostile 3G WAN Industrial Node",
		isolation: "WAN Jitter/Loss Resistant Client",
		dataset: "Edge Telemetry Sensors (Pressure, RPM, Temp)",
		defaultTool: "Analyze_IoT_Sensor_Data",
	},
];

export class NetworkDiscoveryEngine {
	private static instance: NetworkDiscoveryEngine;
	private customTargets = new Map<string, ScannedTargetNode>();

	public static getInstance(): NetworkDiscoveryEngine {
		if (!NetworkDiscoveryEngine.instance) {
			NetworkDiscoveryEngine.instance = new NetworkDiscoveryEngine();
		}
		return NetworkDiscoveryEngine.instance;
	}

	/**
	 * Register or update a custom target dynamically in the mesh topology.
	 */
	public registerCustomTarget(node: ScannedTargetNode): void {
		this.customTargets.set(node.id, node);
	}

	/**
	 * Retrieve all dynamically registered custom target nodes.
	 */
	public getCustomTargets(): ScannedTargetNode[] {
		return Array.from(this.customTargets.values());
	}

	/**
	 * Clear registered custom targets.
	 */
	public clearCustomTargets(): void {
		this.customTargets.clear();
	}

	/**
	 * Probe a specific HTTP/Health endpoint dynamically.
	 */
	public async probeHttpNode(
		host: string,
		port: number,
		timeoutMs = 1200,
	): Promise<{
		name?: string;
		version?: string;
		tier?: 1 | 2 | 3;
		peerId?: string;
		multiaddrs?: string[];
		tools?: string[];
		enrichedTools?: EnrichedTool[];
		rttMs: number;
	} | null> {
		const url = `http://${host}:${port}`;
		const t0 = performance.now();
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);

		try {
			// 1. Fetch Health metadata
			const res = await fetch(`${url}/health`, {
				headers: { Accept: "application/json" },
				signal: controller.signal,
			});
			if (!res.ok) return null;
			const data = await res.json();
			const rttMs = Math.max(1, Math.round(performance.now() - t0));

			const toolNames: string[] = Array.isArray(data.tools) ? data.tools : [];

			// 2. Fetch full tool schemas via MCP tools/list
			let enrichedTools: EnrichedTool[] = [];
			try {
				const mcpRes = await fetch(`${url}/mcp`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						jsonrpc: "2.0",
						method: "tools/list",
						id: 1,
					}),
					signal: controller.signal,
				});
				if (mcpRes.ok) {
					const mcpData = await mcpRes.json();
					if (mcpData.result?.tools) {
						enrichedTools = mcpData.result.tools.map(
							// biome-ignore lint/suspicious/noExplicitAny: MCP tool shape
							(t: any) => ({
								name: t.name,
								description: t.description || "",
								inputSchema: t.inputSchema || {},
								providerNode: data.node?.name || `Node ${port}`,
								tier: data.topology?.tier || 1,
								isLiopEnabled: true,
							}),
						);
					}
				}
			} catch {
				// Non-fatal if /mcp tools/list fails, toolNames from /health will still be used
			}

			return {
				name: data.node?.name,
				version: data.node?.version,
				tier: data.topology?.tier,
				peerId: data.mesh?.peerId,
				multiaddrs: data.mesh?.multiaddrs,
				tools: toolNames,
				enrichedTools: enrichedTools.length > 0 ? enrichedTools : undefined,
				rttMs,
			};
		} catch {
			return null;
		} finally {
			clearTimeout(timer);
		}
	}

	/**
	 * Dynamically discover all active servers across the target host network.
	 */
	public async scanNetwork(host = "127.0.0.1"): Promise<ScannedTargetNode[]> {
		const resultsMap = new Map<string, ScannedTargetNode>();

		// 1. Probe preset demo profiles when targeting localhost / 127.0.0.1
		const isLocalhost =
			host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0";

		if (isLocalhost) {
			const probePromises = DEFAULT_PRESET_PROFILES.map(async (profile) => {
				const probe = await this.probeHttpNode(host, profile.httpPort);
				if (probe) {
					const rawName = probe.name || profile.defaultName;
					const cleanName = rawName.startsWith("PRODUCTION-")
						? rawName
								.replace("PRODUCTION-", "")
								.replace(/-/g, " ")
								.toUpperCase()
						: rawName;

					resultsMap.set(profile.id, {
						id: profile.id,
						name: cleanName || profile.defaultName,
						tier: (probe.tier as 1 | 2 | 3) || profile.tier,
						tierLabel: profile.tierLabel,
						host,
						ports: {
							http: profile.httpPort,
							grpc: profile.grpcPort,
						},
						status: "online",
						rttMs: probe.rttMs,
						peerId: probe.peerId || `peer-${profile.id}`,
						multiaddrs: probe.multiaddrs || [],
						version: probe.version || "2.5.0",
						tools: probe.tools && probe.tools.length > 0 ? probe.tools : [],
						role: profile.role,
						isolation: profile.isolation,
						dataset: profile.dataset,
						transportType: profile.grpcPort ? "grpc" : "http",
					});
				} else {
					// Node is strictly offline
					resultsMap.set(profile.id, {
						id: profile.id,
						name: profile.defaultName,
						tier: profile.tier,
						tierLabel: profile.tierLabel,
						host,
						ports: {
							http: profile.httpPort,
							grpc: profile.grpcPort,
						},
						status: "offline",
						rttMs: 0,
						peerId: `peer-${profile.id}`,
						multiaddrs: [],
						version: "2.5.0",
						tools: [],
						role: profile.role,
						isolation: profile.isolation,
						dataset: profile.dataset,
						transportType: profile.grpcPort ? "grpc" : "http",
					});
				}
			});

			await Promise.allSettled(probePromises);
		}

		// 2. Merge all registered custom targets
		for (const [id, customNode] of this.customTargets.entries()) {
			resultsMap.set(id, customNode);
		}

		const results = Array.from(resultsMap.values());

		// Sort by online status first, then by tier if present, then RTT
		return results.sort((a, b) => {
			if (a.status !== b.status) return a.status === "online" ? -1 : 1;
			if (a.tier !== undefined && b.tier !== undefined && a.tier !== b.tier) {
				return a.tier - b.tier;
			}
			if (a.tier !== undefined && b.tier === undefined) return -1;
			if (a.tier === undefined && b.tier !== undefined) return 1;
			return a.rttMs - b.rttMs;
		});
	}

	/**
	 * Find the associated HTTP probe info for a given gRPC target address.
	 */
	public async resolveNodeForGrpcTarget(
		targetAddress: string,
		latencyMs: number,
		status: "online" | "offline" | "degraded",
	): Promise<{
		node: ScannedTargetNode;
		tools: EnrichedTool[];
	}> {
		const [hostPart, portPart] = targetAddress.split(":");
		const host = hostPart || "127.0.0.1";
		const grpcPort = Number(portPart) || 50051;

		// Match preset profile by grpcPort
		const matchedProfile = DEFAULT_PRESET_PROFILES.find(
			(p) => p.grpcPort === grpcPort,
		);

		if (matchedProfile) {
			const probe = await this.probeHttpNode(host, matchedProfile.httpPort);
			const isOnline =
				status === "online" ||
				(Boolean(probe?.tools) && (probe?.tools?.length ?? 0) > 0);
			const nodeName =
				probe?.name?.replace("PRODUCTION-", "").replace(/-/g, " ") ||
				matchedProfile.defaultName;

			const defaultTools = matchedProfile.defaultTool
				? [matchedProfile.defaultTool]
				: ["Execute_WASI_Logic"];

			const tools = isOnline
				? probe?.tools && probe.tools.length > 0
					? probe.tools
					: defaultTools
				: [];
			const enriched =
				isOnline && probe?.enrichedTools && probe.enrichedTools.length > 0
					? probe.enrichedTools
					: tools.map((t) => ({
							name: t,
							description: `Discovered capability hosted on ${nodeName}`,
							providerNode: `${nodeName} (${targetAddress})`,
							tier: (probe?.tier as 1 | 2 | 3) || matchedProfile.tier,
							isLiopEnabled: true,
						}));

			const node: ScannedTargetNode = {
				id: matchedProfile.id,
				name: nodeName,
				tier: (probe?.tier as 1 | 2 | 3) || matchedProfile.tier,
				tierLabel: matchedProfile.tierLabel,
				host,
				ports: {
					grpc: grpcPort,
					http: matchedProfile.httpPort,
				},
				status: isOnline ? status : "offline",
				rttMs: isOnline ? probe?.rttMs || latencyMs : 0,
				peerId: probe?.peerId || `peer-${matchedProfile.id}`,
				multiaddrs: probe?.multiaddrs || [],
				version: probe?.version || "2.5.0",
				tools,
				role: matchedProfile.role,
				isolation: matchedProfile.isolation,
				dataset: matchedProfile.dataset,
				transportType: "grpc",
			};

			this.registerCustomTarget(node);
			return { node, tools: enriched };
		}

		// Fallback for custom/arbitrary gRPC address
		const customNode: ScannedTargetNode = {
			id: `grpc-${grpcPort}`,
			name: `gRPC Target (${targetAddress})`,
			tierLabel: "Direct Compute Target",
			host,
			ports: { grpc: grpcPort },
			status,
			rttMs: status === "online" ? latencyMs : 0,
			tools: status === "online" ? ["Execute_WASI_Logic"] : [],
			version: "2.5.0",
			role: "Direct Native gRPC Compute Node",
			isolation: "WASI / Isolate Compute Sandbox",
			transportType: "grpc",
		};

		this.registerCustomTarget(customNode);

		return {
			node: customNode,
			tools:
				status === "online"
					? [
							{
								name: "Execute_WASI_Logic",
								description: `Direct Logic-on-Origin compute execution on ${targetAddress}`,
								providerNode: `gRPC Node (${targetAddress})`,
								isLiopEnabled: true,
							},
						]
					: [],
		};
	}
}
