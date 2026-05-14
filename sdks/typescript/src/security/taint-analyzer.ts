/**
 * LIOP Taint Analyzer — Static Information Flow Control (IFC)
 *
 * Performs AST-level taint tracking on injected Logic-on-Origin code
 * to detect side-channel data exfiltration via scalar derivation
 * (charCodeAt, boolean inference, arithmetic on PII fields).
 *
 * Architecture: 3-pass analysis using Acorn ESTree parser.
 *   Pass 1 — Identify record-bound variables (callback params of env.records methods)
 *   Pass 2 — Propagate taint through assignments and expressions
 *   Pass 3 — Check return statements for tainted values flowing to output
 *
 * References:
 *   - Acorn ESTree spec: https://github.com/estree/estree
 *   - Acorn-Walk SimpleVisitors: https://github.com/acornjs/acorn/tree/master/acorn-walk
 *   - OWASP Information Flow Control patterns
 */

import * as acorn from "acorn";
import { type SimpleVisitors, simple } from "acorn-walk";

// ── Public API ───────────────────────────────────────────────────────

export interface TaintViolation {
	/** Human-readable reason for the block */
	reason: string;
	/** Source line number (1-indexed) if available */
	line?: number;
	/** The specific operation that triggered the violation */
	operation?: string;
}

/**
 * Static taint analyzer for LIOP Logic-on-Origin payloads.
 *
 * Detects when PII field values are derived into scalar outputs
 * (charCodeAt, boolean inference, arithmetic) that would bypass
 * the Egress Shield's pattern-based detection.
 */
export class TaintAnalyzer {
	private readonly piiFields: Set<string>;

	/** String methods that extract character-level information from PII */
	private static readonly TAINT_PROPAGATING_METHODS = new Set([
		// Character extraction
		"charCodeAt",
		"codePointAt",
		"charAt",
		"at",
		// Search/position (reveals content structure)
		"indexOf",
		"lastIndexOf",
		"search",
		// Comparison (reveals ordering/content)
		"localeCompare",
		"startsWith",
		"endsWith",
		"includes",
		// Transformation (preserves PII content in different form)
		"substring",
		"slice",
		"substr",
		"split",
		"match",
		"matchAll",
		"replace",
		"replaceAll",
		"normalize",
		"toLowerCase",
		"toUpperCase",
		"trim",
		"trimStart",
		"trimEnd",
		"padStart",
		"padEnd",
		"repeat",
	]);

	/** Array iteration methods whose callbacks receive individual records */
	private static readonly ARRAY_CALLBACK_METHODS = new Set([
		"map",
		"forEach",
		"filter",
		"find",
		"some",
		"every",
		"flatMap",
		"findIndex",
	]);

	/** Reduce-family methods where the record param is the SECOND callback arg */
	private static readonly REDUCE_METHODS = new Set(["reduce", "reduceRight"]);

	constructor(piiFields: string[]) {
		this.piiFields = new Set(piiFields.map((f) => f.toLowerCase()));
	}

	/**
	 * Analyzes injected source code for PII taint violations.
	 *
	 * @param sourceCode - The raw JavaScript logic extracted from the LIOP envelope
	 * @returns A TaintViolation if PII-derived values flow to output, null if clean
	 */
	analyze(sourceCode: string): TaintViolation | null {
		let ast: acorn.Node;
		try {
			// Wrap in function body to handle bare `return` statements
			const wrapped = `function liop_analysis_wrapper(env) {\n${sourceCode}\n}`;
			ast = acorn.parse(wrapped, {
				ecmaVersion: 2022,
				sourceType: "script",
				locations: true,
			});
		} catch {
			// Syntax errors are handled downstream by the sandbox VM
			return null;
		}

		const recordBoundVars = new Set<string>();
		const taintedVars = new Set<string>();

		// Pass 1: Identify variables bound to individual records
		this.identifyRecordBoundVars(ast, recordBoundVars);

		// Pass 2: Propagate taint through variable assignments
		this.propagateTaint(ast, recordBoundVars, taintedVars);

		// Pass 3: Check if any return statement contains tainted values
		return this.checkReturnStatements(ast, recordBoundVars, taintedVars);
	}

	// ── Pass 1: Record-Bound Variable Identification ──────────────────

