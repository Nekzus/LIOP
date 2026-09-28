// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FieldBackend {
    Avx512,
    Avx2,
    Neon,
    Scalar,
}

impl FieldBackend {
    pub fn as_str(&self) -> &'static str {
        match self {
            FieldBackend::Avx512 => "avx512",
            FieldBackend::Avx2 => "avx2",
            FieldBackend::Neon => "neon",
            FieldBackend::Scalar => "scalar",
        }
    }
}

pub fn optimal_field_backend() -> FieldBackend {
    #[cfg(target_arch = "x86_64")]
    {
        #[cfg(feature = "simd-avx512")]
        {
            return FieldBackend::Avx512;
        }

        #[cfg(not(feature = "simd-avx512"))]
        {
            if is_x86_feature_detected!("avx512f") {
                return FieldBackend::Avx512;
            }
        }

        if is_x86_feature_detected!("avx2") {
            return FieldBackend::Avx2;
        }
    }

    #[cfg(target_arch = "aarch64")]
    {
        return FieldBackend::Neon;
    }

    #[allow(unreachable_code)]
    FieldBackend::Scalar
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_field_backend_detection() {
        let backend = optimal_field_backend();
        assert!(!backend.as_str().is_empty());
    }
}
