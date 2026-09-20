// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import type { AuditEntry } from "../security/audit-logger.js";

/**
 * Technology-agnostic cryptographic audit interceptor.
 *
 * Fires asynchronously (fire-and-forget) AFTER each AuditEntry
 * has been sealed (hash computed, chain linked, and optionally
 * persisted to JSONL). The interceptor receives a frozen deep-clone
 * of the completed AuditEntry — mutations cannot tamper with the
 * hash chain.
 *
 * Use cases: forward audit entries to TypeSafe Jev for threat
 * pattern detection, stream to SOC 2 SIEM aggregators, trigger
 * PagerDuty alerts on BLOCKED_EGRESS/POLICY_VIOLATION statuses,
 * or feed into compliance dashboards.
 */
export type AuditInterceptor = (
	entry: Readonly<AuditEntry>,
) => void | Promise<void>;
