// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import crypto from "node:crypto";

export enum ProofType {
	HMAC_LEGACY = 0x00,
	GROTH16 = 0x02,
}

export const RECEIPT_VERSION_V1 = 0x01;
export const RECEIPT_VERSION_V2 = 0x02;
export const ZK_JOURNAL_V2_SIZE = 144;

export interface ZkJournalV2 {
	guestImageId: Buffer;
	logicDigest: Buffer;
	datasetDigest: Buffer;
	outputDigest: Buffer;
	fuelConsumed: bigint;
	executionTimestamp: bigint;
}

export type ZkPolicy = "none" | "optimistic" | "required";

export interface DecodedReceipt {
	version: number;
	proofType: ProofType;
	journal: Buffer;
	proof: Buffer;
	raw: Buffer;
}

export class ZkVerificationError extends Error {
	constructor(message: string) {
		super(`ZK Verification Failed: ${message}`);
		this.name = "ZkVerificationError";
	}
}

export function decodeJournalV2(buf: Buffer): ZkJournalV2 {
	if (buf.length !== ZK_JOURNAL_V2_SIZE) {
		throw new ZkVerificationError(
			`Invalid ZkJournalV2 size: expected ${ZK_JOURNAL_V2_SIZE} bytes, got ${buf.length}`,
		);
	}

	return {
		guestImageId: Buffer.from(buf.subarray(0, 32)),
		logicDigest: Buffer.from(buf.subarray(32, 64)),
		datasetDigest: Buffer.from(buf.subarray(64, 96)),
		outputDigest: Buffer.from(buf.subarray(96, 128)),
		fuelConsumed: buf.readBigUInt64BE(128),
		executionTimestamp: buf.readBigUInt64BE(136),
	};
}

export function encodeJournalV2(fields: ZkJournalV2): Buffer {
	const buf = Buffer.alloc(ZK_JOURNAL_V2_SIZE);
	fields.guestImageId.copy(buf, 0);
	fields.logicDigest.copy(buf, 32);
	fields.datasetDigest.copy(buf, 64);
	fields.outputDigest.copy(buf, 96);
	buf.writeBigUInt64BE(BigInt(fields.fuelConsumed), 128);
	buf.writeBigUInt64BE(BigInt(fields.executionTimestamp), 136);
	return buf;
}

export const receiptCodec = {
	encodeV1(journal: Buffer, seal: Buffer): Buffer {
		const header = Buffer.alloc(3);
		header.writeUInt8(RECEIPT_VERSION_V1, 0);
		header.writeUInt16BE(journal.length, 1);
		return Buffer.concat([header, journal, seal]);
	},

	encodeV2(proofType: ProofType, journal: Buffer, proof: Buffer): Buffer {
		const header = Buffer.alloc(6);
		header.writeUInt8(RECEIPT_VERSION_V2, 0);
		header.writeUInt8(proofType, 1);
		header.writeUInt32BE(journal.length, 2);

		const payload = Buffer.concat([header, journal, proof]);
		const checksum = crypto.createHash("sha256").update(payload).digest();

		return Buffer.concat([payload, checksum]);
	},

	decode(raw: Buffer): DecodedReceipt {
		if (!raw || raw.length === 0) {
			throw new ZkVerificationError(
				"Empty or malformed zero-knowledge proof array.",
			);
		}

		const version = raw[0];

		if (version === RECEIPT_VERSION_V1) {
			if (raw.length < 35) {
				throw new ZkVerificationError(
					"Malformed receipt: invalid header or length.",
				);
			}
			const journalLen = raw.readUInt16BE(1);
			if (raw.length < 3 + journalLen + 32) {
				throw new ZkVerificationError(
					"Malformed receipt: truncated journal or seal.",
				);
			}
			const journal = Buffer.from(raw.subarray(3, 3 + journalLen));
			const seal = Buffer.from(
				raw.subarray(3 + journalLen, 3 + journalLen + 32),
			);

			return {
				version: RECEIPT_VERSION_V1,
				proofType: ProofType.HMAC_LEGACY,
				journal,
				proof: seal,
				raw,
			};
		}

		if (version === RECEIPT_VERSION_V2) {
			if (raw.length < 38) {
				throw new ZkVerificationError(
					"Malformed receipt v2: buffer too short (< 38 bytes).",
				);
			}

			const proofType = raw[1] as ProofType;
			const journalLen = raw.readUInt32BE(2);

			if (raw.length < 6 + journalLen + 32) {
				throw new ZkVerificationError(
					"Malformed receipt v2: truncated payload.",
				);
			}

			const payload = raw.subarray(0, raw.length - 32);
			const expectedChecksum = raw.subarray(raw.length - 32);
			const actualChecksum = crypto
				.createHash("sha256")
				.update(payload)
				.digest();

			if (!crypto.timingSafeEqual(expectedChecksum, actualChecksum)) {
				throw new ZkVerificationError("Receipt checksum verification failed.");
			}

			const journal = Buffer.from(raw.subarray(6, 6 + journalLen));
			const proof = Buffer.from(raw.subarray(6 + journalLen, raw.length - 32));

			return {
				version: RECEIPT_VERSION_V2,
				proofType,
				journal,
				proof,
				raw,
			};
		}

		throw new ZkVerificationError(
			`Unsupported receipt version: 0x${version.toString(16)}`,
		);
	},
};

