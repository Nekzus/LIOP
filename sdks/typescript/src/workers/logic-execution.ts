import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { createMlKem768 } from "mlkem";
import { ASTGuardian } from "../sandbox/guardian.js";
import { WasiSandbox } from "../sandbox/wasi.js";

export interface WorkerData {
	ciphertext: Uint8Array;
	secretKeyObj: ArrayLike<number>;
	kyberPublicKey: Uint8Array;
	wasmBinary: Uint8Array; // Can also be JS code in non-encrypted mode
	inputs: Record<string, Uint8Array>;
	records?: Record<string, unknown>[];
	sessionToken: string;
	isEncrypted?: boolean;
	aesNonce?: Uint8Array;
}

export default async function processLogicExecution(data: WorkerData): Promise<{
	image_id: string;
	output: string;
	fuel_consumed: number;
	zk_receipt?: string;
}> {
	const {
		ciphertext,
		secretKeyObj,
		wasmBinary,
		inputs,
		aesNonce,
		records,
		isEncrypted = true,
	} = data;

	let decryptedPayload: Buffer | string;
	const decryptedInputs: Record<string, unknown> = {};
	let sessionSecret = Buffer.alloc(32); // Fallback if plain text (no PQC)

	if (isEncrypted) {
		// 1. Decapsulate Kyber secret
		const sk = new Uint8Array(secretKeyObj);
		const ct = new Uint8Array(ciphertext);
		const kem = await createMlKem768();
		const sharedSecret = kem.decap(ct, sk);
		const aesKey = Buffer.from(sharedSecret);
		sessionSecret = aesKey;

		// 2. Decrypt Main Payload (WASM/JS Code)
		// LIOP Serialization: Ciphertext = EncryptedData + 16-byte AuthTag
		const wasmBuffer = Buffer.from(wasmBinary);
		const authTag = wasmBuffer.subarray(-16);
		const encryptedData = wasmBuffer.subarray(0, -16);

		const decipher = crypto.createDecipheriv(
			"aes-256-gcm",
			aesKey,
			Buffer.from(aesNonce || new Uint8Array(12)),
		);
		decipher.setAuthTag(authTag);
		let decrypted = decipher.update(encryptedData);
		decrypted = Buffer.concat([decrypted, decipher.final()]);
		decryptedPayload = decrypted;

		// 3. Decrypt Inputs
		for (const [key, encValue] of Object.entries(inputs || {})) {
			const valBuffer = Buffer.from(encValue);
			const valTag = valBuffer.subarray(-16);
			const valData = valBuffer.subarray(0, -16);

			const valDecipher = crypto.createDecipheriv(
				"aes-256-gcm",
				aesKey,
				Buffer.from(aesNonce || new Uint8Array(12)),
			);
			valDecipher.setAuthTag(valTag);
			let valDecrypted = valDecipher.update(valData);
			valDecrypted = Buffer.concat([valDecrypted, valDecipher.final()]);
			decryptedInputs[key] = JSON.parse(valDecrypted.toString("utf-8"));
		}
	} else {
		// Transparent mode: payload is provided directly
		// If it's WASM (Magic bytes: \0asm), keep as Buffer
		if (
			wasmBinary[0] === 0x00 &&
			wasmBinary[1] === 0x61 &&
			wasmBinary[2] === 0x73 &&
			wasmBinary[3] === 0x6d
		) {
			decryptedPayload = Buffer.from(wasmBinary);
		} else {
			decryptedPayload = Buffer.from(wasmBinary).toString("utf-8");
		}
	}

	// 3. Inspect AST with Guardian-TS (if WASM)
	const isWasm =
		decryptedPayload[0] === 0x00 &&
		decryptedPayload[1] === 0x61 &&
		decryptedPayload[2] === 0x73 &&
		decryptedPayload[3] === 0x6d;

	if (decryptedPayload instanceof Buffer && isWasm) {
		// Ensure we pass a compatible BufferSource
		const wasmBytes = new Uint8Array(decryptedPayload);
		const compiledModule = await WebAssembly.compile(wasmBytes);
		ASTGuardian.analyze(compiledModule);
	} else if (decryptedPayload instanceof Buffer && !isWasm) {
		decryptedPayload = decryptedPayload.toString("utf-8");
	}

	// Sanitization: Remove LIOP Metadata, Manifests and Logic Block markers
	if (typeof decryptedPayload === "string") {
		decryptedPayload = decryptedPayload
			.replace(/^\s*LIOP_MAGIC:.*?\n/g, "")
			.replace(/^\s*MANIFEST:.*?\n/g, "")
			.replace(/\s*---BEGIN_LOGIC---\n?/g, "")
			.replace(/\n?---END_LOGIC---\s*$/g, "")
			.trim();
	}

	// 4. Instantiate and Execute WASI Sandbox (or V8 Fallback)
	const sandbox = new WasiSandbox();
	await sandbox.init();

	try {
		const result = await sandbox.execute(
			decryptedPayload,
			records,
			decryptedInputs,
		);

		// 5. Generate Cryptographic Proof of Execution (HMAC-SHA256 Commitment)
		const logicBuffer =
			decryptedPayload instanceof Buffer
				? decryptedPayload
				: Buffer.from(decryptedPayload);

		const hasher = crypto.createHash("sha256");
		hasher.update(logicBuffer);
		const imageId = hasher.digest("hex");

		const journal = Buffer.from(
			JSON.stringify({
				image_id: imageId,
				output_hash: crypto
					.createHash("sha256")
					.update(result.output)
					.digest("hex"),
				fuel: result.fuelConsumed,
				ts: Date.now(),
			}),
		);

		const seal = crypto
			.createHmac("sha256", sessionSecret)
			.update(journal)
			.digest();
		const journalLen = Buffer.alloc(2);
		journalLen.writeUInt16BE(journal.length);
		const receiptBuf = Buffer.concat([
			Buffer.from([0x01]), // Receipt format v1
			journalLen,
			journal,
			seal, // 32 bytes HMAC
		]);
		const zkReceipt = receiptBuf.toString("base64");

		return {
			image_id: imageId,
			zk_receipt: zkReceipt,
			output: result.output,
			fuel_consumed: result.fuelConsumed,
		};
	} finally {
		await sandbox.teardown();
	}
}
