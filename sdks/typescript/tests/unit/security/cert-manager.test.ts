import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createChannelCredentials,
	createServerCredentials,
} from "../../../src/rpc/tls.js";
import { CertManager } from "../../../src/security/cert-manager.js";
import {
	cleanupTestCertDir,
	createTestCertDir,
} from "../../fixtures/test-certs.js";

describe("CertManager & Mutual TLS (mTLS)", () => {
	let activeManager: CertManager | null = null;
	let certPaths: ReturnType<typeof createTestCertDir>;

	beforeEach(() => {
		certPaths = createTestCertDir();
	});

	afterEach(() => {
		if (activeManager) {
			activeManager.dispose();
			activeManager = null;
		}
		cleanupTestCertDir(certPaths.dir);
	});

	it("should load valid certificates and inspect X.509 metadata", () => {
		activeManager = new CertManager({
			rootCertPath: certPaths.rootCertPath,
			certChainPath: certPaths.certChainPath,
			privateKeyPath: certPaths.privateKeyPath,
			watchFiles: false,
		});

		const info = activeManager.inspectCertificate();
		expect(info.subject).toContain("liop-test-node");
		expect(info.daysRemaining).toBeGreaterThan(0);
		expect(info.isExpired).toBe(false);
		expect(typeof info.fingerprint256).toBe("string");
		expect(activeManager.getRootCert()).not.toBeNull();
		expect(activeManager.getCertChain().length).toBeGreaterThan(0);
		expect(activeManager.getPrivateKey().length).toBeGreaterThan(0);
	});

	it("should throw when certificate chain or key file does not exist", () => {
		expect(
			() =>
				new CertManager({
					certChainPath: "/non/existent/cert.pem",
					privateKeyPath: certPaths.privateKeyPath,
					watchFiles: false,
				}),
		).toThrow(/Certificate chain file not found/);
	});

	it("should enforce mTLS and create secure server credentials with client verification", () => {
		activeManager = new CertManager({
			rootCertPath: certPaths.rootCertPath,
			certChainPath: certPaths.certChainPath,
			privateKeyPath: certPaths.privateKeyPath,
			watchFiles: false,
		});

		const serverCreds = createServerCredentials({
			certManager: activeManager,
			mutualTls: true,
		});
		expect(serverCreds).toBeDefined();

		const channelCreds = createChannelCredentials({
			certManager: activeManager,
		});
		expect(channelCreds).toBeDefined();
	});

	it("should reject mTLS when no root CA is provided to verify client certificates", () => {
		expect(() =>
			createServerCredentials({
				certChain: certPaths.certChainPath,
				privateKey: certPaths.privateKeyPath,
				mutualTls: true, // Missing rootCert
			}),
		).toThrow(/FATAL: Mutual TLS \(mTLS\) enabled but no root CA certificate/);
	});

	it("should support hot reloading when certificate files change", async () => {
		const tempCert = path.join(certPaths.dir, "temp-cert.pem");
		const tempKey = path.join(certPaths.dir, "temp-key.pem");
		fs.copyFileSync(certPaths.certChainPath, tempCert);
		fs.copyFileSync(certPaths.privateKeyPath, tempKey);

		activeManager = new CertManager({
			certChainPath: tempCert,
			privateKeyPath: tempKey,
			watchFiles: true,
		});

		let reloadEmitted = false;
		activeManager.on("reload", (info) => {
			reloadEmitted = true;
			expect(info.subject).toBeDefined();
		});

		// Touch the temp certificate file to trigger reload
		const content = fs.readFileSync(tempCert);
		fs.writeFileSync(tempCert, content);

		// Await debounced watcher reload
		await new Promise((resolve) => setTimeout(resolve, 500));
		expect(reloadEmitted).toBe(true);
	});
});
