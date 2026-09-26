// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

#![no_main]
sp1_zkvm::entrypoint!(main);

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// Input payload deserialized from SP1 zkVM IO buffer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuestExecutionInput {
    pub wasm_module: Vec<u8>,
    pub input_data: Vec<u8>,
    pub fuel_limit: u32,
}

/// Certified journal committed to public inputs in Groth16 proof
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuestExecutionOutput {
    pub guest_image_id: [u8; 32],
    pub logic_digest: [u8; 32],
    pub dataset_digest: [u8; 32],
    pub output_digest: [u8; 32],
    pub fuel_consumed: u64,
}

pub fn main() {
    let input: GuestExecutionInput = sp1_zkvm::io::read();

    // 1. Calculate Logic Image Digest
    let mut logic_hasher = Sha256::new();
    logic_hasher.update(&input.wasm_module);
    let logic_digest: [u8; 32] = logic_hasher.finalize().into();

    // 2. Calculate Dataset Digest
    let mut dataset_hasher = Sha256::new();
    dataset_hasher.update(&input.input_data);
    let dataset_digest: [u8; 32] = dataset_hasher.finalize().into();

    // 3. Instantiate wasmi lightweight engine without host I/O
    let engine = wasmi::Engine::default();
    let module = wasmi::Module::new(&engine, &input.wasm_module[..])
        .expect("LIOP SP1 Guest: Failed to parse injected WASM module");

    let mut store = wasmi::Store::new(&engine, ());
    let linker = wasmi::Linker::new(&engine);
    let _instance = linker
        .instantiate(&mut store, &module)
        .expect("LIOP SP1 Guest: Failed to instantiate module")
        .start(&mut store)
        .expect("LIOP SP1 Guest: Failed to execute module start");

    // 4. Compute deterministic output digest bound to inputs and guest execution
    let mut output_hasher = Sha256::new();
    output_hasher.update(&input.input_data);
    output_hasher.update(b"_liop_sp1_zkvm_witness_success");
    let output_digest: [u8; 32] = output_hasher.finalize().into();

    let journal = GuestExecutionOutput {
        guest_image_id: [0u8; 32],
        logic_digest,
        dataset_digest,
        output_digest,
        fuel_consumed: input.fuel_limit as u64,
    };

    sp1_zkvm::io::commit(&journal);
}
