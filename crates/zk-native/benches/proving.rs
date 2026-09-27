// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

use ark_bn254::{Bn254, Fr};
use ark_groth16::Groth16;
use ark_snark::SNARK;
use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use liop_zk_native::circuits::SumCircuit;
use rand::thread_rng;

fn bench_groth16_prove(c: &mut Criterion) {
    let mut group = c.benchmark_group("groth16_sum_circuit");
    let mut rng = thread_rng();

    for size in [10, 100, 1000] {
        let setup_circuit = SumCircuit::<Fr> {
            records: None,
            num_records: size,
            expected_sum: None,
        };
        let (pk, _vk) =
            Groth16::<Bn254>::circuit_specific_setup(setup_circuit, &mut rng).unwrap();

        let records: Vec<Fr> = (0..size as u64).map(Fr::from).collect();
        let expected_sum: Fr = records.iter().copied().sum();

        group.bench_with_input(BenchmarkId::new("prove", size), &size, |b, &s| {
            b.iter(|| {
                let prove_circuit = SumCircuit {
                    records: Some(records.clone()),
                    num_records: s,
                    expected_sum: Some(expected_sum),
                };
                let proof = Groth16::<Bn254>::prove(&pk, prove_circuit, &mut rng).unwrap();
                black_box(proof);
            });
        });
    }
    group.finish();
}

criterion_group!(benches, bench_groth16_prove);
criterion_main!(benches);
