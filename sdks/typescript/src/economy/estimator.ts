import { log } from "../utils/logger.js";

/**
 * TokenEstimator — Pluggable strategy for counting tokens in text content.
 *
 * Implementations range from exact BPE tokenization to lightweight heuristics,
 * allowing the SDK to choose the best trade-off for the runtime environment.
 */
export interface TokenEstimator {
	/** Count the number of tokens in the given text */
	countTokens(text: string): number;
	/** Human-readable name of the estimation strategy */
	readonly name: string;
}

/**
 * Exact BPE tokenizer using o200k_base encoding.
 *
 * o200k_base is the standard encoding for all modern OpenAI models
 * (GPT-4o, GPT-4.1, o1, o3, o4) and provides a reasonable baseline
 * for Anthropic/Google models as well (~±5% variance).
 *
 * - Synchronous: safe for hot-path usage without async overhead
 * - Merge cache reduced to 10K entries for long-running server processes
 * - Zero runtime dependencies beyond gpt-tokenizer itself
 */
export class RealTokenEstimator implements TokenEstimator {
	readonly name = "o200k_base";

	private countFn: (text: string) => number;

	constructor(
		countFn: (text: string) => number,
		setMergeCacheSizeFn?: (size: number) => void,
	) {
		this.countFn = countFn;
		// Reduce merge cache from default 100K to 10K for server processes
		if (setMergeCacheSizeFn) {
			setMergeCacheSizeFn(10_000);
		}
	}

	countTokens(text: string): number {
		if (text.length === 0) return 0;
		return this.countFn(text);
	}
}

/**
 * Fallback heuristic estimator: ~4 characters per token.
 *
 * Industry-standard approximation (±10% for English/code content).
 * Used only when gpt-tokenizer fails to load in constrained environments.
 */
export class HeuristicTokenEstimator implements TokenEstimator {
	readonly name = "heuristic (chars/4)";

	countTokens(text: string): number {
		if (text.length === 0) return 0;
		return Math.ceil(text.length / 4);
	}
}

/**
 * Factory: creates a RealTokenEstimator with gpt-tokenizer,
 * falling back to HeuristicTokenEstimator if the import fails.
 *
 * Uses dynamic import to avoid blocking SDK initialization and to
 * gracefully degrade in environments where gpt-tokenizer is unavailable.
 */
export async function createTokenEstimator(): Promise<TokenEstimator> {
	try {
		const mod = await import("gpt-tokenizer");
		const estimator = new RealTokenEstimator(
			mod.countTokens,
			mod.setMergeCacheSize,
		);
		log.debug("[LIOP-Economy] Token estimator initialized: o200k_base");
		return estimator;
	} catch {
		log.info(
			"[LIOP-Economy] gpt-tokenizer unavailable, falling back to heuristic estimator",
		);
		return new HeuristicTokenEstimator();
	}
}

/**
 * Synchronous factory: creates a HeuristicTokenEstimator immediately.
 * Used when the async factory cannot be awaited (e.g., constructor contexts).
 * The engine should upgrade to the real estimator via setEstimator() later.
 */
export function createSyncTokenEstimator(): TokenEstimator {
	return new HeuristicTokenEstimator();
}
