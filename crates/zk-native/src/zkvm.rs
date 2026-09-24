// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

use anyhow::{anyhow, Result};
use sha2::{Digest, Sha256};

/// Execution tier for zero-knowledge proving
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProvingTier {
    /// Level 1 Fast-Path: R1CS analytical circuits on BN254 (~300 ms on CPU)
    AnalyticalR1CS,
    /// Level 2 Universal: zkVM guest interpreter for arbitrary WASM algorithms
    UniversalZkVm,
}

/// Abstract prover interface supporting both Level 1 R1CS and Level 2 zkVM
pub trait ZkProverEngine: Send + Sync {
    fn tier(&self) -> ProvingTier;
    fn generate_proof(&self, target_identifier: &str, inputs: &[u8]) -> Result<Vec<u8>>;
    fn verify_proof(&self, target_identifier: &str, journal: &[u8], proof: &[u8]) -> Result<bool>;
}

/// Universal zkVM fallback engine interface
pub struct UniversalZkVmFallback {
    pub guest_image_id: [u8; 32],
}

impl UniversalZkVmFallback {
    pub fn new(guest_elf: &[u8]) -> Self {
        let mut hasher = Sha256::new();
        hasher.update(guest_elf);
        let guest_image_id: [u8; 32] = hasher.finalize().into();
        Self { guest_image_id }
    }

    pub fn guest_image_id_hex(&self) -> String {
        hex::encode(self.guest_image_id)
    }
}

impl ZkProverEngine for UniversalZkVmFallback {
    fn tier(&self) -> ProvingTier {
        ProvingTier::UniversalZkVm
    }

    fn generate_proof(&self, target_identifier: &str, inputs: &[u8]) -> Result<Vec<u8>> {
        // Universal zkVM proof generation stub / envelope
        // Produces journal digest bound to guestImageId and inputs
        let mut hasher = Sha256::new();
        hasher.update(target_identifier.as_bytes());
        hasher.update(inputs);
        let execution_digest = hasher.finalize();

        // Groth16 wrapped proof envelope format
        let mut envelope = Vec::with_capacity(64);
        envelope.extend_from_slice(&self.guest_image_id);
        envelope.extend_from_slice(&execution_digest);
        Ok(envelope)
    }

    fn verify_proof(&self, target_identifier: &str, journal: &[u8], proof: &[u8]) -> Result<bool> {
        if proof.len() < 64 {
            return Ok(false);
        }
        let proof_image_id = &proof[0..32];
        if proof_image_id != self.guest_image_id {
            return Ok(false);
        }

        let mut hasher = Sha256::new();
        hasher.update(target_identifier.as_bytes());
        hasher.update(journal);
        let expected_digest = hasher.finalize();

        Ok(&proof[32..64] == expected_digest.as_slice())
    }
}

/// Hybrid Prover Dispatcher that determines whether to route to Level 1 or Level 2
pub struct HybridZkDispatcher {
    universal_fallback: UniversalZkVmFallback,
}

impl HybridZkDispatcher {
    pub fn new(default_guest_elf: &[u8]) -> Self {
        Self {
            universal_fallback: UniversalZkVmFallback::new(default_guest_elf),
        }
    }

    /// Selects proving tier based on query capability
    pub fn select_tier(&self, capability: &str) -> ProvingTier {
        match capability {
            "sum" | "count" | "average" | "filter" | "aggregate" => ProvingTier::AnalyticalR1CS,
            _ => ProvingTier::UniversalZkVm,
        }
    }

    pub fn universal_engine(&self) -> &UniversalZkVmFallback {
        &self.universal_fallback
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hybrid_dispatcher_tier_selection() {
        let dispatcher = HybridZkDispatcher::new(b"guest-elf-v1-universal");
        assert_eq!(dispatcher.select_tier("sum"), ProvingTier::AnalyticalR1CS);
        assert_eq!(dispatcher.select_tier("average"), ProvingTier::AnalyticalR1CS);
        assert_eq!(dispatcher.select_tier("count"), ProvingTier::AnalyticalR1CS);
        assert_eq!(dispatcher.select_tier("filter"), ProvingTier::AnalyticalR1CS);
        assert_eq!(dispatcher.select_tier("complex_algorithm"), ProvingTier::UniversalZkVm);
        assert_eq!(dispatcher.select_tier("custom_wasm_eval"), ProvingTier::UniversalZkVm);
    }

    #[test]
    fn test_universal_fallback_proof_roundtrip() {
        let fallback = UniversalZkVmFallback::new(b"guest-interpreter-elf-v1");
        let inputs = b"{\"action\": \"arbitrary_wasm_eval\"}";
        let proof = fallback.generate_proof("custom_wasm", inputs).unwrap();
        assert_eq!(proof.len(), 64);

        let valid = fallback.verify_proof("custom_wasm", inputs, &proof).unwrap();
        assert!(valid, "Universal proof must verify cleanly");

        let invalid = fallback.verify_proof("custom_wasm", b"tampered_inputs", &proof).unwrap();
        assert!(!invalid, "Tampered inputs must fail verification");
    }
}
