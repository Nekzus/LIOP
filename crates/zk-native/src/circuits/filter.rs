// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

use ark_ff::PrimeField;
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};

/// FilterCircuit verifies that filtered aggregation matches condition flags applied to records.
#[derive(Clone)]
pub struct FilterCircuit<F: PrimeField> {
    pub records: Option<Vec<F>>,
    pub filter_flags: Option<Vec<F>>,
    pub num_records: usize,
    pub expected_filtered_sum: Option<F>,
}

impl<F: PrimeField> ConstraintSynthesizer<F> for FilterCircuit<F> {
    fn generate_constraints(self, cs: ConstraintSystemRef<F>) -> Result<(), SynthesisError> {
        let expected_filtered_sum_var = cs.new_input_variable(|| {
            self.expected_filtered_sum
                .ok_or(SynthesisError::AssignmentMissing)
        })?;

        let n = self.records.as_ref().map(|r| r.len()).unwrap_or(self.num_records);
        let mut filtered_sum_lc = ark_relations::r1cs::LinearCombination::zero();

        for i in 0..n {
            let record_val = self.records.as_ref().and_then(|r| r.get(i).copied());
            let flag_val = self.filter_flags.as_ref().and_then(|f| f.get(i).copied());

            let record_var = cs.new_witness_variable(|| {
                record_val.ok_or(SynthesisError::AssignmentMissing)
            })?;
            let flag_var = cs.new_witness_variable(|| {
                flag_val.ok_or(SynthesisError::AssignmentMissing)
            })?;

            // Enforce binary flag: flag * (1 - flag) == 0
            cs.enforce_constraint(
                ark_relations::r1cs::LinearCombination::from(flag_var),
                ark_relations::r1cs::LinearCombination::from(ark_relations::r1cs::Variable::One)
                    - flag_var,
                ark_relations::r1cs::LinearCombination::zero(),
            )?;

            // Intermediate filtered value: filtered_val = record * flag
            let filtered_val = match (record_val, flag_val) {
                (Some(r), Some(f)) => Some(r * f),
                _ => None,
            };
            let filtered_var = cs.new_witness_variable(|| {
                filtered_val.ok_or(SynthesisError::AssignmentMissing)
            })?;

            cs.enforce_constraint(
                ark_relations::r1cs::LinearCombination::from(record_var),
                ark_relations::r1cs::LinearCombination::from(flag_var),
                ark_relations::r1cs::LinearCombination::from(filtered_var),
            )?;

            filtered_sum_lc = filtered_sum_lc + filtered_var;
        }

        // Enforce filtered_sum == expected_filtered_sum
        cs.enforce_constraint(
            filtered_sum_lc,
            ark_relations::r1cs::LinearCombination::from(ark_relations::r1cs::Variable::One),
            ark_relations::r1cs::LinearCombination::from(expected_filtered_sum_var),
        )?;

        Ok(())
    }
}
