// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

export interface Tool {
	name: string;
	description?: string;
	providerNode?: string;
	tier?: 1 | 2 | 3;
	domain?: string;
	taxonomy?: {
		domain?: string;
		clearanceTier?: string | number;
		executionTypes?: string[];
	};
	inputSchema?: unknown;
}

export interface NetworkInfo {
	status: string;
	peerId: string;
	peersCount: number;
	role: string;
	address: string;
	version?: string;
	toolsCount?: number;
	nodesOnline?: number;
	totalNodes?: number;
}

export interface ScannedNode {
	id: string;
	name: string;
	tier?: 1 | 2 | 3;
	tierLabel?: string;
	host: string;
	ports?: { http?: number; p2p?: number; grpc?: number };
	role?: string;
	isolation?: string;
	dataset?: string;
	status: "online" | "offline" | "degraded";
	rttMs: number;
	peerId?: string;
	multiaddrs?: string[];
	tools: string[];
	version: string;
	transportType?: "grpc" | "http" | "stdio" | "mesh";
	error?: string;
}

export interface ScanSummary {
	totalNodes: number;
	onlineNodes: number;
	offlineNodes: number;
	byTier: {
		tier1: number;
		tier2: number;
		tier3: number;
		standalone?: number;
	};
	avgLatencyMs: number;
	lastScanTime?: string;
}

export interface TimelineStep {
	phase: string;
	label: string;
	detail: string;
	status: "pending" | "running" | "success" | "failed";
	durationMs?: number;
}

export interface ExecutionMeta {
	latencyMs?: number;
	tool?: string;
	verifiedZk?: boolean;
	zkHash?: string;
	shieldBlocked?: boolean;
	telemetry?: {
		fuel?: {
			consumed: number;
			maxLimit: number;
			percentUsed: number;
			deterministicAst: boolean;
		};
		tokens?: {
			inputTokens: number;
			outputTokens: number;
			totalTokens: number;
			traditionalContextTokens?: number;
			savingsPercent?: number;
			estimatorName: string;
			otelEmitted: boolean;
		};
		bandwidth?: {
			payloadBytes: number;
			rawDatasetProtectedBytes?: number;
			egressReductionPercent?: number;
		};
		proof?: {
			zkReceiptHash: string;
			pqcSuite: string;
			sealingCipher: string;
			wasiSandboxIsolation: string;
			timingSideChannelProtection: string;
		};
		phases?: {
			discoveryMs?: number;
			pqcMs?: number;
			sealingMs?: number;
			wasiSandboxMs?: number;
			zkVerificationMs?: number;
			totalLatencyMs: number;
		};
	};
}

export interface CanonicalTemplate {
	id: string;
	name: string;
	tool: string;
	domain: string;
	clearanceTier: string;
	description: string;
	code: string;
}

export interface SessionTelemetry {
	sessionId: string;
	totalInputTokens: number;
	totalOutputTokens: number;
	totalOperations: number;
	sessionUptimeMs: number;
	estimatorName: string;
}
