import { describe, it, expect } from "vitest";
import { WasiSandbox } from "../../src/sandbox/wasi.js";
import { type LogicRequest } from "../../src/rpc/types.js";

describe("WasiSandbox (Industrial Tier-0)", () => {
    const sandbox = new WasiSandbox();
    
    it("should execute basic logic in a secure node:vm context", async () => {
        // We wrap the logic in a function that the sandbox expects
        const logic = "function liop_main(env) { return env.num * 2; }";
        
        const result = await sandbox.execute(logic, [], { num: 21 });
        expect(result.output).toBe(42);
    });

    it("should restrict access to unauthorized node globals", async () => {
        const maliciousLogic = `
            function liop_main(env) {
                try {
                    return typeof process;
                } catch(e) {
                    return 'denied';
                }
            }
        `;
        
        const result = await sandbox.execute(maliciousLogic, [], {});
        // In our VM context, 'process' should be undefined
        expect(result.output).toBe("undefined");
    });

    it("should respect fuel/resource limits (Infinite Loop Detection)", async () => {
        const loopLogic = "function liop_main(env) { while(true) {} }";
        
        // This should timeout or exhaust fuel.
        // We pass a very short timeout to the VM runInContext via inputs or config if possible, 
        // but here we just rely on the default or the fact it's an infinite loop.
        await expect(sandbox.execute(loopLogic, [], {})).rejects.toThrow(/Isolate Fault/);
    }, 15000);
});
