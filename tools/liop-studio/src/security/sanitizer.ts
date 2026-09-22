// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * Security Sanitizer & Guardrails (CWE-78, CWE-918, DNS Rebinding)
 */

const FORBIDDEN_SHELL_CHARS = /[;&|`$<>\r\n]/;
const BLOCKED_SSRF_HOSTS = [
	"169.254.169.254", // AWS/Azure/GCP metadata
	"metadata.google.internal",
	"instance-data",
	"100.100.100.200", // Alibaba cloud metadata
];

/**
 * Validates and sanitizes a subprocess executable name (CWE-78 defense).
 * Strictly forbids shell metacharacters and ensures shell: false execution.
 */
export function sanitizeCommand(command: string, args: string[] = []): string {
	const trimmed = command.trim();
	if (!trimmed) {
		throw new Error("[Security] Command cannot be empty.");
	}

	if (FORBIDDEN_SHELL_CHARS.test(trimmed)) {
		throw new Error(
			`[Security CWE-78] Command "${trimmed}" contains forbidden shell metacharacters. Direct execution prohibited.`,
		);
	}

	for (const arg of args) {
		if (FORBIDDEN_SHELL_CHARS.test(arg)) {
			throw new Error(
				`[Security CWE-78] Argument "${arg}" contains forbidden shell metacharacters. Direct execution prohibited.`,
			);
		}
	}

	return trimmed;
}

/**
 * Validates an HTTP target URL against SSRF and cloud metadata exfiltration (CWE-918).
 */
export function validateHttpTarget(targetUrl: string): URL {
	let parsed: URL;
	try {
		parsed = new URL(targetUrl);
	} catch (_err) {
		throw new Error(`[Security CWE-918] Invalid URL format: "${targetUrl}"`);
	}

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error(
			`[Security CWE-918] Unsupported protocol: "${parsed.protocol}". Must be http: or https:`,
		);
	}

	const hostname = parsed.hostname.toLowerCase();
	if (BLOCKED_SSRF_HOSTS.includes(hostname)) {
		throw new Error(
			`[Security CWE-918] Target "${hostname}" blocked: Access to link-local metadata address is strictly prohibited.`,
		);
	}

	return parsed;
}

export const sanitizeUrl = validateHttpTarget;

/**
 * Validates Host headers to prevent DNS Rebinding attacks on local ports.
 * Supports IPv4, localhost and IPv6 loopback ([::1] / ::1).
 */
export function validateHostHeader(
	host: string | undefined,
	allowedHosts: string[] = [
		"localhost",
		"127.0.0.1",
		"0.0.0.0",
		"::1",
		"[::1]",
	],
): boolean {
	if (!host) return false;
	const trimmed = host.trim();
	let hostname: string;
	if (trimmed.startsWith("[")) {
		const closingIndex = trimmed.indexOf("]");
		hostname =
			closingIndex !== -1 ? trimmed.slice(0, closingIndex + 1) : trimmed;
	} else if (
		trimmed.includes(":") &&
		trimmed.indexOf(":") !== trimmed.lastIndexOf(":")
	) {
		// Multiple colons without brackets indicate raw IPv6 address (e.g. ::1)
		hostname = trimmed;
	} else {
		hostname = trimmed.split(":")[0];
	}
	hostname = hostname.toLowerCase();
	return allowedHosts.some((allowed) => {
		const normAllowed = allowed.toLowerCase();
		return (
			normAllowed === hostname ||
			(hostname === "[::1]" && normAllowed === "::1") ||
			(hostname === "::1" && normAllowed === "[::1]")
		);
	});
}
