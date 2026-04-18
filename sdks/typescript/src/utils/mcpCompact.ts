/**
 * MCP UX: optional compact tool descriptions for clients (e.g. cloud models)
 * that over-trigger on long "envelope / injection" wording in tools/list.
 *
 * Full LIOP payload format remains in prompts/get → liop_blind_analyst.
 */
export function mcpCompactToolDescriptions(): boolean {
	const v =
		process.env.LIOP_MCP_COMPACT_TOOL_DESCRIPTIONS?.toLowerCase().trim();
	return v === "1" || v === "true" || v === "yes";
}

/**
 * Removes SDK-appended LIOP specification blocks from a registered tool description.
 */
export function stripVerboseLiopToolDescription(description: string): string {
	let d = description;
	const markers = [
		"\n\n[LIOP-PROTO-V1:",
		"\r\n\r\n[LIOP-PROTO-V1:",
		"\n[LIOP-PROTO-V1:", // rare
	];
	for (const m of markers) {
		const i = d.indexOf(m);
		if (i !== -1) {
			d = d.slice(0, i);
			break;
		}
	}
	return d.trimEnd();
}
