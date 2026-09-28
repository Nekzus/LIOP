// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
	calculateAstInstructionFuel,
	WasiSandbox,
} from "../../../src/sandbox/wasi.js";

describe("Side-Channel & Microarchitectural Defenses (NIST SC-39 / Brecha 4)", () => {
	it("should eliminate high-resolution timing APIs (performance, Intl, Date) from V8 sandbox", async () => {
		const sandbox = new WasiSandbox();
		const logic = `
			return {
				hasPerformance: typeof performance !== "undefined",
				hasIntl: typeof Intl !== "undefined",
				hasDate: typeof Date !== "undefined",
				hasSharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
				hasHrtime: typeof process !== "undefined" && typeof process.hrtime !== "undefined",
			};
		`;

		const result = await sandbox.execute(logic, {}, []);
		expect(result.output).toEqual({
			hasPerformance: false,
			hasIntl: false,
			hasDate: false,
			hasSharedArrayBuffer: false,
			hasHrtime: false,
		});
	});

	it("should deterministically quantize AST instruction fuel in 100-unit buckets", () => {
		const smallLogic = "return 1 + 1;";
		const slightlyLargerLogic = "const a = 1; const b = 2; return a + b;";

		const fuelSmall = calculateAstInstructionFuel(smallLogic);
		const fuelLarger = calculateAstInstructionFuel(slightlyLargerLogic);

		expect(fuelSmall % 100).toBe(0);
		expect(fuelLarger % 100).toBe(0);
		expect(fuelSmall).toBeGreaterThanOrEqual(100);
	});
});