	private identifyRecordBoundVars(
		ast: acorn.Node,
		recordBoundVars: Set<string>,
	): void {
		const visitors: SimpleVisitors<void> = {
			CallExpression: (node) => {
				if (node.callee.type !== "MemberExpression") return;

				const member = node.callee as acorn.MemberExpression;
				const methodName = this.getPropertyName(member);
				if (!methodName) return;

				// Check if this is env.records.METHOD(callback)
				if (!this.isEnvRecordsAccess(member.object)) return;

				const callback = node.arguments[0];
				if (!callback) return;

				if (
					callback.type === "ArrowFunctionExpression" ||
					callback.type === "FunctionExpression"
				) {
					const fn = callback as acorn.ArrowFunctionExpression;

					if (
						TaintAnalyzer.ARRAY_CALLBACK_METHODS.has(methodName) &&
						fn.params.length > 0
					) {
						const param = fn.params[0];
						if (param.type === "Identifier") {
							recordBoundVars.add(param.name);
						}
					}

					if (
						TaintAnalyzer.REDUCE_METHODS.has(methodName) &&
						fn.params.length > 1
					) {
						const recordParam = fn.params[1];
						if (recordParam.type === "Identifier") {
							recordBoundVars.add(recordParam.name);
						}
					}
				}
			},

			// for (const r of env.records) → r is record-bound
			ForOfStatement: (node) => {
				if (!this.isEnvRecordsAccess(node.right)) return;

				if (node.left.type === "VariableDeclaration") {
					for (const declarator of node.left.declarations) {
						if (declarator.id.type === "Identifier") {
							recordBoundVars.add(declarator.id.name);
						}
					}
				}
			},
		};

		simple(ast, visitors);

		// Also handle: const r = env.records[N]
		const indexVisitors: SimpleVisitors<void> = {
			VariableDeclarator: (node) => {
				if (!node.init || node.id.type !== "Identifier") return;

				if (
					node.init.type === "MemberExpression" &&
					(node.init as acorn.MemberExpression).computed
				) {
					const member = node.init as acorn.MemberExpression;
					if (this.isEnvRecordsAccess(member.object)) {
						recordBoundVars.add(node.id.name);
					}
				}
			},
		};

		simple(ast, indexVisitors);
	}

	// ── Pass 2: Taint Propagation ─────────────────────────────────────

	private propagateTaint(
		ast: acorn.Node,
		recordBoundVars: Set<string>,
		taintedVars: Set<string>,
	): void {
		// Multiple iterations to handle transitive taint chains
		// (e.g., const a = r.name; const b = a; const c = b.charCodeAt(0))
		for (let iteration = 0; iteration < 3; iteration++) {
			const sizeBefore = taintedVars.size;

			const visitors: SimpleVisitors<void> = {
				VariableDeclarator: (node) => {
					if (!node.init || node.id.type !== "Identifier") return;

					if (
						this.isExpressionTainted(node.init, recordBoundVars, taintedVars)
					) {
						taintedVars.add(node.id.name);
					}
				},

				AssignmentExpression: (node) => {
					if (node.left.type !== "Identifier") return;

					if (
						this.isExpressionTainted(node.right, recordBoundVars, taintedVars)
					) {
						taintedVars.add((node.left as acorn.Identifier).name);
					}
				},

				// Imperative taint: array.push(taintedValue) contaminates the array
				// Covers for-of and forEach patterns that push PII-derived values
				CallExpression: (node) => {
					if (node.callee.type !== "MemberExpression") return;

					const callee = node.callee as acorn.MemberExpression;
					const methodName = this.getPropertyName(callee);

					if (
						methodName === "push" &&
						callee.object.type === "Identifier" &&
						node.arguments.some((arg) =>
							this.isExpressionTainted(arg, recordBoundVars, taintedVars),
						)
					) {
						taintedVars.add((callee.object as acorn.Identifier).name);
					}
				},
			};

			simple(ast, visitors);

			// Fixed point: stop if no new tainted vars discovered
			if (taintedVars.size === sizeBefore) break;
		}
	}

	// ── Pass 3: Return Statement Sink Detection ───────────────────────

