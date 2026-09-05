// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { resolveTargetConfig } from "../src/cli/scan.js";
import {
	sanitizeCommand,
	sanitizeUrl,
	validateHostHeader,
} from "../src/security/sanitizer.js";
import {
	createTransport,
	GrpcTransport,
	HttpTransport,
	MeshTransport,
	StdioTransport,
} from "../src/transports/index.js";

describe("LIOP Studio: Security Sanitizer", () => {
	it("should allow safe command execution strings", () => {
		expect(() => sanitizeCommand("node")).not.toThrow();
		expect(() => sanitizeCommand("npx")).not.toThrow();
		expect(() => sanitizeCommand("python3")).not.toThrow();
		expect(() => sanitizeCommand("./bin/server")).not.toThrow();
	});

	it("should block command injection with shell metacharacters (CWE-78)", () => {
		expect(() => sanitizeCommand("node; rm -rf /")).toThrow(
			/forbidden shell metacharacters/,
		);
		expect(() => sanitizeCommand("npx && cat /etc/passwd")).toThrow(
			/forbidden shell metacharacters/,
		);
		expect(() => sanitizeCommand("python | sh")).toThrow(
			/forbidden shell metacharacters/,
		);
		expect(() => sanitizeCommand("node `id`")).toThrow(
			/forbidden shell metacharacters/,
		);
		expect(() => sanitizeCommand("node $(whoami)")).toThrow(
			/forbidden shell metacharacters/,
		);
	});

	it("should block malicious arguments containing command separators", () => {
		expect(() => sanitizeCommand("node", ["server.js", ";", "calc"])).toThrow(
			/forbidden shell metacharacters/,
		);
		expect(() =>
			sanitizeCommand("node", ["--file", "test.js | grep secret"]),
		).toThrow(/forbidden shell metacharacters/);
	});

	it("should validate and allow benign HTTP/HTTPS URLs", () => {
		const url1 = sanitizeUrl("http://127.0.0.1:15000/mcp");
		expect(url1.hostname).toBe("127.0.0.1");

		const url2 = sanitizeUrl("https://api.example.com/v1/mcp");
		expect(url2.protocol).toBe("https:");
	});

	it("should block unsupported URL protocols (e.g. file, ftp)", () => {
		expect(() => sanitizeUrl("file:///etc/passwd")).toThrow(
			/Unsupported protocol/,
		);
		expect(() => sanitizeUrl("ftp://localhost/resource")).toThrow(
			/Unsupported protocol/,
		);
	});

	it("should block link-local and cloud metadata SSRF targets (CWE-918)", () => {
		expect(() =>
			sanitizeUrl("http://169.254.169.254/latest/meta-data/"),
		).toThrow(/Access to link-local metadata address is strictly prohibited/);
		expect(() =>
			sanitizeUrl("http://metadata.google.internal/computeMetadata"),
		).toThrow(/Access to link-local metadata address is strictly prohibited/);
	});

	it("should validate host header for DNS rebinding protection", () => {
		expect(validateHostHeader("localhost:16000")).toBe(true);
		expect(validateHostHeader("127.0.0.1:16000")).toBe(true);
		expect(validateHostHeader("0.0.0.0:16000")).toBe(true);
		expect(validateHostHeader("evil-attacker.com:16000")).toBe(false);
	});
});

describe("LIOP Studio: Transport Factory & Implementations", () => {
	it("should instantiate StdioTransport and reject invalid commands", () => {
		const transport = new StdioTransport({
			command: "node",
			args: ["--version"],
		});
		expect(transport.type).toBe("stdio");
		expect(transport.isConnected()).toBe(false);

		expect(
			() =>
				new StdioTransport({
					command: "node; whoami",
				}),
		).toThrow(/forbidden shell metacharacters/);
	});

	it("should instantiate HttpTransport and validate configuration", () => {
		const transport = new HttpTransport({
			url: "http://127.0.0.1:15000/mcp",
			token: "test-token",
		});
		expect(transport.type).toBe("http");
		expect(transport.isConnected()).toBe(false);

		expect(
			() =>
				new HttpTransport({
					url: "http://169.254.169.254/metadata",
				}),
		).toThrow(/Access to link-local metadata address is strictly prohibited/);
	});

	it("should instantiate GrpcTransport and parse target address", () => {
		const transport = new GrpcTransport({
			target: "grpc://127.0.0.1:13011",
		});
		expect(transport.type).toBe("grpc");
		expect(transport.isConnected()).toBe(false);
	});

	it("should instantiate MeshTransport for sovereign P2P", () => {
		const transport = new MeshTransport({});
		expect(transport.type).toBe("mesh");
		expect(transport.isConnected()).toBe(false);
	});

	it("should resolve polymorphically via createTransport", () => {
		const t1 = createTransport({
			type: "stdio",
			stdio: { command: "node", args: ["server.js"] },
		});
		expect(t1.type).toBe("stdio");

		const t2 = createTransport({
			type: "http",
			http: { url: "http://localhost:3000/mcp" },
		});
		expect(t2.type).toBe("http");

		const t3 = createTransport({
			type: "grpc",
			grpc: { target: "127.0.0.1:13011" },
		});
		expect(t3.type).toBe("grpc");

		const t4 = createTransport({
			type: "mesh",
		});
		expect(t4.type).toBe("mesh");
	});
});

describe("LIOP Studio: CLI Target Resolution", () => {
	it("should resolve HTTP URLs automatically", () => {
		const target = resolveTargetConfig(["http://127.0.0.1:15000/mcp"], {});
		expect(target.type).toBe("http");
		expect(target.http?.url).toBe("http://127.0.0.1:15000/mcp");
	});

	it("should resolve gRPC host:port targets", () => {
		const target = resolveTargetConfig(["127.0.0.1:13011"], { grpc: true });
		expect(target.type).toBe("grpc");
		expect(target.grpc?.target).toBe("127.0.0.1:13011");
	});

	it("should resolve stdio commands with arguments", () => {
		const target = resolveTargetConfig(["node", "./dist/server.js"], {});
		expect(target.type).toBe("stdio");
		expect(target.stdio?.command).toBe("node");
		expect(target.stdio?.args).toEqual(["./dist/server.js"]);
	});

	it("should resolve mesh mode when requested", () => {
		const target = resolveTargetConfig([], { mesh: true });
		expect(target.type).toBe("mesh");
	});
});
