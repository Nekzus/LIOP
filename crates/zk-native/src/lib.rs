// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

pub mod circuits;
pub mod zkvm;

use ark_bn254::{Bn254, Fr};
use ark_groth16::{Groth16, Proof};
use ark_snark::SNARK;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use rand::thread_rng;
use serde::{Deserialize, Serialize};

use crate::circuits::{AverageCircuit, CountCircuit, FilterCircuit, SumCircuit};

/// Native prover metadata and version
#[napi]
pub fn get_native_prover_version() -> String {
    "liop-zk-native-v0.1.0-arkworks-bn254".to_string()
}

/// Input payload schema for analytical circuits
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticalInputs {
    pub records: Vec<u64>,
    pub filter_flags: Option<Vec<u64>>,
    pub expected_sum: Option<u64>,
    pub expected_avg: Option<u64>,
    pub expected_count: Option<u64>,
}

/// JSON representation of Groth16 proof matching micro-zk-proofs format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Groth16ProofPayload {
    pub a: [String; 2],
    pub b: [[String; 2]; 2],
    pub c: [String; 2],
    pub public_signals: Vec<String>,
}

/// Convert an arkworks BN254 Groth16 proof and public inputs to micro-zk-proofs JSON format
pub fn proof_to_payload(proof: &Proof<Bn254>, public_inputs: &[Fr]) -> Groth16ProofPayload {
    use ark_ec::AffineRepr;
    let (a0, a1) = match proof.a.xy() {
        Some((x, y)) => (x.to_string(), y.to_string()),
        None => (String::new(), String::new()),
    };
    let b = match proof.b.xy() {
        Some((x, y)) => [
            [x.c0.to_string(), x.c1.to_string()],
            [y.c0.to_string(), y.c1.to_string()],
        ],
        None => [
            [String::new(), String::new()],
            [String::new(), String::new()],
        ],
    };
    let (c0, c1) = match proof.c.xy() {
        Some((x, y)) => (x.to_string(), y.to_string()),
        None => (String::new(), String::new()),
    };
    let public_signals = public_inputs.iter().map(|f| f.to_string()).collect();

    Groth16ProofPayload {
        a: [a0, a1],
        b,
        c: [c0, c1],
        public_signals,
    }
}