	private checkReturnStatements(
		ast: acorn.Node,
		recordBoundVars: Set<string>,
		taintedVars: Set<string>,
	): TaintViolation | null {
		let violation: TaintViolation | null = null;

		const visitors: SimpleVisitors<void> = {
			ReturnStatement: (node) => {
				if (violation) return; // Already found one

				if (!node.argument) return;

				if (
					this.isExpressionTainted(node.argument, recordBoundVars, taintedVars)
				) {
					const line = node.loc?.start.line
						? node.loc.start.line - 1 // Adjust for wrapper function offset
						: undefined;
					const operation = this.describeTaintSource(
						node.argument,
						recordBoundVars,
						taintedVars,
					);
					violation = {
						reason:
							`PII side-channel detected: output contains values derived from restricted fields. ` +
							`${operation ? `Operation: ${operation}. ` : ""}` +
							`Use only non-PII fields (e.g., numeric/date columns) for aggregations.`,
						line,
						operation,
					};
				}
			},
		};

		simple(ast, visitors);

		return violation;
	}

	// ── Core Taint Evaluation ─────────────────────────────────────────

	/**
	 * Recursively determines if an AST expression produces a tainted value.
	 * A value is tainted if it derives from a PII field on a record-bound variable.
	 */
	private isExpressionTainted(
		node: acorn.Node,
		recordBoundVars: Set<string>,
		taintedVars: Set<string>,
	): boolean {
		switch (node.type) {
			case "Identifier":
				return taintedVars.has((node as acorn.Identifier).name);

			case "MemberExpression":
				return this.isMemberExprTainted(
					node as acorn.MemberExpression,
					recordBoundVars,
					taintedVars,
				);

			case "CallExpression":
				return this.isCallExprTainted(
					node as acorn.CallExpression,
					recordBoundVars,
					taintedVars,
				);

			case "BinaryExpression":
			case "LogicalExpression": {
				const bin = node as acorn.BinaryExpression;
				return (
					this.isExpressionTainted(bin.left, recordBoundVars, taintedVars) ||
					this.isExpressionTainted(bin.right, recordBoundVars, taintedVars)
				);
			}

			case "UnaryExpression": {
				const unary = node as acorn.UnaryExpression;
				return this.isExpressionTainted(
					unary.argument,
					recordBoundVars,
					taintedVars,
				);
			}

			case "ConditionalExpression": {
				const cond = node as acorn.ConditionalExpression;
				// If the test involves tainted values, the branch choice leaks info
				return (
					this.isExpressionTainted(cond.test, recordBoundVars, taintedVars) ||
					this.isExpressionTainted(
						cond.consequent,
						recordBoundVars,
						taintedVars,
					) ||
					this.isExpressionTainted(cond.alternate, recordBoundVars, taintedVars)
				);
			}

			case "ObjectExpression": {
				const obj = node as acorn.ObjectExpression;
				return obj.properties.some(
					(prop) =>
						prop.type === "Property" &&
						this.isExpressionTainted(prop.value, recordBoundVars, taintedVars),
				);
			}

			case "ArrayExpression": {
				const arr = node as acorn.ArrayExpression;
				return arr.elements.some(
					(el) =>
						el !== null &&
						this.isExpressionTainted(el, recordBoundVars, taintedVars),
				);
			}

			case "TemplateLiteral": {
				const tmpl = node as acorn.TemplateLiteral;
				return tmpl.expressions.some((expr) =>
					this.isExpressionTainted(expr, recordBoundVars, taintedVars),
				);
			}

			case "SpreadElement": {
				const spread = node as acorn.SpreadElement;
				return this.isExpressionTainted(
					spread.argument,
					recordBoundVars,
					taintedVars,
				);
			}

			default:
				// Literals, ThisExpression, etc. are never tainted
				return false;
		}
	}

