import { log } from "../utils/logger.js";

/** Single MCP operation token footprint */
export interface TokenOperationMetric {
	readonly type: "tools_list" | "tool_call" | "resource_read" | "prompt_get";
	readonly method: string;
	readonly estimatedInputTokens: number;
	readonly estimatedOutputTokens: number;
	readonly timestamp: number;
}

/** Session-level aggregate report */
export interface TokenSessionReport {
	readonly sessionId: string;
	readonly operations: ReadonlyArray<TokenOperationMetric>;
	readonly totalInputTokens: number;
	readonly totalOutputTokens: number;
}

/**
 * TokenTelemetryEngine — Observational singleton for token cost measurement.
 *
 * Design principles:
 * - Pure observer pattern: NEVER mutates MCP payloads or protocol flow.
 * - Heuristic estimation: ~4 chars/token (±10% accuracy for English text).
 * - Scalable interface: Ready for future dashboard/webhook extensions.
 */
export class TokenTelemetryEngine {
	private static instance: TokenTelemetryEngine | null = null;
	private operations: TokenOperationMetric[] = [];
	private readonly sessionId: string;

	private constructor() {
		this.sessionId = crypto.randomUUID();
	}

	static getInstance(): TokenTelemetryEngine {
		if (!TokenTelemetryEngine.instance) {
			TokenTelemetryEngine.instance = new TokenTelemetryEngine();
		}
		return TokenTelemetryEngine.instance;
	}

	/** Record a single MCP operation's token footprint */
	record(metric: Omit<TokenOperationMetric, "timestamp">): void {
		this.operations.push({ ...metric, timestamp: Date.now() });
		log.debug(
			`[LIOP-Economy] Recorded ${metric.type}: ~${metric.estimatedInputTokens} in / ~${metric.estimatedOutputTokens} out`,
		);
	}

	/**
	 * Heuristic token estimation: ~4 chars per token.
	 * Industry-standard approximation sufficient for internal SDK telemetry.
	 * Accuracy: ±10% for English/code content.
	 */
	estimateTokens(content: string): number {
		return Math.ceil(content.length / 4);
	}

	/** Generate the full session report */
	getReport(): TokenSessionReport {
		return {
			sessionId: this.sessionId,
			operations: [...this.operations],
			totalInputTokens: this.operations.reduce(
				(sum, op) => sum + op.estimatedInputTokens,
				0,
			),
			totalOutputTokens: this.operations.reduce(
				(sum, op) => sum + op.estimatedOutputTokens,
				0,
			),
		};
	}

	/**
	 * Format a human-readable summary block for LiopMeshStatus diagnostic.
	 * Returns empty string when no operations have been recorded,
	 * ensuring zero overhead on the status output by default.
	 */
	formatStatusBlock(): string {
		const report = this.getReport();
		if (report.operations.length === 0) return "";
		return [
			"\nToken Economy:",
			`├─ Session: ${report.sessionId.slice(0, 8)}`,
			`├─ Operations: ${report.operations.length}`,
			`├─ Est. Input Tokens: ${report.totalInputTokens.toLocaleString()}`,
			`└─ Est. Output Tokens: ${report.totalOutputTokens.toLocaleString()}`,
		].join("\n");
	}

	/** Reset all recorded metrics (used in tests) */
	reset(): void {
		this.operations = [];
	}

	/** Destroy the singleton (used in tests to guarantee isolation) */
	static destroy(): void {
		TokenTelemetryEngine.instance = null;
	}
}
