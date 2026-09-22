// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useRef, useState } from "react";
import type { ExecutionMeta, TimelineStep } from "../types";

export interface ExecutionHistoryEntry {
	id: string;
	tool: string;
	mode: "logic" | "form";
	timestamp: number;
	durationMs?: number;
	status: "success" | "error" | "cancelled";
	result?: Record<string, unknown> | null;
	meta?: ExecutionMeta | null;
	errorAlert?: { title: string; desc: string } | null;
	timeline: TimelineStep[];
}

const INITIAL_TIMELINE: TimelineStep[] = [
	{
		phase: "bootstrap",
		label: "P2P Mesh Bootstrap",
		detail: "Node synchronized",
		status: "pending",
	},
	{
		phase: "discovery",
		label: "Resource Discovery",
		detail: "Multi-tier route resolution",
		status: "pending",
	},
	{
		phase: "pqc",
		label: "Kyber-768 Handshake",
		detail: "ML-KEM key exchange",
		status: "pending",
	},
	{
		phase: "sealing",
		label: "AES-256-GCM Sealing",
		detail: "Envelope cipher & sign",
		status: "pending",
	},
	{
		phase: "execution",
		label: "WASI Sandbox Run",
		detail: "Logic injection on origin",
		status: "pending",
	},
	{
		phase: "zk_verify",
		label: "ZK-Receipt HMAC Seal",
		detail: "Computational integrity proof",
		status: "pending",
	},
];

interface ExecuteParams {
	targetTool: string;
	executionMode: "logic" | "form";
	code: string;
	// biome-ignore lint/suspicious/noExplicitAny: form arguments
	formArgs: Record<string, any>;
	targetType: string;
}