	/**
	 * Checks if a MemberExpression accesses a PII field on a record-bound variable.
	 * Examples: r.accountHolder, r["name"], taintedVar.length, taintedVar[0]
	 */
	private isMemberExprTainted(
		member: acorn.MemberExpression,
		recordBoundVars: Set<string>,
		taintedVars: Set<string>,
	): boolean {
		const propName = this.getPropertyName(member);

		// Case 1: recordBoundVar.piiField (direct PII access via callback param)
		if (
			member.object.type === "Identifier" &&
			recordBoundVars.has((member.object as acorn.Identifier).name) &&
			propName &&
			this.piiFields.has(propName.toLowerCase())
		) {
			return true;
		}

		// Case 2: env.records[N].piiField (direct indexed access without callback)
		// AST: MemberExpression { object: MemberExpression { object: env.records, computed: true }, property: piiField }
		if (
			member.object.type === "MemberExpression" &&
			propName &&
			this.piiFields.has(propName.toLowerCase())
		) {
			const parentMember = member.object as acorn.MemberExpression;
			if (
				parentMember.computed &&
				this.isEnvRecordsAccess(parentMember.object)
			) {
				return true;
			}
		}

		// Case 3: taintedVar.anything (any property access on tainted value)
		// .length on a tainted string leaks PII info, .charCodeAt leaks chars, etc.
		if (this.isExpressionTainted(member.object, recordBoundVars, taintedVars)) {
			return true;
		}

		// Case 4: Computed access on record-bound var with PII field
		// e.g., r["account" + "Holder"]
		if (
			member.computed &&
			member.object.type === "Identifier" &&
			recordBoundVars.has((member.object as acorn.Identifier).name)
		) {
			// Conservative: if computed access on record, check if the property
			// expression evaluates to a PII field (for string literals only)
			if (member.property.type === "Literal") {
				const litVal = (member.property as acorn.Literal).value;
				if (
					typeof litVal === "string" &&
					this.piiFields.has(litVal.toLowerCase())
				) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Checks if a CallExpression produces a tainted result.
	 * Handles: taintedObj.method(), env.records.map(r => r.piiField), etc.
	 */
	private isCallExprTainted(
		call: acorn.CallExpression,
		recordBoundVars: Set<string>,
		taintedVars: Set<string>,
	): boolean {
		// Pattern: taintedObj.method() — method on tainted object propagates taint
		if (call.callee.type === "MemberExpression") {
			const callee = call.callee as acorn.MemberExpression;
			const methodName = this.getPropertyName(callee);

			// tainted.charCodeAt() / tainted.split() / etc.
			if (
				methodName &&
				TaintAnalyzer.TAINT_PROPAGATING_METHODS.has(methodName) &&
				this.isExpressionTainted(callee.object, recordBoundVars, taintedVars)
			) {
				return true;
			}

			// env.records.map/filter/reduce(callback) — check if callback produces taint
			if (this.isEnvRecordsAccess(callee.object) && call.arguments[0]) {
				const callback = call.arguments[0];
				if (
					callback.type === "ArrowFunctionExpression" ||
					callback.type === "FunctionExpression"
				) {
					return this.doesCallbackProduceTaint(
						callback as acorn.ArrowFunctionExpression,
						methodName,
						recordBoundVars,
						taintedVars,
					);
				}
			}

			// Tainted array/string method chains: tainted.reduce(...), tainted.map(...)
			// Handles patterns like r.accountHolder.split('').reduce((a,c) => ...)
			if (
				this.isExpressionTainted(callee.object, recordBoundVars, taintedVars)
			) {
				return true;
			}

			// Math.round(taintedArg) / JSON.stringify(taintedArg) — function calls with tainted arguments
			// on safe objects still produce tainted results
			if (
				call.arguments.some((arg) =>
					this.isExpressionTainted(arg, recordBoundVars, taintedVars),
				)
			) {
				return true;
			}
		}

		// Pattern: someArray.push(taintedValue) — marks the receiving array as tainted
		// This covers imperative for-of patterns:
		//   for (const r of env.records) { codes.push(r.name.charCodeAt(0)) }
		if (call.callee.type === "MemberExpression") {
			const callee = call.callee as acorn.MemberExpression;
			const methodName = this.getPropertyName(callee);
			if (
				methodName === "push" &&
				callee.object.type === "Identifier" &&
				call.arguments.some((arg) =>
					this.isExpressionTainted(arg, recordBoundVars, taintedVars),
				)
			) {
				// Mark the array variable as tainted (it now contains PII-derived values)
				taintedVars.add((callee.object as acorn.Identifier).name);
			}
		}

		// Check if any argument is tainted (for functions that might propagate)
		// Conservative: if calling a function WITH tainted args, consider result tainted
		// This catches: someHelper(r.name), parseInt(taintedVar), etc.
		if (call.callee.type === "Identifier") {
			const fnName = (call.callee as acorn.Identifier).name;
			// Allow safe math/utility functions that don't propagate PII
			const SAFE_GLOBALS = new Set([
				"Math",
				"Number",
				"parseInt",
				"parseFloat",
				"isNaN",
				"isFinite",
			]);
			if (!SAFE_GLOBALS.has(fnName)) {
				return call.arguments.some((arg) =>
					this.isExpressionTainted(arg, recordBoundVars, taintedVars),
				);
			}
		}

		return false;
	}

	/**
	 * Checks if an array method callback produces tainted output.
	 * e.g., env.records.map(r => r.name.charCodeAt(0)) → tainted result
	 */
	private doesCallbackProduceTaint(
		callback: acorn.ArrowFunctionExpression | acorn.FunctionExpression,
		methodName: string | null,
		recordBoundVars: Set<string>,
		taintedVars: Set<string>,
	): boolean {
		// Create a temporary scope with callback params as record-bound
		const scopedRecordVars = new Set(recordBoundVars);
		const scopedTaintedVars = new Set(taintedVars);

		if (callback.params.length > 0) {
			const isReduce =
				methodName !== null && TaintAnalyzer.REDUCE_METHODS.has(methodName);
			const recordParamIndex = isReduce ? 1 : 0;

			if (
				callback.params.length > recordParamIndex &&
				callback.params[recordParamIndex].type === "Identifier"
			) {
				scopedRecordVars.add(
					(callback.params[recordParamIndex] as acorn.Identifier).name,
				);
			}
		}

		// For arrow functions with expression body: (r) => r.name.charCodeAt(0)
		if (
			callback.type === "ArrowFunctionExpression" &&
			callback.body.type !== "BlockStatement"
		) {
			return this.isExpressionTainted(
				callback.body,
				scopedRecordVars,
				scopedTaintedVars,
			);
		}

		// For block bodies, check return statements within the callback
		let hasTaintedReturn = false;
		const returnVisitors: SimpleVisitors<void> = {
			ReturnStatement: (node) => {
				if (
					node.argument &&
					this.isExpressionTainted(
						node.argument,
						scopedRecordVars,
						scopedTaintedVars,
					)
				) {
					hasTaintedReturn = true;
				}
			},
		};

		simple(callback.body as acorn.Node, returnVisitors);

		return hasTaintedReturn;
	}

	// ── Utility Methods ───────────────────────────────────────────────

	/** Extracts the property name from a MemberExpression (dot or bracket with string literal) */
	private getPropertyName(member: acorn.MemberExpression): string | null {
		if (!member.computed && member.property.type === "Identifier") {
			return (member.property as acorn.Identifier).name;
		}
		if (member.computed && member.property.type === "Literal") {
			const val = (member.property as acorn.Literal).value;
			if (typeof val === "string") return val;
		}
		return null;
	}

	/** Checks if an expression resolves to `env.records` or `records` */
	private isEnvRecordsAccess(node: acorn.Node): boolean {
		// Direct: env.records
		if (node.type === "MemberExpression") {
			const member = node as acorn.MemberExpression;
			const propName = this.getPropertyName(member);
			if (
				propName === "records" &&
				member.object.type === "Identifier" &&
				(member.object as acorn.Identifier).name === "env"
			) {
				return true;
			}
		}
		// Bare: records (injected as sandbox global)
		if (
			node.type === "Identifier" &&
			(node as acorn.Identifier).name === "records"
		) {
			return true;
		}
		return false;
	}

	/** Generates a human-readable description of the taint source for error messages */
	private describeTaintSource(
		node: acorn.Node,
		recordBoundVars: Set<string>,
		taintedVars: Set<string>,
	): string | undefined {
		if (node.type === "Identifier") {
			const name = (node as acorn.Identifier).name;
			if (taintedVars.has(name)) return `variable '${name}' is PII-derived`;
		}

		if (node.type === "ObjectExpression") {
			const obj = node as acorn.ObjectExpression;
			for (const prop of obj.properties) {
				if (
					prop.type === "Property" &&
					this.isExpressionTainted(prop.value, recordBoundVars, taintedVars)
				) {
					const keyName =
						prop.key.type === "Identifier"
							? (prop.key as acorn.Identifier).name
							: "unknown";
					return `property '${keyName}' contains PII-derived value`;
				}
			}
		}

		if (node.type === "CallExpression") {
			const call = node as acorn.CallExpression;
			if (call.callee.type === "MemberExpression") {
				const methodName = this.getPropertyName(
					call.callee as acorn.MemberExpression,
				);
				if (methodName) return `result of .${methodName}() on PII data`;
			}
		}

		return undefined;
	}
}
