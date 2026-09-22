// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { Loader2, Terminal } from "lucide-react";
import type { ExecutionMeta } from "../../types";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { TabsContent } from "../ui/tabs";
import { OriginResultViewer } from "./OriginResultViewer";

interface OutputTabProps {
	// biome-ignore lint/suspicious/noExplicitAny: Generic JSON result payload
	result: Record<string, any> | null;
	errorAlert: { title: string; desc: string } | null;
	isRunning: boolean;
	meta?: ExecutionMeta | null;
}

export function OutputTab({
	result,
	errorAlert,
	isRunning,
	meta,
}: OutputTabProps) {
	return (
		<TabsContent value="output" className="m-0 space-y-3 pb-5">
			{/* Error or Shield Block alert */}
			{errorAlert && (
				<div className="mb-3 pt-1">
					<Alert
						variant="destructive"
						className="border-destructive/40 bg-destructive/10"
					>
						<AlertTitle className="text-xs font-semibold">
							{errorAlert.title}
						</AlertTitle>
						<AlertDescription className="text-xs leading-relaxed mt-1">
							{errorAlert.desc}
						</AlertDescription>
					</Alert>
				</div>
			)}

			{result ? (
				<OriginResultViewer result={result} meta={meta} />
			) : !errorAlert && !isRunning ? (
				<div className="flex flex-col items-center justify-center py-14 text-zinc-400 text-center space-y-2">
					<Terminal className="h-6 w-6 text-zinc-500" />
					<p className="text-xs font-medium text-zinc-200">
						Awaiting Execution
					</p>
					<p className="text-[11px] text-zinc-400 max-w-[240px]">
						Select a template, inspect the runtime schema with{" "}
						<strong>Env Schema</strong>, or click <strong>Execute Logic</strong>
						.
					</p>
				</div>
			) : isRunning ? (
				<div className="flex flex-col items-center justify-center py-14 text-zinc-400 text-center space-y-2.5">
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
					<p className="text-xs text-zinc-300">
						Injecting logic and enforcing Zero-Trust policies...
					</p>
				</div>
			) : null}
		</TabsContent>
	);
}
