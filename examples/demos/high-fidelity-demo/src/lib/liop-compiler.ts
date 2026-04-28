// LIOP Compiler: Dynamic Client-Side Compilation
// Takes high-level JS logic, injects it into a skeleton, and generates the executable payload.

export const LiopCompiler = {
	/**
	 * Compiles an analysis function (written as a string) into an injectable LIOP module.
	 * The provided function must take a parameter (e.g., `db`) representing the read-only database,
	 * and return the result that should be emitted to the host.
	 */
	compileAnalysis(
		analysisFunctionStr: string,
		name: string = "DynamicAudit",
	): string {
		const header = `@LIOP{wasi_v1,${name}}\n`;
		const footer = "\n@END";

		// The skeleton injects a standard entry point required by the server (liop_main)
		const executableBody = `
const _clientLogic = ${analysisFunctionStr};

function liop_main(env) {
    if (!env || !env.records) {
        throw new Error("Missing records in LIOP Sandbox environment.");
    }
    const result = _clientLogic(env.records);
    return typeof result === 'object' ? JSON.stringify(result) : String(result);
}
    `.trim();

		return (
			header + executableBody + footer
		);
	},

	/**
	 * Packages a pure malicious script, without the standard LIOP wrapper.
	 * Used exclusively to test the resilience of the Guardian AST or Sandbox.
	 */
	compileRaw(rawScript: string, name: string = "RawScript"): string {
		const header = `@LIOP{raw,${name}}\n`;

		return (
			header +
			rawScript +
			"\n@END"
		);
	},
};
