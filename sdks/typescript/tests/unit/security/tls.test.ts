import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createChannelCredentials,
	createServerCredentials,
} from "../../../src/rpc/tls.js";

describe("LIOP TLS Configuration", () => {
	const originalEnv = process.env.NODE_ENV;
	const originalEnforce = process.env.LIOP_ENFORCE_TLS;

	beforeEach(() => {
		delete process.env.LIOP_ENFORCE_TLS;
		process.env.NODE_ENV = "test";
	});

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
		if (originalEnforce !== undefined) {
			process.env.LIOP_ENFORCE_TLS = originalEnforce;
		} else {
			delete process.env.LIOP_ENFORCE_TLS;
		}
	});

	it("should create insecure credentials when no TLS options are provided in non-production", () => {
		const serverCreds = createServerCredentials();
		expect(serverCreds).toBeDefined();

		const channelCreds = createChannelCredentials();
		expect(channelCreds).toBeDefined();
	});

	it("should support explicit insecure flag and suppressWarning options", () => {
		const channelCredsInsecure = createChannelCredentials({ insecure: true });
		expect(channelCredsInsecure).toBeDefined();

		const channelCredsSuppressed = createChannelCredentials({
			suppressWarning: true,
		});
		expect(channelCredsSuppressed).toBeDefined();

		const serverCredsInsecure = createServerCredentials({ insecure: true });
		expect(serverCredsInsecure).toBeDefined();

		const serverCredsSuppressed = createServerCredentials({
			suppressWarning: true,
		});
		expect(serverCredsSuppressed).toBeDefined();
	});

	it("should honor LIOP_SUPPRESS_TLS_WARNING environment variable", () => {
		process.env.LIOP_SUPPRESS_TLS_WARNING = "true";
		try {
			const channelCreds = createChannelCredentials();
			expect(channelCreds).toBeDefined();
			const serverCreds = createServerCredentials();
			expect(serverCreds).toBeDefined();
		} finally {
			delete process.env.LIOP_SUPPRESS_TLS_WARNING;
		}
	});

	it("should throw a fatal error when LIOP_ENFORCE_TLS=true even if insecure=true is passed", () => {
		process.env.LIOP_ENFORCE_TLS = "true";

		expect(() => createServerCredentials({ insecure: true })).toThrow(
			/FATAL: TLS certificates required/,
		);
		expect(() => createChannelCredentials({ insecure: true })).toThrow(
			/FATAL: TLS root certificate required/,
		);
	});
});
