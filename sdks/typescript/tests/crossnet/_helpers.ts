import { expect } from "vitest";

// In crossnet, the "agent" is the Nexus gateway (MCP HTTP endpoint).
const agentUrl = process.env.AGENT_URL || "http://127.0.0.1:13000";
const DEFAULT_RETRY_TIMEOUT_MS = 60_000;

type JsonRpcResponse = {
	jsonrpc: "2.0";
	id: number;
	result?: any;
	error?: { code: number; message: string };
};

export async function mcpCall(method: string, params: Record<string, unknown>, id = Date.now()): Promise<JsonRpcResponse> {
	const res = await fetchWithRetry(`${agentUrl}/mcp`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
	});

	expect(res.ok).toBe(true);
	return (await res.json()) as JsonRpcResponse;
}

export async function listTools(): Promise<Array<{ name: string }>> {
	const response = await mcpCall("tools/list", {}, 101);
	expect(response.error).toBeUndefined();
	expect(response.result).toBeDefined();
	return response.result.tools as Array<{ name: string }>;
}

export async function findToolByBaseName(baseName: string): Promise<string> {
	const deadline = Date.now() + DEFAULT_RETRY_TIMEOUT_MS;
	let lastTools: Array<{ name: string }> = [];
	let attempts = 0;

	while (Date.now() < deadline) {
		attempts += 1;
		lastTools = await listTools();
		const exact = lastTools.find((t) => t.name === baseName);
		if (exact) return exact.name;

		const suffixed = lastTools.find((t) => t.name.startsWith(`${baseName}_`));
		if (suffixed) return suffixed.name;

		// Force manifest refresh through the diagnostic path when discovery is lagging.
		if (attempts % 4 === 0) {
			await mcpCall(
				"tools/call",
				{
					name: "LiopMeshStatus",
					arguments: {},
				},
				1900 + attempts,
			).catch(() => {});
		}

		await sleep(500);
	}

	const names = lastTools.map((t) => t.name).sort().join(", ");
	throw new Error(`Tool not found in tools/list after timeout: ${baseName}. Last tools: [${names}]`);
}

export function liopEnvelope(logic: string, moduleName = "CrossnetLogic"): string {
	return [
		"LIOP_MAGIC:0x00FF",
		`MANIFEST:{"target":"wasi_v1","name":"${moduleName}","integrity_checks":true}`,
		"---BEGIN_LOGIC---",
		logic.trim(),
		"---END_LOGIC---",
	].join("\n");
}

export async function callTool(toolName: string, payload: string): Promise<any> {
	return await callToolWithRetry(toolName, payload);
}

export function extractText(result: any): string {
	const content = result?.content;
	if (!Array.isArray(content) || content.length === 0) return "";
	const text = content[0]?.text;
	return typeof text === "string" ? text : "";
}

export function parseJsonSafe<T = unknown>(input: string): T | null {
	try {
		return JSON.parse(input) as T;
	} catch {
		return null;
	}
}

export async function fetchWithRetry(
	url: string,
	init?: RequestInit,
	timeoutMs = DEFAULT_RETRY_TIMEOUT_MS,
): Promise<Response> {
	const deadline = Date.now() + timeoutMs;
	let lastError: unknown;

	while (Date.now() < deadline) {
		try {
			const res = await fetch(url, init);
			if (res.ok) return res;
			lastError = new Error(`HTTP ${res.status} for ${url}`);
		} catch (error) {
			lastError = error;
		}
		await sleep(500);
	}
	throw lastError instanceof Error ? lastError : new Error(`fetchWithRetry timeout for ${url}`);
}

export async function waitForHealthy(baseUrl: string): Promise<any> {
	const res = await fetchWithRetry(`${baseUrl}/health`, {
		headers: { Accept: "application/json" },
	});
	const body = await res.json();
	expect(body.status).toBe("healthy");
	return body;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callToolWithRetry(toolName: string, payload: string): Promise<any> {
	const deadline = Date.now() + DEFAULT_RETRY_TIMEOUT_MS;
	let lastResult: any = undefined;

	while (Date.now() < deadline) {
		const response = await mcpCall(
			"tools/call",
			{
				name: toolName,
				arguments: { payload },
			},
			202,
		);

		if (response.error) {
			const msg = `tools/call failed [${response.error.code}]: ${response.error.message}`;
			if (isTransient(msg)) {
				lastResult = { isError: true, content: [{ type: "text", text: msg }] };
				await sleep(750);
				continue;
			}
			throw new Error(msg);
		}

		lastResult = response.result;
		if (lastResult?.isError === true) {
			const text = extractText(lastResult);
			if (isTransient(text)) {
				await sleep(750);
				continue;
			}
		}

		return lastResult;
	}

	return lastResult;
}

function isTransient(message: string): boolean {
	return /PQC Handshake Failed|UNAVAILABLE|ECONNREFUSED|No connection established|timeout/i.test(
		message,
	);
}

