// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * TypeScript interfaces reflecting liop_core.proto (LIOP v1)
 * Optimized for logic-on-origin and high-performance serialization.
 */

export enum ProofMode {
	PROOF_MODE_LEGACY_HMAC = 0,
	PROOF_MODE_ZK_OPTIMISTIC = 1,
	PROOF_MODE_ZK_BLOCKING = 2,
}

export enum ProofType {
	PROOF_TYPE_HMAC_LEGACY = 0,
	PROOF_TYPE_GROTH16 = 2,
}

export interface IntentRequest {
	agent_did: string;
	capability_hash: string;
	proof_of_intent: Uint8Array;
}

export interface IntentResponse {
	accepted: boolean;
	session_token: string;
	error_message: string;
	kyber_public_key: Uint8Array;
}

export interface LogicRequest {
	session_token: string;
	wasm_binary: Uint8Array;
	inputs: Record<string, Uint8Array>;
	pqc_ciphertext: Uint8Array;
	aes_nonce: Uint8Array;
	requested_proof_mode?: ProofMode;
}

export interface LogicResponse {
	semantic_evidence: string;
	cryptographic_proof: Uint8Array;
	zk_receipt: Uint8Array;
	is_error: boolean;
	proof_type?: ProofType;
	guest_image_id?: Uint8Array;
}
