use nalgebra::{SMatrix, SVector};
use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::mitigations::{MitigationParams, MitigationParamsTyped};

static DEFAULT_TOML: &str = include_str!("../default-params.toml");

// Public, flat, TOML/JSON/wasm-serializable parameter struct.
// This is the single source of truth for the parameter *schema*.
// Statically-sized nalgebra views live in the solver-internal
// `ParametersTyped<N>`; conversions between the two are mechanical.
#[derive(Tsify, Debug, Clone, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct Parameters {
    pub n: usize,
    pub population: f64,
    pub population_fraction_labels: Vec<String>,
    pub population_fractions: Vec<f64>,
    // column-major flat n*n (nalgebra's native storage order, see default-params.toml)
    pub contact_matrix: Vec<f64>,
    pub initial_infections: f64,
    pub fraction_initial_immune: f64,
    pub r0: f64,
    pub latent_period: f64,
    pub infectious_period: f64,
    pub fraction_symptomatic: Vec<f64>,
    pub fraction_hospitalized: Vec<f64>,
    pub hospitalization_delay: f64,
    pub fraction_dead: Vec<f64>,
    pub death_delay: f64,
    pub mitigations: MitigationParams,
    pub p_test_sympto: f64,
    pub test_sensitivity: f64,
    pub p_test_forward: f64,
}

impl Parameters {
    pub fn has_mitigations(&self) -> bool {
        self.mitigations.antivirals.enabled
            || self.mitigations.community.enabled
            || self.mitigations.vaccine.enabled
            || self.mitigations.ttiq.enabled
    }

    pub fn without_mitigations(&self) -> Self {
        let mut params = self.clone();
        params.mitigations.antivirals.enabled = false;
        params.mitigations.community.enabled = false;
        params.mitigations.vaccine.enabled = false;
        params.mitigations.ttiq.enabled = false;
        params
    }

    // Validate that all n-sized fields match `n`. Called once at construction.
    pub fn validate(&self) -> Result<(), &'static str> {
        if self.population_fractions.len() != self.n {
            return Err("population_fractions length != n");
        }
        if self.population_fraction_labels.len() != self.n {
            return Err("population_fraction_labels length != n");
        }
        if self.fraction_symptomatic.len() != self.n {
            return Err("fraction_symptomatic length != n");
        }
        if self.fraction_hospitalized.len() != self.n {
            return Err("fraction_hospitalized length != n");
        }
        if self.fraction_dead.len() != self.n {
            return Err("fraction_dead length != n");
        }
        if self.contact_matrix.len() != self.n * self.n {
            return Err("contact_matrix length != n*n");
        }
        if self.mitigations.community.effectiveness.len() != self.n * self.n {
            return Err("community effectiveness length != n*n");
        }
        Ok(())
    }
}

impl Default for Parameters {
    fn default() -> Self {
        toml::from_str(DEFAULT_TOML).expect("default-params.toml is malformed")
    }
}

// Solver-internal typed counterpart.
#[derive(Debug, Clone)]
pub(crate) struct ParametersTyped<const N: usize> {
    pub population: f64,
    pub population_fractions: SVector<f64, N>,
    pub population_fraction_labels: SVector<String, N>,
    pub contact_matrix: SMatrix<f64, N, N>,
    pub initial_infections: f64,
    pub fraction_initial_immune: f64,
    pub r0: f64,
    pub latent_period: f64,
    pub infectious_period: f64,
    pub fraction_symptomatic: SVector<f64, N>,
    pub fraction_hospitalized: SVector<f64, N>,
    pub hospitalization_delay: f64,
    pub fraction_dead: SVector<f64, N>,
    pub death_delay: f64,
    pub mitigations: MitigationParamsTyped<N>,
    pub p_test_sympto: f64,
    pub test_sensitivity: f64,
    pub p_test_forward: f64,
}

impl<const N: usize> ParametersTyped<N> {
    #[allow(dead_code)]
    pub fn has_mitigations(&self) -> bool {
        self.mitigations.antivirals.enabled
            || self.mitigations.community.enabled
            || self.mitigations.vaccine.enabled
            || self.mitigations.ttiq.enabled
    }

    #[allow(dead_code)]
    pub fn without_mitigations(&self) -> Self {
        let mut params = self.clone();
        params.mitigations.antivirals.enabled = false;
        params.mitigations.community.enabled = false;
        params.mitigations.vaccine.enabled = false;
        params.mitigations.ttiq.enabled = false;
        params
    }
}

