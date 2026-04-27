import { describe, expect, it } from "vitest";
import {
	GuardianTS,
	GuardianViolationError,
} from "../../../src/security/guardian.js";

/**
 * Guardian AST Security Tests
 *
 * Validates the LIOP Zero-Trust WASM import scanner that prevents
 * sandbox escapes by rejecting any module imports outside the
 * wasi_snapshot_preview1 and LIOP namespaces.
 *
 * WASM binary format reference:
 * - Magic: 0x00 0x61 0x73 0x6d
 * - Version: 0x01 0x00 0x00 0x00
 * - Section format: id(1 byte) + LEB128 length + content
 */
describe("GuardianTS — AST Import Scanner", () => {
	/** Minimal valid WASM module: (module) with no imports */
	const MINIMAL_WASM = new Uint8Array([
		0x00, 0x61, 0x73, 0x6d, // Magic: \0asm
		0x01, 0x00, 0x00, 0x00, // Version: 1
	]);

	/**
	 * Build a WASM module with a single function import.
	 * Encodes type section + import section with proper LEB128 lengths.
	 */
	function buildImportWasm(moduleName: string, funcName: string): Uint8Array {
		const moduleBytes = new TextEncoder().encode(moduleName);
		const funcBytes = new TextEncoder().encode(funcName);

		// Type section: 1 type -> func () -> ()
		const typeSection = new Uint8Array([
			0x01, // section id: Type
			0x04, // section length: 4 bytes
			0x01, // 1 type
			0x60, // func
			0x00, // 0 params
			0x00, // 0 results
		]);

		// Import section payload
		const importPayload = new Uint8Array([
			0x01, // 1 import
			moduleBytes.length,
			...moduleBytes,
			funcBytes.length,
			...funcBytes,
			0x00, // kind: func
			0x00, // type index: 0
		]);

		const importSection = new Uint8Array([
			0x02, // section id: Import
			importPayload.length, // section length
			...importPayload,
		]);

		// Combine: header + type section + import section
		const header = new Uint8Array([
			0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
		]);
		const result = new Uint8Array(
			header.length + typeSection.length + importSection.length,
		);
		result.set(header, 0);
		result.set(typeSection, header.length);
		result.set(importSection, header.length + typeSection.length);
		return result;
	}

	it("should accept a minimal WASM module with zero imports", async () => {
		const module = await GuardianTS.analyzeAst(MINIMAL_WASM);
		expect(module).toBeDefined();
		const imports = WebAssembly.Module.imports(module);
		expect(imports).toHaveLength(0);
	});

	it("should accept WASM with wasi_snapshot_preview1 imports", async () => {
		const wasiWasm = buildImportWasm("wasi_snapshot_preview1", "fd_write");
		const module = await GuardianTS.analyzeAst(wasiWasm);
		expect(module).toBeDefined();
		const imports = WebAssembly.Module.imports(module);
		expect(imports.length).toBe(1);
		expect(imports[0].module).toBe("wasi_snapshot_preview1");
		expect(imports[0].name).toBe("fd_write");
	});

	it("should accept WASM with LIOP namespace imports", async () => {
		const liopWasm = buildImportWasm("LIOP", "get_records");
		const module = await GuardianTS.analyzeAst(liopWasm);
		expect(module).toBeDefined();
		const imports = WebAssembly.Module.imports(module);
		expect(imports[0].module).toBe("LIOP");
	});

	it("should reject WASM with forbidden 'env' host imports", async () => {
		const envWasm = buildImportWasm("env", "shell_exec");
		await expect(GuardianTS.analyzeAst(envWasm)).rejects.toThrow(
			GuardianViolationError,
		);
		await expect(GuardianTS.analyzeAst(envWasm)).rejects.toThrow(
			"Banned Host Import Detected: env/shell_exec",
		);
	});

	it("should reject WASM with forbidden 'fs' host imports", async () => {
		const fsWasm = buildImportWasm("fs", "open");
		await expect(GuardianTS.analyzeAst(fsWasm)).rejects.toThrow(
			"Banned Host Import Detected: fs/open",
		);
	});

	it("should reject invalid WASM bytes (decompression bomb defense)", async () => {
		const invalidWasm = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0xff, 0xff]);
		await expect(GuardianTS.analyzeAst(invalidWasm)).rejects.toThrow(
			GuardianViolationError,
		);
		await expect(GuardianTS.analyzeAst(invalidWasm)).rejects.toThrow(
			"structurally invalid",
		);
	});

	it("should produce correctly formatted GuardianViolationError", () => {
		const error = new GuardianViolationError("test violation");
		expect(error.name).toBe("GuardianViolationError");
		expect(error.message).toBe("[AST Security Violation]: test violation");
		expect(error).toBeInstanceOf(Error);
	});

	it("should handle Buffer input (Node.js compatibility)", async () => {
		const bufferInput = Buffer.from(MINIMAL_WASM);
		const module = await GuardianTS.analyzeAst(bufferInput);
		expect(module).toBeDefined();
	});
});
