/**
 * LIOP Cross-AI Prompt Adapters (Fase 92)
 *
 * Normalizes system instructions for different LLM providers (Claude, OpenAI, Gemini)
 * to ensure they understand how to generate "Logic-on-Origin" WASM-compatible payload structures.
 */

export type AIProvider = "claude" | "openai" | "gemini";

export interface PromptConfig {
	xmlStandard: boolean;
	jsonSchemaPreferred: boolean;
}

const PROVIDER_CONFIGS: Record<AIProvider, PromptConfig> = {
	claude: { xmlStandard: true, jsonSchemaPreferred: false },
	openai: { xmlStandard: false, jsonSchemaPreferred: true },
	gemini: { xmlStandard: false, jsonSchemaPreferred: true },
};

/**
 * Generates specific System Prompts optimized for the provided AI.
 * This instructs the LLM on how to bypass Context-Pulling and use Logic-Injection (Zero-Shot).
 */
export function generateSystemInstructions(provider: AIProvider): string {
	const config = PROVIDER_CONFIGS[provider];

	let instructions = `[LIOP-PROTO-V1: LOGIC-ON-ORIGIN SPECIFICATION]
You are interacting with a Logic-Injection-on-Origin Protocol (LIOP) Mesh Network.
Unlike standard MCP where you pull context to evaluate it remotely, in LIOP you WRITE code that executes on the data's origin.

### CORE PARADIGM
When you call a tool or resource, you MUST provide a payload that represents secure sandboxed logic to be executed on the remote Node.
The node will execute your logic securely on the raw secure data, and return only the RESULT, avoiding PII data egress.

### EXECUTION RULES
1. Provide a self-contained JavaScript syntax block that we will compile to WASM-Sandboxed logic.
2. Rely only on standard ECMA script features (No Node.js polyfills).
3. The logic must end by returning the calculated insights, not the raw data.
`;

	if (config.xmlStandard) {
		instructions += `
### PAYLOAD FORMATTING (CLAUDE-XML PREFERRED)
You must wrap your logic precisely within <liop_logic> tags.
Example:
<liop_logic>
const records = await liop.readResource("liop://vault/patients");
const filtered = records.filter(r => r.disease === "Hypertension");
return { alert: "High risk demographic", targetCount: filtered.length };
</liop_logic>
`;
	} else if (config.jsonSchemaPreferred) {
		instructions += `
### PAYLOAD FORMATTING (JSON PARSING PREFERRED)
You must provide your logic strictly within a JSON string key called \`"logic_blob"\` inside your tool call parameters.
Example:
{
  "target": "liop://vault/patients",
  "logic_blob": "const records = await liop.readResource(args.target); return { targetCount: records.filter(r => r.disease === 'Hypertension').length };"
}
`;
	}

	return instructions;
}
