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

	it("should throw a fatal error when LIOP_ENFORCE_TLS=true and no certificates are provided", () => {
		process.env.LIOP_ENFORCE_TLS = "true";

		expect(() => createServerCredentials()).toThrow(
			/FATAL: TLS certificates required/,
		);
		expect(() => createChannelCredentials()).toThrow(
			/FATAL: TLS root certificate required/,
		);
	});
});
