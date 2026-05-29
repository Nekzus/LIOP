import { describe, it, expect } from "vitest";
import { WasiSandbox, getDefaultEnvironment } from "../../src/sandbox/wasi.js";
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

    it("should block TypedArray constructors (heap bomb DoS defense)", async () => {
        const heapBombLogic = `
            function liop_main(env) {
                try {
                    return typeof Uint8Array;
                } catch(e) {
                    return 'denied';
                }
            }
        `;

        const result = await sandbox.execute(heapBombLogic, [], {});
        // Uint8Array must be poisoned in the sandbox — undefined, not a constructor
        expect(result.output).toBe("undefined");
    });

    it("should block ArrayBuffer constructor (off-heap memory DoS defense)", async () => {
        const arrayBufferLogic = `
            function liop_main(env) {
                try {
                    return typeof ArrayBuffer;
                } catch(e) {
                    return 'denied';
                }
            }
        `;

        const result = await sandbox.execute(arrayBufferLogic, [], {});
        expect(result.output).toBe("undefined");
    });

    it("should prevent prototype pollution and capture TypeError immediately (strict mode)", async () => {
        const maliciousLogic = `
            function liop_main(env) {
                // Attempt prototype pollution inside the sandbox
                Object.prototype.poisoned = "leak";
                return "polluted";
            }
        `;

        const result = await sandbox.execute(maliciousLogic, [], {});
        expect(result.output).toContain("LogicError: Cannot add property poisoned, object is not extensible");

        // Verify that the host environment's prototype remains clean
        expect((Object.prototype as any).poisoned).toBeUndefined();
    });

    describe("Environment Isolation & getDefaultEnvironment", () => {
        it("should filter out non-allowlisted env variables", () => {
            const originalEnv = { ...process.env };
            
            // Set some mock variables
            process.env.LIOP_TOKEN_BANK = "sensitivetoken123";
            process.env.SECRET_API_KEY = "anothersecret";
            
            try {
                const env = getDefaultEnvironment();
                
                // Sensitive variables must not exist in the filtered env
                expect(env.LIOP_TOKEN_BANK).toBeUndefined();
                expect(env.SECRET_API_KEY).toBeUndefined();
                expect(env.NODE_ENV).toBe("production");
                expect(env.LIOP_NODE).toBe("true");
            } finally {
                // Restore environment
                delete process.env.LIOP_TOKEN_BANK;
                delete process.env.SECRET_API_KEY;
            }
        });

        it("should preserve allowlisted system variables based on platform", () => {
            const env = getDefaultEnvironment();
            const isWindows = process.platform === "win32";
            
            if (isWindows) {
                // Windows environment checks
                expect(env.PATH).toBeDefined();
            } else {
                // Unix environment checks
                expect(env.PATH).toBeDefined();
            }
        });

        it("should filter out shell function variables starting with ()", () => {
            const originalEnv = { ...process.env };
            
            // Set a mock shell function variable on an allowlisted key if possible,
            // or modify how PATH would behave if it were a function.
            // Let's mock a safe key to have value "()"
            const originalPath = process.env.PATH;
            process.env.PATH = "() { :; }; echo 'vulnerable'";
            
            try {
                const env = getDefaultEnvironment();
                expect(env.PATH).toBeUndefined();
            } finally {
                if (originalPath) {
                    process.env.PATH = originalPath;
                } else {
                    delete process.env.PATH;
                }
            }
        });
    });
});
