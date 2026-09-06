import { Check, Copy, FileCode, Terminal, X } from "lucide-react";
import type React from "react";
import { useState } from "react";

export interface CodeExportModalProps {
	isOpen: boolean;
	onClose: () => void;
	toolName: string;
	logicCode: string;
	targetType: "stdio" | "http" | "grpc" | "mesh";
	targetEndpoint: string;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({
	isOpen,
	onClose,
	toolName,
	logicCode,
	targetType,
	targetEndpoint,
}) => {
	const [activeLang, setActiveLang] = useState<
		"typescript" | "python" | "curl" | "grpc"
	>("typescript");
	const [copied, setCopied] = useState(false);

	if (!isOpen) return null;

	const escapedCode = logicCode.trim();

	// Generate TypeScript / Node.js snippet using official @nekzus/liop SDK
	const generateTypeScript = () => {
		if (targetType === "grpc") {
			return `import { LiopClient } from "@nekzus/liop";

async function main() {
  // Connect to sovereign origin node via gRPC
  const client = new LiopClient({
    target: "${targetEndpoint || "127.0.0.1:13011"}",
    timeoutMs: 10000,
  });

  await client.connect();

  // Inject logic micro-module to process in-situ on origin node
  const response = await client.injectLogic({
    tool: "${toolName}",
    logic: \`${escapedCode}\`,
  });

  console.log("Sovereign Execution Result:", response.result);
  console.log("ZK-Receipt HMAC:", response.meta?.zkHash);
  console.log("Tokens Consumed:", response.meta?.telemetry?.tokens?.totalTokens);

  await client.close();
}

main().catch(console.error);`;
		}

		return `import { LiopClient } from "@nekzus/liop";

async function main() {
  // Connect to LIOP Gateway via HTTP / SSE
  const client = new LiopClient({
    httpUrl: "${targetEndpoint || "http://127.0.0.1:15000/mcp"}",
  });

  await client.connect();

  // In-situ confidential logic execution
  const response = await client.injectLogic({
    tool: "${toolName}",
    logic: \`${escapedCode}\`,
  });

  console.log("Result:", response.result);
  console.log("ZK-Receipt Proof:", response.meta?.zkHash);

  await client.close();
}

main().catch(console.error);`;
	};

	// Generate Python snippet
	const generatePython = () => {
		return `import json
import requests

# LIOP In-situ Logic Execution via Gateway
url = "http://127.0.0.1:16001/api/execute"
payload = {
    "tool": "${toolName}",
    "logic": """${escapedCode}"""
}

headers = {"Content-Type": "application/json"}

# SSE stream receiving confidential execution phases and output
response = requests.post(url, json=payload, headers=headers, stream=True)

for line in response.iter_lines():
    if line:
        decoded = line.decode("utf-8")
        if decoded.startswith("data: "):
            event = json.loads(decoded[6:])
            if event.get("type") == "result":
                print("Result:", json.dumps(event.get("payload"), indent=2))
                print("ZK-Receipt HMAC:", event.get("meta", {}).get("zkHash"))
            elif event.get("type") == "error":
                print("Execution Error:", event.get("payload"))`;
	};

	// Generate cURL / CLI command
	const generateCurl = () => {
		const jsonBody = JSON.stringify(
			{
				tool: toolName,
				logic: escapedCode,
			},
			null,
			2,
		);

		return `# Run in-situ logic execution against LIOP Studio Gateway
curl -X POST http://127.0.0.1:16001/api/execute \\
  -H "Content-Type: application/json" \\
  -d '${jsonBody.replace(/'/g, "'\\''")}'`;
	};

	// Generate gRPC CLI / JSON payload
	const generateGrpc = () => {
		let base64Payload = "";
		try {
			base64Payload = btoa(unescape(encodeURIComponent(escapedCode)));
		} catch (_e) {
			base64Payload = "<base64_payload>";
		}

		return `// gRPC Payload for liop.protocol.v1.MeshExecutionService/ExecuteLogic
// Target: ${targetEndpoint || "127.0.0.1:13011"}
{
  "header": {
    "protocol_version": "2026-07-28",
    "clearance_tier": 1,
    "pqc_suite": "ML-KEM-768",
    "sealing_cipher": "AES-256-GCM"
  },
  "tool_name": "${toolName}",
  "logic_envelope": {
    "runtime": "wasi_v1",
    "script_payload": "${base64Payload}"
  }
}`;
	};

	const getCodeSnippet = () => {
		switch (activeLang) {
			case "typescript":
				return generateTypeScript();
			case "python":
				return generatePython();
			case "curl":
				return generateCurl();
			case "grpc":
				return generateGrpc();
			default:
				return generateTypeScript();
		}
	};

	const snippet = getCodeSnippet();

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(snippet);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (_e) {
			const ta = document.createElement("textarea");
			ta.value = snippet;
			document.body.appendChild(ta);
			ta.select();
			document.execCommand("copy");
			document.body.removeChild(ta);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
			<div className="w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface1">
					<div className="flex items-center gap-2">
						<div className="p-1.5 rounded-md bg-secondary text-primary">
							<FileCode className="h-4 w-4" />
						</div>
						<div>
							<h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
								Export Micro-Module Snippet
							</h3>
							<p className="text-[11px] text-zinc-400">
								Production-ready integration code for{" "}
								<span className="font-mono text-cyan-300">{toolName}</span>
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
						title="Close Modal"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Language Tabs & Copy Action */}
				<div className="flex items-center justify-between px-5 py-2.5 bg-background border-b border-border/60">
					<div className="flex items-center gap-1.5 p-0.5 bg-surface1 border border-border/80 rounded-lg">
						<button
							type="button"
							onClick={() => setActiveLang("typescript")}
							className={`text-xs px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
								activeLang === "typescript"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							TypeScript (SDK)
						</button>
						<button
							type="button"
							onClick={() => setActiveLang("python")}
							className={`text-xs px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
								activeLang === "python"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							Python
						</button>
						<button
							type="button"
							onClick={() => setActiveLang("curl")}
							className={`text-xs px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
								activeLang === "curl"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							cURL / CLI
						</button>
						<button
							type="button"
							onClick={() => setActiveLang("grpc")}
							className={`text-xs px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
								activeLang === "grpc"
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
								<span>Copied to Clipboard</span>
							</>
						) : (
							<>
								<Copy className="h-3.5 w-3.5" />
								<span>Copy Snippet</span>
							</>
						)}
					</button>
				</div>

				{/* Code Preview Area */}
				<div className="flex-1 min-h-[300px] overflow-auto p-5 bg-editor">
					<pre className="font-mono text-xs text-[#7dd3fc] leading-relaxed select-all">
						{snippet}
					</pre>
				</div>

				{/* Modal Footer Note */}
				<div className="px-5 py-2.5 bg-surface1 border-t border-border flex items-center justify-between text-[11px] text-zinc-400 font-mono">
					<span className="flex items-center gap-1.5">
						<Terminal className="h-3.5 w-3.5 text-primary" />
						Target: {targetType.toUpperCase()} ({targetEndpoint || "default"})
					</span>
					<span>Zero-Trust In-situ Logic Execution</span>
				</div>
			</div>
		</div>
	);
};
