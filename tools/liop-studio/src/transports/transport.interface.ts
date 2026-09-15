// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import type { LiopTlsOptions } from "@nekzus/liop";

export type TargetTransportType = "stdio" | "http" | "grpc" | "mesh";

export interface TargetConnectionConfig {
	type: TargetTransportType;
	stdio?: {
		command: string;
		args?: string[];
		env?: Record<string, string>;
		cwd?: string;
	};
	http?: {
		url: string;
		authToken?: string;
	};
	grpc?: {
		target: string;
		useTls?: boolean;
		token?: string;
		tls?: LiopTlsOptions;
	};
	mesh?: {
		bootstrapNodes?: string[];
		swarmKey?: string | Uint8Array;
		nexusUrl?: string;
		clientId?: string;
		clientSecret?: string;
	};
}

export interface EnrichedTool {
	name: string;
	description?: string;
	inputSchema?: Record<string, unknown>;
	providerNode?: string;
	tier?: 1 | 2 | 3;
	domain?: string;
	isLiopEnabled?: boolean;
	taxonomy?: {
		domain?: string;
		clearanceTier?: string | number;
		executionTypes?: string[];
	};
}

export interface ScannedTargetNode {
	id: string;
	name: string;
	tier?: 1 | 2 | 3;
	tierLabel?: string;
	host: string;
	status: "online" | "offline" | "degraded";
	rttMs: number;
	peerId?: string;
	version: string;
	tools: string[];
	role?: string;
	isolation?: string;
	dataset?: string;
	ports?: { http?: number; p2p?: number; grpc?: number };
	multiaddrs?: string[];
	transportType?: TargetTransportType;
	error?: string;
}

export interface ScanReport {
	targetType: TargetTransportType;
	targetAddress: string;
	status: "online" | "offline" | "degraded";
	latencyMs: number;
	serverInfo?: { name: string; version: string };
	totalTools: number;
	tools: EnrichedTool[];
	nodes?: ScannedTargetNode[];
	timestamp: string;
	error?: string;
}

export interface ExecutionTelemetry {
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
}

export interface ExecutionResult {
	type: "result" | "error";
	payload: unknown;
	meta: {
		latencyMs: number;
		tool: string;
		verifiedZk?: boolean;
		zkHash?: string;
		shieldBlocked?: boolean;
		telemetry?: ExecutionTelemetry;
	};
}

export interface StudioTransport {
	readonly type: TargetTransportType;
	connect(): Promise<void>;
	disconnect(): Promise<void>;
	isConnected(): boolean;
	scan(): Promise<ScanReport>;
	listTools(): Promise<EnrichedTool[]>;
	callTool(
		name: string,
		args: Record<string, unknown>,
		envelope?: string,
		onStep?: (
			phase: string,
			detail: string,
			status: "pending" | "running" | "success" | "failed",
			durationMs?: number,
		) => Promise<void>,
	): Promise<ExecutionResult>;
}
