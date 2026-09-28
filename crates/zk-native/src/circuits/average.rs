// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

use ark_ff::PrimeField;
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};

/// AverageCircuit verifies: expected_avg * count == sum
#[derive(Clone)]
pub struct AverageCircuit<F: PrimeField> {
    pub records: Option<Vec<F>>,
    pub num_records: usize,
    pub expected_avg: Option<F>,
    pub count: Option<F>,
}

impl<F: PrimeField> ConstraintSynthesizer<F> for AverageCircuit<F> {
    fn generate_constraints(self, cs: ConstraintSystemRef<F>) -> Result<(), SynthesisError> {
        let expected_avg_var = cs.new_input_variable(|| {
            self.expected_avg.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let count_var = cs.new_input_variable(|| {
            self.count.ok_or(SynthesisError::AssignmentMissing)
        })?;

        let n = self.records.as_ref().map(|r| r.len()).unwrap_or(self.num_records);
        let mut sum_lc = ark_relations::r1cs::LinearCombination::zero();

        for i in 0..n {
            let record_val = self.records.as_ref().and_then(|r| r.get(i).copied());
            let record_var = cs.new_witness_variable(|| {
                record_val.ok_or(SynthesisError::AssignmentMissing)
            })?;
            sum_lc = sum_lc + record_var;
        }

        // Enforce expected_avg * count == sum
        cs.enforce_constraint(
            ark_relations::r1cs::LinearCombination::from(expected_avg_var),
            ark_relations::r1cs::LinearCombination::from(count_var),
            sum_lc,
        )?;

        Ok(())
    }
}
