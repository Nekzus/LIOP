import { describe, it, expect } from "vitest";
import { LiopVerifier } from "../../src/crypto/verifier.js";
import crypto from "node:crypto";

describe("LiopVerifier (Industrial Tier-0)", () => {
    const verifier = new LiopVerifier();
    const mockPayload = Buffer.from("return 1;");
    
    it("should derive deterministic ImageID (SHA-256)", async () => {
        const id1 = verifier.deriveImageId(mockPayload);
        const id2 = verifier.deriveImageId(mockPayload);
        
        expect(id1.toString("hex")).toBe(id2.toString("hex"));
        expect(id1.toString("hex")).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it("should verify a matching ZK-Receipt ImageID", async () => {
        const imageId = verifier.deriveImageId(mockPayload);
        const isValid = await verifier.verifyZkReceipt(
            mockPayload,
            imageId.toString("hex"),
            Buffer.alloc(32, "a") // 32 bytes for Tier-0 validation
        );
        
        expect(isValid).toBe(true);
    });

    it("should reject mismatching Evidence Hash (Tamper Detection)", async () => {
        const imageId = verifier.deriveImageId(mockPayload);
        const tamperedPayload = Buffer.from("return 2;");
        
        const isValid = await verifier.verifyZkReceipt(
            tamperedPayload,
            imageId.toString("hex"),
            Buffer.alloc(32, "a")
        );
        
        expect(isValid).toBe(false);
    });

    it("should reject mismatching ImageID (Proof Detection)", async () => {
        const _imageId = verifier.deriveImageId(mockPayload);
        const wrongImageId = "0".repeat(64);
        
        const isValid = await verifier.verifyZkReceipt(
            mockPayload,
            wrongImageId,
            Buffer.alloc(32, "a")
        );
        
        expect(isValid).toBe(false);
    });
});
