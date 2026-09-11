// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { copyToClipboard } from "../../lib/clipboard";
import {
	type ExportLanguage,
	generateSnippet,
} from "../../lib/export-snippets";
import { TabsContent } from "../ui/tabs";

interface ExportTabProps {
	toolName: string;
	code: string;
	targetType: string;
	grpcTarget: string;
	httpUrl: string;
	stdioCmd: string;
}

export function ExportTab({
	toolName,
	code,
	targetType,
	grpcTarget,
	httpUrl,
	stdioCmd,
}: ExportTabProps) {
	const [lang, setLang] = useState<ExportLanguage>("typescript");
	const [copied, setCopied] = useState(false);

	const targetEndpoint =
		targetType === "grpc"
			? grpcTarget
			: targetType === "http"
				? httpUrl
				: stdioCmd;

	const snippet = generateSnippet({
		lang,
		toolName,
		logicCode: code,
		targetType,
		targetEndpoint,
	});

	const handleCopy = async () => {
		const ok = await copyToClipboard(snippet);
		if (ok) {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<TabsContent value="export" className="m-0 space-y-3 pb-5">
			<div className="space-y-3 pt-1 text-xs">
				{/* Language Switcher & Copy Action */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5 p-0.5 bg-surface1 border border-border rounded-lg">
						<button
							type="button"
							onClick={() => setLang("typescript")}
							className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
								lang === "typescript"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							TypeScript (SDK)
						</button>
						<button
							type="button"
							onClick={() => setLang("python")}
							className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
								lang === "python"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							Python
						</button>
						<button
							type="button"
							onClick={() => setLang("curl")}
							className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
								lang === "curl"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							cURL / CLI
						</button>
						<button
							type="button"
							onClick={() => setLang("grpc")}
							className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
								lang === "grpc"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							gRPC JSON
						</button>
					</div>

					<button
						type="button"
						onClick={handleCopy}
						className={`text-xs flex items-center gap-1.5 px-3 py-1 rounded-md font-medium border transition-all cursor-pointer ${
							copied
								? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
								: "bg-surface1 text-zinc-200 border-border hover:bg-white/10 hover:text-white"
						}`}
					>
						{copied ? (
							<>
								<Check className="h-3.5 w-3.5 text-emerald-400" />
								<span>Copied</span>
							</>
						) : (
							<>
								<Copy className="h-3.5 w-3.5" />
								<span>Copy Code</span>
							</>
						)}
					</button>
				</div>

				{/* Code Snippet Box */}
				<div className="rounded-lg bg-editor border border-border p-3.5 font-mono text-xs text-[#7dd3fc] overflow-auto max-h-[250px] leading-relaxed select-all shadow-inner">
					<pre>{snippet}</pre>
				</div>

				<div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
					<span>
						Target Tool:{" "}
						<strong className="text-white">
							{toolName || "Analyze_Synthetic_Bank_Transactions"}
						</strong>
					</span>
					<span>Endpoint: {targetEndpoint || "127.0.0.1:15021"}</span>
				</div>
			</div>
		</TabsContent>
	);
}
