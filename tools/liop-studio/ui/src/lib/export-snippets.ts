// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

export type ExportLanguage = "typescript" | "python" | "curl" | "grpc";

export interface SnippetOptions {
	lang: ExportLanguage;
	toolName: string;
	logicCode: string;
	targetType: string;
	targetEndpoint?: string;
}

/**
 * Generates verified client integration code snippets for production workloads.
 */
export function generateSnippet({
	lang,
	toolName,
	logicCode,
	targetType,
	targetEndpoint,
}: SnippetOptions): string {
	const tool = toolName || "Analyze_Synthetic_Bank_Transactions";
	const escapedCode = logicCode.trim();

	switch (lang) {
		case "typescript": {
			if (targetType === "grpc") {
				return `import { LiopClient } from "@nekzus/liop";

async function main() {
  // Connect to sovereign origin node via gRPC
  const client = new LiopClient({
    target: "${targetEndpoint || "127.0.0.1:15021"}",
    timeoutMs: 10000,
  });

  await client.connect();

  // Inject logic micro-module to process in-situ on origin node
  const response = await client.injectLogic({
    tool: "${tool}",
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
    httpUrl: "${targetEndpoint || "http://127.0.0.1:15014/mcp"}",
  });

  await client.connect();

  // In-situ confidential logic execution
  const response = await client.injectLogic({
    tool: "${tool}",
    logic: \`${escapedCode}\`,
  });

  console.log("Result:", response.result);
  console.log("ZK-Receipt Proof:", response.meta?.zkHash);

  await client.close();
}

main().catch(console.error);`;
		}

		case "python": {
			return `import json
import requests

# LIOP In-situ Logic Execution via Gateway
url = "http://127.0.0.1:16001/api/execute"
payload = {
    "tool": "${tool}",
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
		}

		case "curl": {
			const jsonBody = JSON.stringify(
				{
					tool,
					logic: escapedCode,
				},
				null,
				2,
			);

			return `# Run in-situ logic execution against LIOP Studio Gateway
curl -X POST http://127.0.0.1:16001/api/execute \\
  -H "Content-Type: application/json" \\
  -d '${jsonBody.replace(/'/g, "'\\''")}'`;
		}

		case "grpc": {
			let base64Payload = "";
			try {
				base64Payload = btoa(unescape(encodeURIComponent(escapedCode)));
			} catch {
				base64Payload = "<base64_payload>";
			}

			return `// gRPC Payload for liop.protocol.v1.MeshExecutionService/ExecuteLogic
// Target: ${targetEndpoint || "127.0.0.1:15021"}
{
  "header": {
    "protocol_version": "2026-07-28",
    "clearance_tier": 1,
    "pqc_suite": "ML-KEM-768",
    "sealing_cipher": "AES-256-GCM"
  },
  "tool_name": "${tool}",
  "logic_envelope": {
    "runtime": "wasi_v1",
    "script_payload": "${base64Payload}"
  }
}`;
		}
	}
}
