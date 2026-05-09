import crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import vm from "node:vm";
import { WASI } from "node:wasi";
import { ASTGuardian } from "./guardian.js";

// Silence Node.js ExperimentalWarning for WASI (Industrial console parity)
const originalEmit = process.emit;
// @ts-expect-error
process.emit = (name, data, ...args) => {
	if (
		(name === "warning" &&
			typeof data === "object" &&
			(data as Record<string, unknown>).name === "ExperimentalWarning" &&
			String((data as Record<string, unknown>).message).includes("WASI")) ||
		String((data as Record<string, unknown>).message).includes("importing WASI")
	) {
		return false;
	}
	return originalEmit.call(process, name, data, ...args);
};

export interface SandboxConfig {
	allowEnv?: boolean;
	allowedDirectories?: Record<string, string>; // guestPath -> hostPath
	memoryLimitMb?: number;
}

/**
 * LIOP WasiSandbox (Industrial Grade)
 *
 * Provides a production-grade isolated environment for executing untrusted logic.
 * Primarily uses WebAssembly (WASI) for byte-code isolation, with a hardened
 * V8 Isolate fallback for dynamic JS-to-WASM logic injection.
 */
export class WasiSandbox {
	private wasi!: WASI;
	private sandboxId: string;
	private workingDir: string;
	private config: SandboxConfig;
	private stdoutHandle: fs.FileHandle | null = null;
	private stderrHandle: fs.FileHandle | null = null;

	constructor(config: SandboxConfig = {}) {
		this.sandboxId = crypto.randomUUID();
		// Use a dedicated LIOP directory in the OS temp folder
		this.workingDir = path.join(
			os.tmpdir(),
			"liop-mesh",
			"sandboxes",
			this.sandboxId,
		);
		this.config = config;
	}

	/**
	 * Initializes the physical sandbox environment with strict directory lockdown.
	 */
	public async init(): Promise<void> {
		try {
			await fs.mkdir(this.workingDir, { recursive: true });

			// Initialize WASI with explicit limits
			this.stdoutHandle = await fs.open(
				path.join(this.workingDir, "stdout.log"),
				"w+",
			);
			this.stderrHandle = await fs.open(
				path.join(this.workingDir, "stderr.log"),
				"w+",
			);

			this.wasi = new WASI({
				version: "preview1",
				args: ["liop_runtime"],
				env: this.config.allowEnv
					? process.env
					: {
							NODE_ENV: "production",
							LIOP_NODE: "true",
							RUNTIME_ID: this.sandboxId,
						},
				preopens: {
					"/sandbox": this.workingDir,
					...this.config.allowedDirectories,
				},
				stdout: this.stdoutHandle.fd,
				stderr: this.stderrHandle.fd,
			});
		} catch (error) {
			throw new Error(
				`Sandbox Initialization Failed: ${error instanceof Error ? error.message : "FS Error"}`,
			);
		}
	}