/// Asynchronously generates a Groth16 proof for analytical queries using Rayon multithreading.
#[napi]
pub async fn prove_analytical_query(
    circuit_name: String,
    inputs_json: String,
) -> napi::Result<Buffer> {
    let payload: AnalyticalInputs = serde_json::from_str(&inputs_json)
        .map_err(|e| napi::Error::from_reason(format!("Invalid input JSON: {}", e)))?;

    let proof_json = async_rayon::spawn(move || -> anyhow::Result<String> {
        let mut rng = thread_rng();

        match circuit_name.as_str() {
            "sum" => {
                let records: Vec<Fr> = payload.records.iter().map(|&v| Fr::from(v)).collect();
                let num_records = records.len();
                let computed_sum: u64 = payload.records.iter().sum();
                let expected_sum = payload.expected_sum.unwrap_or(computed_sum);
                let sum_fr = Fr::from(expected_sum);

                let setup_circuit = SumCircuit {
                    records: None,
                    num_records,
                    expected_sum: None,
                };
                let (pk, _) = Groth16::<Bn254>::circuit_specific_setup(setup_circuit, &mut rng)?;

                let prove_circuit = SumCircuit {
                    records: Some(records),
                    num_records,
                    expected_sum: Some(sum_fr),
                };
                let proof = Groth16::<Bn254>::prove(&pk, prove_circuit, &mut rng)?;
                let output = proof_to_payload(&proof, &[sum_fr]);
                Ok(serde_json::to_string(&output)?)
            }
            "count" => {
                let flags: Vec<Fr> = payload
                    .records
                    .iter()
                    .map(|&v| Fr::from(if v > 0 { 1u64 } else { 0u64 }))
                    .collect();
                let num_items = flags.len();
                let computed_count: u64 = flags
                    .iter()
                    .filter(|f| **f == Fr::from(1u64))
                    .count() as u64;
                let expected_count = payload.expected_count.unwrap_or(computed_count);
                let count_fr = Fr::from(expected_count);

                let setup_circuit = CountCircuit {
                    valid_flags: None,
                    num_items,
                    expected_count: None,
                };
                let (pk, _) = Groth16::<Bn254>::circuit_specific_setup(setup_circuit, &mut rng)?;

                let prove_circuit = CountCircuit {
                    valid_flags: Some(flags),
                    num_items,
                    expected_count: Some(count_fr),
                };
                let proof = Groth16::<Bn254>::prove(&pk, prove_circuit, &mut rng)?;
                let output = proof_to_payload(&proof, &[count_fr]);
                Ok(serde_json::to_string(&output)?)
            }
            "average" => {
                let records: Vec<Fr> = payload.records.iter().map(|&v| Fr::from(v)).collect();
                let num_records = records.len();
                let count_val = num_records as u64;
                let sum_val: u64 = payload.records.iter().sum();
                let avg_val = if count_val > 0 { sum_val / count_val } else { 0 };
                let expected_avg = payload.expected_avg.unwrap_or(avg_val);

                let avg_fr = Fr::from(expected_avg);
                let count_fr = Fr::from(count_val);

                let setup_circuit = AverageCircuit {
                    records: None,
                    num_records,
                    expected_avg: None,
                    count: None,
                };
                let (pk, _) = Groth16::<Bn254>::circuit_specific_setup(setup_circuit, &mut rng)?;

                let prove_circuit = AverageCircuit {
                    records: Some(records),
                    num_records,
                    expected_avg: Some(avg_fr),
                    count: Some(count_fr),
                };
                let proof = Groth16::<Bn254>::prove(&pk, prove_circuit, &mut rng)?;
                let output = proof_to_payload(&proof, &[avg_fr, count_fr]);
                Ok(serde_json::to_string(&output)?)
            }
            "filter" => {
                let records: Vec<Fr> = payload.records.iter().map(|&v| Fr::from(v)).collect();
                let num_records = records.len();
                let flags: Vec<Fr> = match payload.filter_flags {
                    Some(fl) => fl.iter().map(|&v| Fr::from(if v > 0 { 1u64 } else { 0u64 })).collect(),
                    None => vec![Fr::from(1u64); num_records],
                };
                let filtered_sum: u64 = payload
                    .records
                    .iter()
                    .zip(flags.iter())
                    .filter(|(_, &flag)| flag == Fr::from(1u64))
                    .map(|(&rec, _)| rec)
                    .sum();
                let sum_fr = Fr::from(payload.expected_sum.unwrap_or(filtered_sum));

                let setup_circuit = FilterCircuit {
                    records: None,
                    filter_flags: None,
                    num_records,
                    expected_filtered_sum: None,
                };
                let (pk, _) = Groth16::<Bn254>::circuit_specific_setup(setup_circuit, &mut rng)?;

                let prove_circuit = FilterCircuit {
                    records: Some(records),
                    filter_flags: Some(flags),
                    num_records,
                    expected_filtered_sum: Some(sum_fr),
                };
                let proof = Groth16::<Bn254>::prove(&pk, prove_circuit, &mut rng)?;
                let output = proof_to_payload(&proof, &[sum_fr]);
                Ok(serde_json::to_string(&output)?)
            }
            unknown => anyhow::bail!("Unsupported circuit name: {}", unknown),
        }
    })
    .await
    .map_err(|e| napi::Error::from_reason(format!("Proving failed: {}", e)))?;

    Ok(Buffer::from(proof_json.into_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_sum_circuit_e2e() {
        let mut rng = thread_rng();
        let setup_circuit = SumCircuit::<Fr> {
            records: None,
            num_records: 3,
            expected_sum: None,
        };
        let (pk, vk) = Groth16::<Bn254>::circuit_specific_setup(setup_circuit, &mut rng).unwrap();

        let records = vec![Fr::from(10u64), Fr::from(20u64), Fr::from(30u64)];
        let expected_sum = Fr::from(60u64);

        let prove_circuit = SumCircuit {
            records: Some(records),
            num_records: 3,
            expected_sum: Some(expected_sum),
        };
        let proof = Groth16::<Bn254>::prove(&pk, prove_circuit, &mut rng).unwrap();

        let valid = Groth16::<Bn254>::verify(&vk, &[expected_sum], &proof).unwrap();
        assert!(valid, "Sum circuit proof verification must succeed");

        // Verify that invalid sum fails
        let invalid = Groth16::<Bn254>::verify(&vk, &[Fr::from(999u64)], &proof).unwrap();
        assert!(!invalid, "Proof must fail for incorrect sum");
    }

    #[test]
    fn test_count_circuit_e2e() {
        let mut rng = thread_rng();
        let setup_circuit = CountCircuit::<Fr> {
            valid_flags: None,
            num_items: 4,
            expected_count: None,
        };
        let (pk, vk) = Groth16::<Bn254>::circuit_specific_setup(setup_circuit, &mut rng).unwrap();

        let flags = vec![Fr::from(1u64), Fr::from(0u64), Fr::from(1u64), Fr::from(1u64)];
        let expected_count = Fr::from(3u64);

        let prove_circuit = CountCircuit {
            valid_flags: Some(flags),
            num_items: 4,
            expected_count: Some(expected_count),
        };
        let proof = Groth16::<Bn254>::prove(&pk, prove_circuit, &mut rng).unwrap();

        let valid = Groth16::<Bn254>::verify(&vk, &[expected_count], &proof).unwrap();
        assert!(valid, "Count circuit proof verification must succeed");
    }

    #[test]
    fn test_average_circuit_e2e() {
        let mut rng = thread_rng();
        let setup_circuit = AverageCircuit::<Fr> {
            records: None,
            num_records: 3,
            expected_avg: None,
            count: None,
        };
        let (pk, vk) = Groth16::<Bn254>::circuit_specific_setup(setup_circuit, &mut rng).unwrap();

        let records = vec![Fr::from(10u64), Fr::from(20u64), Fr::from(30u64)];
        let avg = Fr::from(20u64);
        let count = Fr::from(3u64);

        let prove_circuit = AverageCircuit {
            records: Some(records),
            num_records: 3,
            expected_avg: Some(avg),
            count: Some(count),
        };
        let proof = Groth16::<Bn254>::prove(&pk, prove_circuit, &mut rng).unwrap();

        let valid = Groth16::<Bn254>::verify(&vk, &[avg, count], &proof).unwrap();
        assert!(valid, "Average circuit proof verification must succeed");
    }

    #[test]
    fn test_filter_circuit_e2e() {
        let mut rng = thread_rng();
        let setup_circuit = FilterCircuit::<Fr> {
            records: None,
            filter_flags: None,
            num_records: 3,
            expected_filtered_sum: None,
        };
        let (pk, vk) = Groth16::<Bn254>::circuit_specific_setup(setup_circuit, &mut rng).unwrap();

        let records = vec![Fr::from(100u64), Fr::from(50u64), Fr::from(25u64)];
        let flags = vec![Fr::from(1u64), Fr::from(0u64), Fr::from(1u64)];
        let expected_sum = Fr::from(125u64);

        let prove_circuit = FilterCircuit {
            records: Some(records),
            filter_flags: Some(flags),
            num_records: 3,
            expected_filtered_sum: Some(expected_sum),
        };
        let proof = Groth16::<Bn254>::prove(&pk, prove_circuit, &mut rng).unwrap();

        let valid = Groth16::<Bn254>::verify(&vk, &[expected_sum], &proof).unwrap();
        assert!(valid, "Filter circuit proof verification must succeed");
    }
}
