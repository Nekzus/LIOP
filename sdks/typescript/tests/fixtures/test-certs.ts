/**
 * Test Certificate Fixtures for mTLS & CertManager
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export const TEST_CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIDDDCCAfSgAwIBAgIQVQdIYgiuRZ5KLJCxJAxipDANBgkqhkiG9w0BAQsFADAZ
MRcwFQYDVQQDDA5saW9wLXRlc3Qtbm9kZTAeFw0yNjA4MjcxNDIzNDNaFw0yNzA4
MjcxNDQzNDNaMBkxFzAVBgNVBAMMDmxpb3AtdGVzdC1ub2RlMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv6ISTu2Incu959AfNwvtcc7TGBDpLDpwRj7l
Q1Pf7ErpHezed5IBs/QrEheEnShbRahOzdJMVkts7lhnuloKrTdx4Nn44HeG4vRT
JnPHdbynJYlN6+ZkLdrG2YId94J3ujR0B2dmDymlIuj+nkq8wv68xnJw/IlCiXNh
mC969gXGysVG54yf5ReXvAr2zSWcqvXUAi9hNwGX9q6mY3F9Ph9rVa3DFfrxhdHC
xDZqI49jt+WnejQ685Zq8jK57gWoBwSfin66lSGpfHi0zLWaFJ8v6oh0Mr2BhJUs
A0AOncnYYGc+oa4ADGn1sMNfpYe8d5IBCn8/AXktry0kTrD2TQIDAQABo1AwTjAO
BgNVHQ8BAf8EBAMCBaAwHQYDVR0lBBYwFAYIKwYBBQUHAwIGCCsGAQUFBwMBMB0G
A1UdDgQWBBTbVxlwR+tGPGbheOlCG+wVF2QLKzANBgkqhkiG9w0BAQsFAAOCAQEA
bSYvZtmtRMAur3c33SXQJ8S4bKGTsljKRwkcmMfeoBPEKi3ysF08xl5Ltm36zQiq
a6hjkKYtlJdIVDQk6NZSe57LbKYlSIFcVyudxV4rtltLPEUaMgTSH9AW+GJiYiyY
+4VwdrKDqERn5J7gDM+ybMgmZaSI0slG9CHF0/sBfZdZkThIuD5jOSweTpsOlSg0
KvfMICcbMUt2w+5o3zWGqsbw2kgGg/mvWy+cYSgYUHaszlvYuiqrveshmqVVEiap
J13rUfdyt6fxbMWQqn+5Hcn2w098bnpgWHkK/HicttQxfE4tMvHFjN6v47YmW9Q/
mx1LItSycaPEsINBGrX6Vw==
-----END CERTIFICATE-----`;

export const TEST_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCZtBONKnFm1DdT
UR5yh0tZDa8IJ5IRyqZCdd2W9rvm0ZkRnmqdrSWgUXsmNzzLCpXx2DlOf+Aj5BSd
wNvA3fph15BjW9b9uGeDNB8WKnQZ4gNlpzMcJ8neC+adpCAMLXPgSJ3ph6MOUP09
s3r9m6vhiiA+TzgZjt6NX2K5Ts+rA6nrIOmJ2Qk6TdsPRS9Qqrpitl5W7Pplcdp1
hBTOhoNpooJCckUGfiBKG+mbYAE1AzRp9aLizFNlqaRPsgF5UOjRYhFxISQ28SL6
73vlJPxVHsd8ohPd+avNm3khLkIJdhjQFf2dvKbASYmEzQVpiubqEgWUAVYimNJx
aQbAIuKrAgMBAAECggEABohmWlYm+sFjVpm4ixKgC7luqpCP/0yXM3TyBaQYCW/4
Kw0KKAh/dGhyLQYlAdZB2EUh7mm1+6CKlcfoLzLgHP9+BhMVuLP5RlTVS2pjg+Qc
09m+7N/uDw9/bkzXBd16stozSAU5U3byxIgX3qaasBvgUfWpA0EUyXp35jtozTJq
SblB23fHG/IWfzXUMC9wgHNMa8hrDImOTOkyQid237mYuoHmGWc74jKLtinOxODX
N52xtlv7n394BsyRiCZaemWoAKJhZYFpaTfjqncKoglHR5KvU9s4TKRMlVphpSoM
txftLedVsAI/et1jCySkYL9n5Jtw6b/MOipzP1OZQQKBgQDPnnqiiGnbV45586ub
GHz6Lynn+A16Ra7p5adcPIs/LkvkqDkWa9soweBB0qMbl8F6Z4ZsvkJytbq2ZzzH
x7K5jiti14mZeiQw2V/Gm7ZPBjqhDgqZrceaPrgx+fw2JxoTxOw+7yjYrR4Kl9Kq
t+FJzlMCQlu7pel1Hbw1ZKXYawKBgQC9hUIvmGACBtkSaP/gxkwbqA5V1DQ0uHOA
zyOEkOd1Yh/vzSw2tbfBxjqnHyBYBK9n5ZWksu06Y0bJrEw0nndjoAZZeD3LW1p8
hv8PpHHWtDlczqKbXKxJimvfkA/P6Y5ZNwjRZm5Yc5VqskNhff7C5CnuUUtlt2SC
sHt5GoauwQKBgQCwX5can/wdY6Ibo47ysLjq6EoXT7hTWQMgnAGy75PzVmcOloH4
tCN32kuiX0hE1oR8cZnWo0JbpFo7PjR6GwGPdGETFLtF8GbyQJeGZx1WwJnp273R
k7lvJTzg59cEQe97P9zaEd2HRHmy0gsbEB6Izofh8XFwVZ+f6GTMjvX8hQKBgHwQ
fjFWGJN7FCMfJVJpvWzlaOz6y2ovzTznXKLtkPeg0rNSprzx3Gc3czHwCGZWOtVS
z9FPaEiusKpY5lIT4qgPG9j6A8nZ9bRLUzFUP0mEFYERrBT0Z7yEpvVlA1Th2dPB
WT5rRZUVpRyBseZiaqH+Zwyhny/pDB0ZltrCaKSBAoGADwnIzOXPL1Ea8YoaJXwh
B7PV/Y+2UHrlJYZyhk8uRm1WrQY5lj3oegWPK3gnOnMNQZS4Y49UsP0bR51LfSPS
Nqu65QS5iDs6OXz17JbJB6gegtFvvQWSB4JZm25POBC0TuwaFqTEp1H9xFp5wAng
0kF3aTByPL4hAzD09SqFVuM=
-----END PRIVATE KEY-----`;

export function createTestCertDir(): {
	dir: string;
	certChainPath: string;
	privateKeyPath: string;
	rootCertPath: string;
} {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "liop-cert-test-"));
	const certChainPath = path.join(dir, "test-cert.pem");
	const privateKeyPath = path.join(dir, "test-key.pem");
	const rootCertPath = path.join(dir, "ca-cert.pem");

	fs.writeFileSync(certChainPath, TEST_CERT_PEM);
	fs.writeFileSync(privateKeyPath, TEST_KEY_PEM);
	fs.writeFileSync(rootCertPath, TEST_CERT_PEM);

	return { dir, certChainPath, privateKeyPath, rootCertPath };
}

export function cleanupTestCertDir(dir: string): void {
	try {
		fs.rmSync(dir, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
}
