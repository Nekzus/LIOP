// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

use ark_ff::PrimeField;
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};

/// CountCircuit verifies that the number of valid items matches public expected_count.
#[derive(Clone)]
pub struct CountCircuit<F: PrimeField> {
    pub valid_flags: Option<Vec<F>>,
    pub num_items: usize,
    pub expected_count: Option<F>,
}

impl<F: PrimeField> ConstraintSynthesizer<F> for CountCircuit<F> {
    fn generate_constraints(self, cs: ConstraintSystemRef<F>) -> Result<(), SynthesisError> {
        let expected_count_var = cs.new_input_variable(|| {
            self.expected_count.ok_or(SynthesisError::AssignmentMissing)
        })?;

        let n = self.valid_flags.as_ref().map(|f| f.len()).unwrap_or(self.num_items);
        let mut count_lc = ark_relations::r1cs::LinearCombination::zero();

        for i in 0..n {
            let flag_val = self.valid_flags.as_ref().and_then(|f| f.get(i).copied());
            let flag_var = cs.new_witness_variable(|| {
                flag_val.ok_or(SynthesisError::AssignmentMissing)
            })?;

            // Enforce boolean flag: flag * (1 - flag) == 0
            cs.enforce_constraint(
                ark_relations::r1cs::LinearCombination::from(flag_var),
                ark_relations::r1cs::LinearCombination::from(ark_relations::r1cs::Variable::One)
                    - flag_var,
                ark_relations::r1cs::LinearCombination::zero(),
            )?;
            count_lc = count_lc + flag_var;
        }

        // Enforce count_lc * 1 == expected_count_var
        cs.enforce_constraint(
            count_lc,
            ark_relations::r1cs::LinearCombination::from(ark_relations::r1cs::Variable::One),
            ark_relations::r1cs::LinearCombination::from(expected_count_var),
        )?;

        Ok(())
    }
}