impl<const N: usize> TryFrom<Parameters> for ParametersTyped<N> {
    type Error = &'static str;
    fn try_from(params: Parameters) -> Result<Self, Self::Error> {
        if params.n != N {
            return Err("Parameters.n does not match target ParametersTyped<N>");
        }
        params.validate()?;
        Ok(ParametersTyped {
            population: params.population,
            population_fractions: SVector::from_iterator(params.population_fractions),
            population_fraction_labels: SVector::from_iterator(params.population_fraction_labels),
            contact_matrix: SMatrix::from_iterator(params.contact_matrix),
            initial_infections: params.initial_infections,
            fraction_initial_immune: params.fraction_initial_immune,
            r0: params.r0,
            latent_period: params.latent_period,
            infectious_period: params.infectious_period,
            fraction_symptomatic: SVector::from_iterator(params.fraction_symptomatic),
            fraction_hospitalized: SVector::from_iterator(params.fraction_hospitalized),
            hospitalization_delay: params.hospitalization_delay,
            fraction_dead: SVector::from_iterator(params.fraction_dead),
            death_delay: params.death_delay,
            mitigations: MitigationParamsTyped::try_from(params.mitigations)?,
            p_test_sympto: params.p_test_sympto,
            test_sensitivity: params.test_sensitivity,
            p_test_forward: params.p_test_forward,
        })
    }
}

impl<const N: usize> From<ParametersTyped<N>> for Parameters {
    fn from(params: ParametersTyped<N>) -> Self {
        Parameters {
            n: N,
            population: params.population,
            population_fractions: params.population_fractions.iter().copied().collect(),
            population_fraction_labels: params.population_fraction_labels.iter().cloned().collect(),
            contact_matrix: params.contact_matrix.iter().copied().collect(),
            initial_infections: params.initial_infections,
            fraction_initial_immune: params.fraction_initial_immune,
            r0: params.r0,
            latent_period: params.latent_period,
            infectious_period: params.infectious_period,
            fraction_symptomatic: params.fraction_symptomatic.iter().copied().collect(),
            fraction_hospitalized: params.fraction_hospitalized.iter().copied().collect(),
            hospitalization_delay: params.hospitalization_delay,
            fraction_dead: params.fraction_dead.iter().copied().collect(),
            death_delay: params.death_delay,
            mitigations: params.mitigations.into(),
            p_test_sympto: params.p_test_sympto,
            test_sensitivity: params.test_sensitivity,
            p_test_forward: params.p_test_forward,
        }
    }
}

#[wasm_bindgen]
pub fn get_default_parameters() -> Parameters {
    Parameters::default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_toml_parses() {
        let params = Parameters::default();
        assert_eq!(params.n, 2);
        assert_eq!(params.population, 330_000_000.0);
        params.validate().expect("default params must validate");
    }

    #[test]
    fn test_has_mitigations() {
        let mut params = Parameters::default();
        params.mitigations.vaccine.enabled = false;
        assert!(!params.has_mitigations());

        params.mitigations.vaccine.enabled = true;
        assert!(params.has_mitigations());

        params.mitigations.vaccine.enabled = false;
        params.mitigations.antivirals.enabled = true;
        assert!(params.has_mitigations());

        params.mitigations.antivirals.enabled = false;
        params.mitigations.community.enabled = true;
        assert!(params.has_mitigations());
    }

    #[test]
    fn test_without_mitigations() {
        let mut params = Parameters::default();
        params.mitigations.vaccine.enabled = true;
        params.mitigations.antivirals.enabled = true;
        params.mitigations.community.enabled = true;

        let params_no_mitigations = params.without_mitigations();
        assert!(!params_no_mitigations.has_mitigations());
    }

    #[test]
    fn test_typed_roundtrip() {
        // Parameters -> ParametersTyped<2> -> Parameters preserves values.
        let params = Parameters::default();
        let typed: ParametersTyped<2> = params.clone().try_into().unwrap();
        let roundtrip: Parameters = typed.into();
        assert_eq!(params.n, roundtrip.n);
        assert_eq!(params.population_fractions, roundtrip.population_fractions);
        assert_eq!(params.contact_matrix, roundtrip.contact_matrix);
        assert_eq!(
            params.mitigations.community.effectiveness,
            roundtrip.mitigations.community.effectiveness
        );
    }

    #[test]
    fn test_contact_matrix_order() {
        // TOML stores the contact matrix as a column-major flat Vec (nalgebra's
        // native storage order). After `SMatrix::from_iterator` the typed
        // matrix must equal the reference default: matrix![18, 3; 9, 12].
        use nalgebra::matrix;
        let typed: ParametersTyped<2> = Parameters::default().try_into().unwrap();
        assert_eq!(typed.contact_matrix, matrix![18.0, 3.0; 9.0, 12.0]);
    }

    #[test]
    fn test_wrong_n_rejected() {
        let params = Parameters::default();
        let r: Result<ParametersTyped<3>, _> = params.try_into();
        assert!(r.is_err());
    }
}
