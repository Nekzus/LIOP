// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import type { LogInterceptor } from "../interceptors/log-interceptor.js";

export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

/**
 * LiopLogger - Structured Logging Abstraction
 * Configurable via `process.env.LIOP_LOG_LEVEL`.
 * Emits strictly to stderr to comply with MCP stdio protocols.
 */
export class LiopLogger {
	private static instance: LiopLogger;
	private level: LogLevel = "info";
	private interceptor?: LogInterceptor;
	private _isIntercepting = false;

	private constructor() {
		this.setLevelFromEnv();
	}

	public static getInstance(): LiopLogger {
		if (!LiopLogger.instance) {
			LiopLogger.instance = new LiopLogger();
		}
		return LiopLogger.instance;
	}

	private setLevelFromEnv() {
		const envLevel = process.env.LIOP_LOG_LEVEL?.toLowerCase();
		if (
			envLevel === "silent" ||
			envLevel === "error" ||
			envLevel === "warn" ||
			envLevel === "info" ||
			envLevel === "debug"
		) {
			this.level = envLevel as LogLevel;
		} else {
			// Default level: info
			this.level = "info";
		}
	}

	public setLevel(level: LogLevel) {
		this.level = level;
	}

	/**
	 * Registers a technology-agnostic log interceptor.
	 * Pass `undefined` to disable interception (zero overhead).
	 */
	public setInterceptor(interceptor: LogInterceptor | undefined) {
		this.interceptor = interceptor;
	}

	private shouldLog(targetLevel: LogLevel): boolean {
		const levels: Record<LogLevel, number> = {
			silent: 0,
			error: 1,
			warn: 2,
			info: 3,
			debug: 4,
		};
		return levels[this.level] >= levels[targetLevel];
	}

	private formatMessage(level: string, message: string): string {
		const ts = new Date().toISOString();
		return `[${ts}] [${level}] ${message}`;
	}

	/**
	 * Fire-and-forget async dispatch to the registered interceptor.
	 * Recursion guard prevents infinite loops when the interceptor
	 * itself triggers logging (directly or transitively).
	 */
	private emitToInterceptor(
		level: LogLevel,
		formattedMessage: string,
		args: unknown[],
	): void {
		if (!this.interceptor || this._isIntercepting) return;
		this._isIntercepting = true;
		const event: Readonly<{
			timestamp: string;
			level: LogLevel;
			message: string;
			args: readonly unknown[];
		}> = Object.freeze({
			timestamp: new Date().toISOString(),
			level,
			message: formattedMessage,
			args: Object.freeze([...args]),
		});
		try {
			const result = this.interceptor(event);
			if (result && typeof result === "object" && "catch" in result) {
				(result as Promise<void>).catch(() => {});
			}
		} catch {
			// Interceptor errors are silenced to protect protocol throughput
		} finally {
			this._isIntercepting = false;
		}
	}

	public error(message: string, ...args: unknown[]) {
		if (this.shouldLog("error")) {
			const formatted = this.formatMessage("ERROR", message);
			console.error(formatted, ...args);
			this.emitToInterceptor("error", formatted, args);
		}
	}

	public warn(message: string, ...args: unknown[]) {
		if (this.shouldLog("warn")) {
			const formatted = this.formatMessage("WARN", message);
			console.error(formatted, ...args);
			this.emitToInterceptor("warn", formatted, args);
		}
	}

	public info(message: string, ...args: unknown[]) {
		if (this.shouldLog("info")) {
			const formatted = this.formatMessage("INFO", message);
			console.error(formatted, ...args);
			this.emitToInterceptor("info", formatted, args);
		}
	}

	public debug(message: string, ...args: unknown[]) {
		if (this.shouldLog("debug")) {
			const formatted = this.formatMessage("DEBUG", message);
			console.error(formatted, ...args);
			this.emitToInterceptor("debug", formatted, args);
		}
	}
}

export const log = LiopLogger.getInstance();
