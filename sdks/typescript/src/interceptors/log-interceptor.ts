// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import type { LogLevel } from "../utils/logger.js";

/**
 * Structured snapshot of an operational log event.
 * Frozen copy — mutations have no effect on the logger.
 */
export interface LogEvent {
	/** ISO 8601 timestamp of the log emission. */
	timestamp: string;
	/** Severity level that triggered this event. */
	level: LogLevel;
	/** Formatted log message (already interpolated by LiopLogger). */
	message: string;
	/** Additional variadic arguments passed to the log method. */
	args: readonly unknown[];
}

/**
 * Technology-agnostic operational log interceptor.
 *
 * Fires asynchronously (fire-and-forget) after each log emission
 * that passes the current level filter. The interceptor receives
 * a frozen snapshot of the log event. Errors thrown by the
 * interceptor are caught silently and never propagate to the caller.
 *
 * Use cases: forward logs to TypeSafe Jev for anomaly detection,
 * stream to a SIEM (Splunk, Datadog), aggregate in NotebookLM,
 * or persist to a custom observability backend.
 */
export type LogInterceptor = (
	event: Readonly<LogEvent>,
) => void | Promise<void>;
