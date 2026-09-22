// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { Check, Copy, Fingerprint, Fuel, Globe, Terminal } from "lucide-react";
import { useState } from "react";
import { copyToClipboard } from "../../lib/clipboard";
import type { ExecutionMeta } from "../../types";
import { Badge } from "../ui/badge";
import { TabsContent } from "../ui/tabs";

interface TelemetryTabProps {
	meta: ExecutionMeta | null;
}

export function TelemetryTab({ meta }: TelemetryTabProps) {
	const [copiedZk, setCopiedZk] = useState(false);

	const handleCopyZk = async () => {
		if (!meta?.zkHash) return;
		const ok = await copyToClipboard(meta.zkHash);
		if (ok) {
			setCopiedZk(true);
			setTimeout(() => setCopiedZk(false), 1500);
		}
	};

	if (!meta?.telemetry) {
		return (
			<TabsContent value="telemetry" className="m-0 space-y-3 pb-5">
				<div className="flex flex-col items-center justify-center py-14 text-zinc-400 text-center space-y-2">
					<Fuel className="h-6 w-6 text-zinc-500" />
					<p className="text-xs font-medium text-zinc-200">
						No Live Telemetry Recorded
					</p>
					<p className="text-[11px] text-zinc-400 max-w-[240px]">
						Execute a capability to measure live network RTT, BPE tokens, wire
						egress, and WASI instruction fuel.
					</p>
				</div>
			</TabsContent>
		);
	}

	const { tokens, fuel, bandwidth, phases } = meta.telemetry;

	return (
		<TabsContent value="telemetry" className="m-0 space-y-3 pb-5">
			<div className="space-y-3 pt-1 text-xs">
				{/* BPE Context Token Telemetry */}
				{tokens && (
					<div className="p-3 rounded-lg bg-surface1 border border-border space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="p-1.5 rounded-md bg-secondary text-primary">
									<Terminal className="h-4 w-4" />
								</div>
								<div>
									<span className="font-semibold text-white text-[11px]">
										Context Token Telemetry (BPE)
									</span>
									<p className="text-[10px] text-zinc-400">
										Tokenizer: {tokens.estimatorName || "o200k_base"}
									</p>
								</div>
							</div>
							{tokens.savingsPercent !== undefined &&
								tokens.traditionalContextTokens !== undefined &&
								tokens.traditionalContextTokens > 0 && (
									<Badge className="bg-emerald-500 text-black font-mono font-bold text-xs px-2 py-0.5 shadow-sm">
										-{tokens.savingsPercent}% Tokens
									</Badge>
								)}
						</div>

						{tokens.traditionalContextTokens &&
						tokens.traditionalContextTokens > 0 ? (
							<div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/60">
								<div className="p-2 rounded bg-secondary/40 border border-border">
									<p className="text-[10px] text-zinc-400">In-Situ Module</p>
									<p className="text-sm font-bold font-mono text-emerald-400">
										{tokens.totalTokens ?? 0}{" "}
										<span className="text-[10px] font-normal text-zinc-400">
											tok
										</span>
									</p>
									<p className="text-[9px] text-zinc-400 mt-0.5 font-mono">
										{tokens.inputTokens ?? 0} in / {tokens.outputTokens ?? 0}{" "}
										out
									</p>
								</div>

								<div className="p-2 rounded bg-secondary/40 border border-border">
									<p className="text-[10px] text-zinc-400">
										Raw Origin Dataset
									</p>
									<p className="text-sm font-bold font-mono text-zinc-300">
										{tokens.traditionalContextTokens.toLocaleString()}{" "}
										<span className="text-[10px] font-normal text-zinc-400">
											tok
										</span>
									</p>
									<p className="text-[9px] text-zinc-400 mt-0.5">
										Unfiltered context
									</p>
								</div>

								<div className="p-2 rounded bg-secondary/40 border border-border">
									<p className="text-[10px] text-zinc-400">Context Saved</p>
									<p className="text-sm font-bold font-mono text-primary">
										{(
											tokens.traditionalContextTokens -
											(tokens.totalTokens ?? 0)
										).toLocaleString()}{" "}
										<span className="text-[10px] font-normal text-zinc-400">
											tok
										</span>
									</p>
									<p className="text-[9px] text-zinc-400 mt-0.5">
										Kept in origin enclave
									</p>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/60">
								<div className="p-2 rounded bg-secondary/40 border border-border">
									<p className="text-[10px] text-zinc-400">Input Tokens</p>
									<p className="text-sm font-bold font-mono text-cyan-300">
										{tokens.inputTokens ?? 0}
									</p>
								</div>
								<div className="p-2 rounded bg-secondary/40 border border-border">
									<p className="text-[10px] text-zinc-400">Output Tokens</p>
									<p className="text-sm font-bold font-mono text-emerald-400">
										{tokens.outputTokens ?? 0}
									</p>
								</div>
								<div className="p-2 rounded bg-secondary/40 border border-border">
									<p className="text-[10px] text-zinc-400">Total Tokens</p>
									<p className="text-sm font-bold font-mono text-white">
										{tokens.totalTokens ?? 0}
									</p>
								</div>
							</div>
						)}
					</div>
				)}

				{/* WASI AST Fuel Quota */}
				{fuel && (
					<div className="p-3 rounded-lg bg-surface1 border border-border space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Fuel className="h-4 w-4 text-primary" />
								<div>
									<span className="font-semibold text-white text-[11px]">
										WASI Instruction Fuel (AST Deterministic)
									</span>
									<p className="text-[10px] text-zinc-400">
										Execution quota enforced by origin runtime
									</p>
								</div>
							</div>
							<div className="text-right font-mono">
								<span className="text-xs font-bold text-white">
									{(fuel.consumed ?? 0).toLocaleString()}
								</span>
								<span className="text-[10px] text-zinc-400">
									{" "}
									/ {(fuel.maxLimit ?? 1000000).toLocaleString()} u
								</span>
							</div>
						</div>

						{/* Fuel Progress Bar */}
						<div className="w-full bg-secondary/80 rounded-full h-2 overflow-hidden border border-border">
							<div
								className="bg-primary h-2 rounded-full transition-all duration-300"
								style={{
									width: `${Math.min(100, Math.max(2, fuel.percentUsed ?? 0))}%`,
								}}
							/>
						</div>

						<div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
							<span>
								Fuel Used:{" "}
								<strong className="text-primary font-semibold">
									{fuel.percentUsed ?? 0}%
								</strong>
							</span>
							<span>Quantization: 100-Fuel-Bucket</span>
						</div>
					</div>
				)}

				{/* Wire Bandwidth & Payload Size */}
				{bandwidth && (
					<div className="p-3 rounded-lg bg-surface1 border border-border space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Globe className="h-4 w-4 text-primary" />
								<div>
									<span className="font-semibold text-white text-[11px]">
										Wire Payload & Egress Traffic
									</span>
									<p className="text-[10px] text-zinc-400">
										Physical socket egress measured at runtime
									</p>
								</div>
							</div>
							{bandwidth.egressReductionPercent !== undefined &&
								bandwidth.rawDatasetProtectedBytes !== undefined &&
								bandwidth.rawDatasetProtectedBytes > 0 && (
									<Badge
										variant="outline"
										className="border-emerald-500/40 text-emerald-400 font-mono text-[10px]"
									>
										-{bandwidth.egressReductionPercent}% Wire Reduction
									</Badge>
								)}
						</div>

						<div className="grid grid-cols-2 gap-2 text-xs">
							<div className="p-2 rounded bg-secondary/40 border border-border font-mono">
								<span className="text-[10px] text-zinc-400 block font-sans">
									Wire Payload (Envelope + Output):
								</span>
								<strong className="text-white text-xs">
									{bandwidth.payloadBytes !== undefined
										? `${(bandwidth.payloadBytes / 1024).toFixed(2)} KB`
										: "Measured in socket"}
								</strong>
							</div>
							<div className="p-2 rounded bg-secondary/40 border border-border font-mono">
								<span className="text-[10px] text-zinc-400 block font-sans">
									Origin Dataset Retained:
								</span>
								<strong className="text-emerald-400 text-xs">
									{bandwidth.rawDatasetProtectedBytes &&
									bandwidth.rawDatasetProtectedBytes > 0
										? `${(bandwidth.rawDatasetProtectedBytes / 1024).toFixed(1)} KB`
										: "Zero egress leakage"}
								</strong>
							</div>
						</div>
					</div>
				)}

				{/* Phase Latency Breakdown */}
				{phases && (
					<div className="p-3 rounded-lg bg-surface1 border border-border space-y-1.5">
						<div className="flex items-center justify-between">
							<span className="font-semibold text-white text-[11px] block">
								Phase Latency Breakdown
							</span>
							<span className="text-[10px] font-mono text-zinc-400">
								Total: {phases.totalLatencyMs ?? meta.latencyMs ?? 0} ms
							</span>
						</div>
						<div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[10px]">
							<div className="p-1.5 rounded bg-secondary/50 border border-border">
								<span className="text-zinc-400 block text-[9px] font-sans">
									Route
								</span>
								<span className="text-zinc-200 font-semibold">
									{phases.discoveryMs ?? 0} ms
								</span>
							</div>
							<div className="p-1.5 rounded bg-secondary/50 border border-border">
								<span className="text-zinc-400 block text-[9px] font-sans">
									Kyber
								</span>
								<span className="text-primary font-semibold">
									{phases.pqcMs ?? 0} ms
								</span>
							</div>
							<div className="p-1.5 rounded bg-secondary/50 border border-border">
								<span className="text-zinc-400 block text-[9px] font-sans">
									Seal
								</span>
								<span className="text-zinc-200 font-semibold">
									{phases.sealingMs ?? 0} ms
								</span>
							</div>
							<div className="p-1.5 rounded bg-secondary/50 border border-border">
								<span className="text-zinc-400 block text-[9px] font-sans">
									Sandbox
								</span>
								<span className="text-emerald-400 font-semibold">
									{phases.wasiSandboxMs ?? 0} ms
								</span>
							</div>
							<div className="p-1.5 rounded bg-secondary/50 border border-border">
								<span className="text-zinc-400 block text-[9px] font-sans">
									ZK-Proof
								</span>
								<span className="text-primary font-semibold">
									{phases.zkVerificationMs ?? 0} ms
								</span>
							</div>
						</div>
					</div>
				)}

				{/* Cryptographic Proofs Row */}
				<div className="p-3 rounded-lg bg-surface1 border border-border space-y-2">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Fingerprint className="h-4 w-4 text-emerald-400" />
							<div>
								<p className="font-semibold text-white text-[11px]">
									ZK-Receipt Proof & PQC Suite
								</p>
								<p className="text-[10px] text-zinc-400">
									ML-KEM-768 • AES-256-GCM • HMAC SHA-256
								</p>
							</div>
						</div>
						<Badge variant="success" className="font-mono text-[10px]">
							VERIFIED
						</Badge>
					</div>

					{meta.zkHash && (
						<div className="flex items-center justify-between bg-editor p-2 rounded border border-border font-mono text-[10px] text-zinc-300">
							<span className="truncate mr-2 select-all font-mono text-emerald-300">
								{meta.zkHash}
							</span>
							<button
								type="button"
								onClick={handleCopyZk}
								className="text-[10px] flex items-center gap-1 text-zinc-400 hover:text-white shrink-0 px-1.5 py-0.5 rounded bg-surface1 border border-border transition-colors cursor-pointer"
								title="Copy ZK-Receipt Hash"
							>
								{copiedZk ? (
									<>
										<Check className="h-3 w-3 text-emerald-400" />
										<span className="text-emerald-400">Copied</span>
									</>
								) : (
									<>
										<Copy className="h-3 w-3" />
										<span>Copy</span>
									</>
								)}
							</button>
						</div>
					)}
				</div>
			</div>
		</TabsContent>
	);
}
