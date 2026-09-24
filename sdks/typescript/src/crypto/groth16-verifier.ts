// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import {
	bn254,
	type ProofWithSignals,
	stringBigints,
	type VerificationKey,
} from "micro-zk-proofs";
import { ZkVerificationError } from "../security/zk.js";

export const VERIFICATION_LATENCY_BUDGET_MS = 250;

export type { ProofWithSignals, VerificationKey };

/**
 * Verifies a Groth16 Zero-Knowledge proof against a verification key.
 * Traps curve validation errors gracefully to ensure safe verification.
 */
export function verifyGroth16Proof(
	vkey: VerificationKey,
	proofWithSignals: ProofWithSignals,
): boolean {
	if (!vkey || !proofWithSignals?.proof) {
		return false;
	}

	try {
		return bn254.groth.verifyProof(vkey, proofWithSignals);
	} catch (_error) {
		// Curve point validation or pairing failure (e.g. invalid curve point, subgroup violation)
		return false;
	}
}

/**
 * Serializes a VerificationKey into a Buffer.
 */
export function serializeVKey(vkey: VerificationKey): Buffer {
	try {
		const encoded = stringBigints.encode(vkey);
		return Buffer.from(JSON.stringify(encoded), "utf-8");
	} catch (error) {
		throw new ZkVerificationError(
			`Failed to serialize VerificationKey: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Deserializes a Buffer into a typed VerificationKey.
 */
export function deserializeVKey(buf: Buffer): VerificationKey {
	try {
		const parsed = JSON.parse(buf.toString("utf-8"));
		return stringBigints.decode(parsed) as VerificationKey;
	} catch (error) {
		throw new ZkVerificationError(
			`Failed to deserialize VerificationKey: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Serializes a ProofWithSignals into a Buffer.
 */
export function serializeGrothProof(
	proofWithSignals: ProofWithSignals,
): Buffer {
	try {
		const encoded = stringBigints.encode(proofWithSignals);
		return Buffer.from(JSON.stringify(encoded), "utf-8");
	} catch (error) {
		throw new ZkVerificationError(
			`Failed to serialize GrothProof: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Deserializes a Buffer into a typed ProofWithSignals.
 */
export function deserializeGrothProof(buf: Buffer): ProofWithSignals {
	try {
		const parsed = JSON.parse(buf.toString("utf-8"));
		return stringBigints.decode(parsed) as ProofWithSignals;
	} catch (error) {
		throw new ZkVerificationError(
			`Failed to deserialize GrothProof: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
