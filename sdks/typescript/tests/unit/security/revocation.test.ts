import * as fs from "node:fs";
import * as path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LiopServer } from "../../../src/server/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Local Token Revocation Governance (RTRL)", () => {
	const tempDir = path.resolve(__dirname, "temp-test");
	const revocationPath = path.join(tempDir, "test-revocations.json");

	beforeEach(() => {
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}
	});

	afterEach(() => {
		if (fs.existsSync(revocationPath)) {
			fs.unlinkSync(revocationPath);
		}
		if (fs.existsSync(tempDir)) {
			fs.rmdirSync(tempDir);
		}
	});

	it("should initialize an empty revocation list on startup if file does not exist", () => {
		expect(fs.existsSync(revocationPath)).toBe(false);

		const server = new LiopServer(
			{ name: "test-server", version: "1.0.0" },
			{
				auth: {
					role: "node",
					revocationPath,
				},
			},
		);

		expect(fs.existsSync(revocationPath)).toBe(true);
		const content = fs.readFileSync(revocationPath, "utf-8");
		expect(JSON.parse(content)).toEqual([]);
	});

	it("should calculate SHA-256 hash and add token to local revocation list", () => {
		const server = new LiopServer(
			{ name: "test-server", version: "1.0.0" },
			{
				auth: {
					role: "node",
					revocationPath,
				},
			},
		);

		const token = "some-super-secret-token";
		const expectedHash = crypto
			.createHash("sha256")
			.update(token)
			.digest("hex")
			.toLowerCase();

		server.revokeToken(token);

		// Read file from disk to check persistence
		const content = fs.readFileSync(revocationPath, "utf-8");
		const revokedList = JSON.parse(content);
		expect(revokedList).toContain(expectedHash);

		// Also check live memory cache via internal state check
		// (We can check via direct hash check)
		server.revokeTokenHash(expectedHash); // should handle duplicate gracefully
	});

	it("should load existing revoked hashes from disk on startup", () => {
		const hash1 = crypto.createHash("sha256").update("token-1").digest("hex").toLowerCase();
		const hash2 = crypto.createHash("sha256").update("token-2").digest("hex").toLowerCase();

		fs.writeFileSync(revocationPath, JSON.stringify([hash1, hash2], null, 2), "utf-8");

		const server = new LiopServer(
			{ name: "test-server", version: "1.0.0" },
			{
				auth: {
					role: "node",
					revocationPath,
				},
			},
		);

		// Manually inspect if they are loaded using revokeTokenHash behavior
		// Since we don't expose the internal Set, we can verify that loading doesn't throw and loads properly
		const mockHash = crypto.createHash("sha256").update("token-3").digest("hex").toLowerCase();
		server.revokeTokenHash(mockHash);

		const content = fs.readFileSync(revocationPath, "utf-8");
		const revokedList = JSON.parse(content);
		expect(revokedList).toContain(hash1);
		expect(revokedList).toContain(hash2);
		expect(revokedList).toContain(mockHash);
	});

	it("should reload file from disk dynamically if the file's modification time changes", () => {
		const server = new LiopServer(
			{ name: "test-server", version: "1.0.0" },
			{
				auth: {
					role: "node",
					revocationPath,
				},
			},
		);

		const token = "live-token";
		const hash = crypto.createHash("sha256").update(token).digest("hex").toLowerCase();

		// Manually write to the file externally (simulating hot-revocation from Windows/Docker volume)
		fs.writeFileSync(revocationPath, JSON.stringify([hash], null, 2), "utf-8");

		// Wait slightly to make sure the timestamp modification is detectable or update it manually
		const futureTime = Date.now() / 1000 + 10;
		fs.utimesSync(revocationPath, futureTime, futureTime);

		// Calling revokeTokenHash internally triggers loadRevocationList, which should see the modification
		const newHash = crypto.createHash("sha256").update("another-token").digest("hex").toLowerCase();
		server.revokeTokenHash(newHash);

		const content = fs.readFileSync(revocationPath, "utf-8");
		const revokedList = JSON.parse(content);
		expect(revokedList).toContain(hash);
		expect(revokedList).toContain(newHash);
	});
});