export interface VerifyZkOptions {
	sessionSecret?: Buffer;
	expectedOutput?: unknown;
	guestImageIdHex?: string;
	vkeyRaw?: Buffer;
	zkPolicy?: ZkPolicy;
	circuitName?: string;
}

export class LiopVerifier {
	private static vkeyRegistry = new Map<string, Buffer>();

	public static registerVKey(circuitName: string, vkeyRaw: Buffer): void {
		LiopVerifier.vkeyRegistry.set(circuitName, vkeyRaw);
	}

	public static getRegisteredVKey(circuitName: string): Buffer | undefined {
		return LiopVerifier.vkeyRegistry.get(circuitName);
	}

	public async verifyZkReceipt(
		logicPayload: Buffer,
		remoteImageIdHex: string,
		zkReceipt: Buffer,
		sessionSecretOrOptions?: Buffer | VerifyZkOptions,
		_expectedOutput?: unknown,
	): Promise<boolean> {
		let guestImageIdHex: string | undefined;

		if (
			sessionSecretOrOptions &&
			typeof sessionSecretOrOptions === "object" &&
			!Buffer.isBuffer(sessionSecretOrOptions)
		) {
			guestImageIdHex = sessionSecretOrOptions.guestImageIdHex;
		}

		let decodedReceipt: DecodedReceipt;
		try {
			decodedReceipt = receiptCodec.decode(zkReceipt);
		} catch {
			return false;
		}

		if (decodedReceipt.version === RECEIPT_VERSION_V2) {
			if (decodedReceipt.proofType !== ProofType.GROTH16) return false;
			let journalV2: ZkJournalV2;
			try {
				journalV2 = decodeJournalV2(decodedReceipt.journal);
			} catch {
				return false;
			}

			if (
				guestImageIdHex &&
				journalV2.guestImageId.toString("hex") !== guestImageIdHex
			) {
				return false;
			}

			const expectedLogicDigest = crypto
				.createHash("sha256")
				.update(logicPayload)
				.digest();
			if (!journalV2.logicDigest.equals(expectedLogicDigest)) {
				return false;
			}

			return true;
		}

		if (decodedReceipt.version === RECEIPT_VERSION_V1) {
			const expectedLogicDigest = crypto
				.createHash("sha256")
				.update(logicPayload)
				.digest("hex");
			if (expectedLogicDigest !== remoteImageIdHex) {
				return false;
			}
			return true;
		}

		return false;
	}
}