export function useStudioExecution() {
	const [isRunning, setIsRunning] = useState(false);
	const [result, setResult] = useState<Record<string, unknown> | null>(null);
	const [meta, setMeta] = useState<ExecutionMeta | null>(null);
	const [errorAlert, setErrorAlert] = useState<{
		title: string;
		desc: string;
	} | null>(null);
	const [timeline, setTimeline] = useState<TimelineStep[]>(INITIAL_TIMELINE);
	const [executionHistory, setExecutionHistory] = useState<
		ExecutionHistoryEntry[]
	>([]);

	const abortControllerRef = useRef<AbortController | null>(null);

	const updateTimelineStep = useCallback(
		(
			phase: string,
			detail: string,
			status: "pending" | "running" | "success" | "failed",
			durationMs?: number,
		) => {
			setTimeline((prev) => {
				let phaseFound = false;
				return prev.map((step) => {
					if (step.phase === phase) {
						phaseFound = true;
						return {
							...step,
							status,
							detail,
							durationMs: durationMs ?? step.durationMs,
						};
					}
					if (
						phaseFound &&
						step.status !== "success" &&
						step.status !== "failed"
					) {
						return { ...step, status: "pending" };
					}
					if (
						!phaseFound &&
						(step.status === "pending" || step.status === "running")
					) {
						return { ...step, status: "success" };
					}
					return step;
				});
			});
		},
		[],
	);

	const cancelExecution = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
	}, []);

	const handleExecute = useCallback(
		async (params: ExecuteParams) => {
			const { targetTool, executionMode, code, formArgs, targetType } = params;
			if (!targetTool || isRunning) return;

			// Abort any prior in-flight execution
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
			const controller = new AbortController();
			abortControllerRef.current = controller;

			setIsRunning(true);
			setResult(null);
			setMeta(null);
			setErrorAlert(null);

			const executionStartTime = Date.now();
			const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

			const initialRunTimeline: TimelineStep[] = [
				{
					phase: "bootstrap",
					label: "Channel Bootstrap",
					detail: `Target transport: ${targetType.toUpperCase()}`,
					status: "running",
				},
				{
					phase: "discovery",
					label: "Resource Discovery",
					detail: `Targeting tool ${targetTool}...`,
					status: "pending",
				},
				{
					phase: "pqc",
					label: "Kyber-768 / Channel Security",
					detail: "Securing transport session...",
					status: "pending",
				},
				{
					phase: "sealing",
					label: "Payload Sealing",
					detail: "Encrypting parameters & payload...",
					status: "pending",
				},
				{
					phase: "execution",
					label: "Origin / Sandbox Execution",
					detail: "Executing inside target environment...",
					status: "pending",
				},
				{
					phase: "zk_verify",
					label: "ZK-Receipt HMAC Seal",
					detail: "Cryptographic proof validation...",
					status: "pending",
				},
			];
			setTimeline(initialRunTimeline);

			let finalResult: Record<string, unknown> | null = null;
			let finalMeta: ExecutionMeta | null = null;
			let finalError: { title: string; desc: string } | null = null;
			let outcomeStatus: "success" | "error" | "cancelled" = "success";

			try {
				const reqBody =
					executionMode === "form"
						? { tool: targetTool, args: formArgs }
						: { tool: targetTool, logic: code };

				const response = await fetch("/api/execute", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(reqBody),
					signal: controller.signal,
				});

				if (!response.ok) {
					throw new Error(`Gateway error: ${response.statusText}`);
				}

				const reader = response.body?.getReader();
				if (!reader) {
					throw new Error("Unable to initialize SSE stream reader");
				}

				const decoder = new TextDecoder();
				let buffer = "";

				while (true) {
					const { value, done } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						if (!line.trim()) continue;

						if (line.startsWith("data: ")) {
							const dataStr = line.slice(6);
							try {
								const event = JSON.parse(dataStr);

								if (event.type === "step") {
									updateTimelineStep(
										event.phase,
										event.detail,
										event.status,
										event.durationMs,
									);
								} else if (event.type === "result") {
									finalResult = event.payload;
									finalMeta = event.meta || null;
									outcomeStatus = "success";
									setResult(finalResult);
									setMeta(finalMeta);
									setIsRunning(false);
								} else if (event.type === "error") {
									finalError = {
										title: event.payload.title || "Execution Error",
										desc:
											event.payload.desc ||
											"A sandbox failure occurred on origin node",
									};
									finalMeta = event.meta || null;
									outcomeStatus = "error";
									setErrorAlert(finalError);
									setMeta(finalMeta);
									setIsRunning(false);
								}
							} catch (e) {
								console.error("Error parsing SSE line:", e, line);
							}
						}
					}
				}
			} catch (err: unknown) {
				const isAbort =
					controller.signal.aborted ||
					(err instanceof Error && err.name === "AbortError");

				if (isAbort) {
					outcomeStatus = "cancelled";
					finalError = {
						title: "Execution Cancelled",
						desc: "The in-flight origin execution was terminated by user request.",
					};
					setErrorAlert(finalError);
					setTimeline((prev) =>
						prev.map((step) =>
							step.status === "running"
								? {
										...step,
										status: "failed",
										detail: "Cancelled by user abort",
									}
								: step,
						),
					);
				} else {
					outcomeStatus = "error";
					const errMsg = err instanceof Error ? err.message : String(err);
					finalError = {
						title: "Connection Error",
						desc: errMsg || "Failed to communicate with Studio Gateway",
					};
					setErrorAlert(finalError);
					setTimeline((prev) =>
						prev.map((step) =>
							step.status === "running"
								? {
										...step,
										status: "failed",
										detail: "Connection interrupted",
									}
								: step,
						),
					);
				}
				setIsRunning(false);
			} finally {
				abortControllerRef.current = null;
				// Record entry in session history (capped to last 20 executions)
				setExecutionHistory((prev) => [
					{
						id: executionId,
						tool: targetTool,
						mode: executionMode,
						timestamp: executionStartTime,
						durationMs: Date.now() - executionStartTime,
						status: outcomeStatus,
						result: finalResult,
						meta: finalMeta,
						errorAlert: finalError,
						timeline: initialRunTimeline,
					},
					...prev.slice(0, 19),
				]);
			}
		},
		[isRunning, updateTimelineStep],
	);

	const selectHistoryEntry = useCallback((entry: ExecutionHistoryEntry) => {
		setResult(entry.result || null);
		setMeta(entry.meta || null);
		setErrorAlert(entry.errorAlert || null);
		if (entry.timeline && entry.timeline.length > 0) {
			setTimeline(entry.timeline);
		}
	}, []);

	const clearHistory = useCallback(() => {
		setExecutionHistory([]);
	}, []);

	const resetExecution = useCallback(() => {
		setResult(null);
		setMeta(null);
		setErrorAlert(null);
		setTimeline(INITIAL_TIMELINE);
	}, []);

	return {
		isRunning,
		result,
		meta,
		errorAlert,
		setErrorAlert,
		timeline,
		executionHistory,
		selectHistoryEntry,
		clearHistory,
		handleExecute,
		cancelExecution,
		resetExecution,
		updateTimelineStep,
	};
}
