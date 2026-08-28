import { describe, expect, it } from "vitest";
import {
	WasiSandbox,
	calculateAstInstructionFuel,
} from "../../../src/sandbox/wasi.js";

describe("Deterministic AST Instruction Fuel Metering (Phase Beta-3)", () => {
	it("should calculate exact identical fuel across multiple runs for the same logic", () => {
		const logic = `
const records = env.records;
let sum = 0;
for (let i = 0; i < records.length; i++) {
  sum += records[i].balance;
}
return { average: sum / (records.length || 1) };
`;
		const fuel1 = calculateAstInstructionFuel(logic);
		const fuel2 = calculateAstInstructionFuel(logic);
		const fuel3 = calculateAstInstructionFuel(logic);

		expect(fuel1).toBe(fuel2);
		expect(fuel2).toBe(fuel3);
		expect(fuel1).toBeGreaterThanOrEqual(100);
		// Normalized to multiple of 100
		expect(fuel1 % 100).toBe(0);
	});

	it("should scale fuel with complexity of AST structures (loops, functions, objects)", () => {
		const simpleLogic = "return 42;";
		const complexLogic = `
function compute(items) {
  const map = {};
  for (const item of items) {
    if (item.active) {
      map[item.id] = item.value * 2;
    }
  }
  return map;
}
return compute(env.records);
`;

		const simpleFuel = calculateAstInstructionFuel(simpleLogic);
		const complexFuel = calculateAstInstructionFuel(complexLogic);

		expect(complexFuel).toBeGreaterThan(simpleFuel);
	});

	it("should return fallback fuel for unparseable syntax without crashing", () => {
		const brokenCode = "function { broken syntax %%%";
		const fuel = calculateAstInstructionFuel(brokenCode);
		expect(fuel).toBe(500);
	});

	it("should execute inside WasiSandbox and return deterministic fuelConsumed", async () => {
		const sandbox = new WasiSandbox();
		try {
			const logic = `
const records = env.records;
return { count: records.length };
`;
			const res1 = await sandbox.execute(logic, [{ a: 1 }, { a: 2 }]);
			const res2 = await sandbox.execute(logic, [{ a: 1 }, { a: 2 }]);

			expect(res1.output).toEqual({ count: 2 });
			expect(res2.output).toEqual({ count: 2 });
			// Zero hardware drift: both executions report exact identical fuel!
			expect(res1.fuelConsumed).toBe(res2.fuelConsumed);
		} finally {
			await sandbox.teardown();
		}
	});
});
