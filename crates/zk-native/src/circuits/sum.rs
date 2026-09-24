// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

use ark_ff::PrimeField;
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};

/// SumCircuit verifies that the sum of private records matches public expected_sum.
#[derive(Clone)]
pub struct SumCircuit<F: PrimeField> {
    pub records: Option<Vec<F>>,
    pub num_records: usize,
    pub expected_sum: Option<F>,
}

impl<F: PrimeField> ConstraintSynthesizer<F> for SumCircuit<F> {
    fn generate_constraints(self, cs: ConstraintSystemRef<F>) -> Result<(), SynthesisError> {
        let expected_sum_var = cs.new_input_variable(|| {
            self.expected_sum.ok_or(SynthesisError::AssignmentMissing)
        })?;

        let n = self.records.as_ref().map(|r| r.len()).unwrap_or(self.num_records);
        let mut computed_sum_lc = ark_relations::r1cs::LinearCombination::zero();

        for i in 0..n {
            let record_val = self.records.as_ref().and_then(|r| r.get(i).copied());
            let record_var = cs.new_witness_variable(|| {
                record_val.ok_or(SynthesisError::AssignmentMissing)
            })?;
            computed_sum_lc = computed_sum_lc + record_var;
        }

        // Enforce computed_sum * 1 == expected_sum
        cs.enforce_constraint(
            computed_sum_lc,
            ark_relations::r1cs::LinearCombination::from(ark_relations::r1cs::Variable::One),
            ark_relations::r1cs::LinearCombination::from(expected_sum_var),
        )?;

        Ok(())
    }
}