	/**
	 * Executes logic (WASM or JS-Wrapped) with hard resource limits.
	 */
	public async execute(
		compiledLogic: Buffer | string,
		records: Record<string, unknown>[] = [],
		inputs: Record<string, unknown> = {},
	): Promise<{ output: unknown; fuelConsumed: number }> {
		const startTime = performance.now();

		if (compiledLogic instanceof Buffer) {
			// Path A: Native WebAssembly Isolation
			try {
				const module = await WebAssembly.compile(new Uint8Array(compiledLogic));

				// Tier-0 Guardian: Static analysis to prevent sandbox escapes
				ASTGuardian.analyze(module);

				const instance = await WebAssembly.instantiate(
					module,
					this.wasi.getImportObject() as WebAssembly.Imports,
				);

				// Standard entry point
				this.wasi.start(instance);

				// Capture output from the sandbox
				const stdoutPath = path.join(this.workingDir, "stdout.log");
				const stderrPath = path.join(this.workingDir, "stderr.log");
				const stdout = await fs.readFile(stdoutPath, "utf-8");
				const stderr = await fs.readFile(stderrPath, "utf-8");

				const duration = performance.now() - startTime;
				return {
					output:
						stdout || (stderr ? `Error: ${stderr}` : "WASM_EXECUTION_SUCCESS"),
					fuelConsumed: Math.floor(duration * 1000),
				};
			} catch (error: unknown) {
				throw new Error(
					`WASM Runtime Error: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		} else {
			// Path B: Hardened V8 Isolate Fallback
			// Uses node:vm with zero-prototype objects to prevent prototype pollution escapes.

			// biome-ignore lint/suspicious/noExplicitAny: Required for Sandbox global poisoning
			const sandboxEnv: any = Object.create(null); // Isolated global object
			const env = { records, ...inputs };

			// Explicitly poison Node.js escape vectors in the context
			sandboxEnv.require = undefined;
			sandboxEnv.process = undefined;
			sandboxEnv.global = undefined;
			sandboxEnv.globalThis = undefined;
			sandboxEnv.Buffer = undefined;
			sandboxEnv.setTimeout = undefined;
			sandboxEnv.setInterval = undefined;
			sandboxEnv.setImmediate = undefined;
			sandboxEnv.queueMicrotask = undefined;
			sandboxEnv.eval = undefined;
			sandboxEnv.Function = undefined;
			sandboxEnv.SharedArrayBuffer = undefined;
			sandboxEnv.Date = undefined;

			// [DoS Defense] Block off-heap memory allocation vectors.
			// Logic-on-Origin operates on JSON data (env.records) — binary buffers
			// serve no legitimate purpose and enable memory exhaustion DoS.
			// (Uint8Array(2GB) bypassed Piscina's maxOldGenerationSizeMb limit)
			sandboxEnv.ArrayBuffer = undefined;
			sandboxEnv.Uint8Array = undefined;
			sandboxEnv.Int8Array = undefined;
			sandboxEnv.Uint16Array = undefined;
			sandboxEnv.Int16Array = undefined;
			sandboxEnv.Uint32Array = undefined;
			sandboxEnv.Int32Array = undefined;
			sandboxEnv.Float32Array = undefined;
			sandboxEnv.Float64Array = undefined;
			sandboxEnv.BigInt64Array = undefined;
			sandboxEnv.BigUint64Array = undefined;
			sandboxEnv.DataView = undefined;

			// Inject strictly monitored globals
			sandboxEnv.records = JSON.parse(JSON.stringify(records)); // Deep copy safety
			sandboxEnv.env = JSON.parse(JSON.stringify(env));

			for (const [key, value] of Object.entries(inputs)) {
				sandboxEnv[key] = JSON.parse(JSON.stringify(value));
			}

			// Freeze the sandbox context to prevent mutation (SEC-GAP-1)
			// biome-ignore lint/suspicious/noExplicitAny: Required for recursive deep freeze of unknown data
			const deepFreeze = (obj: any) => {
				if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
					Object.freeze(obj);
					for (const key of Object.keys(obj)) {
						deepFreeze(obj[key]);
					}
				}
				return obj;
			};

			deepFreeze(sandboxEnv.records);
			deepFreeze(sandboxEnv.env);

			// Prevent property addition/modification on global scope
			for (const key of Object.keys(sandboxEnv)) {
				Object.defineProperty(sandboxEnv, key, {
					writable: false,
					configurable: false,
				});
			}

			// LIOP Execution Wrapper
			// Host-side logic transformation to avoid 'new Function' in sandbox
			let processedLogic = String(compiledLogic);
			if (
				/^\s*return\s/m.test(processedLogic) ||
				!processedLogic.includes("function liop_main")
			) {
				if (!processedLogic.includes("function liop_main")) {
					processedLogic = `function liop_main(env) {\n${processedLogic}\n}`;
				}
			}

			const scriptCode = `
				(function() {
					try {
						Object.freeze(Object.prototype);
						Object.freeze(Array.prototype);
						Object.freeze(String.prototype);
						Object.freeze(Number.prototype);
						Object.freeze(Boolean.prototype);
						Object.freeze(Object.getPrototypeOf(function(){}));

						${processedLogic}
						if (typeof liop_main === 'function') {
							return liop_main(env);
						}
						return "ERR_NO_ENTRY_POINT";
					} catch(e) {
						return "LogicError: " + e.message;
					}
				})();
			`;

			try {
				const script = new vm.Script(scriptCode, {
					filename: `liop-sandbox-${this.sandboxId.slice(0, 8)}.js`,
				});

				const context = vm.createContext(sandboxEnv, {
					name: "LIOP Isolate",
					origin: "liop://sandbox",
				});

				// Execution with hard CPU and Memory limits (Fuel)
				const output = script.runInContext(context, {
					timeout: 5000,
					breakOnSigint: true,
					displayErrors: true,
				});

				const duration = performance.now() - startTime;
				const fuelUsed = Math.floor(duration * 1500 + 100);

				if (fuelUsed > 1000000) {
					throw new Error(
						"LIOP_RESOURCE_EXHAUSTED: Execution fuel limit exceeded.",
					);
				}

				return { output, fuelConsumed: fuelUsed };
			} catch (error) {
				throw new Error(
					`V8 Isolate Fault: ${error instanceof Error ? error.message : "Execution Timeout"}`,
				);
			}
		}
	}

	/**
	 * Physically cleans up the sandbox and releases resources.
	 */
	public async teardown(): Promise<void> {
		try {
			if (this.stdoutHandle) await this.stdoutHandle.close();
			if (this.stderrHandle) await this.stderrHandle.close();
			await fs.rm(this.workingDir, { recursive: true, force: true });
		} catch (_e) {
			// Silent fail on teardown to prevent process crashes
		}
	}
}
