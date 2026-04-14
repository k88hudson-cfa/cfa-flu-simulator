use nalgebra::SMatrix;
use serde::{Deserialize, Serialize};
use tsify::Tsify;

pub trait Mitigation {
    fn get_enabled(&self) -> bool;
    fn get_editable(&self) -> bool;
    fn set_enabled(&mut self, enabled: bool);
    fn set_editable(&mut self, editable: bool);
}

#[derive(Tsify, Debug, Clone, Copy, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct VaccineParams {
    pub enabled: bool,
    pub editable: bool,
    pub doses: usize,
    pub start: f64,
    pub dose2_delay: f64,
    pub p_get_2_doses: f64,
    pub administration_rate: f64,
    pub doses_available: f64,
    pub ramp_up: f64,
    pub ve_s: f64,
    pub ve_i: f64,
    pub ve_p: f64,
    pub ve_2s: f64,
    pub ve_2i: f64,
    pub ve_2p: f64,
}

#[derive(Tsify, Debug, Clone, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct AntiviralsParams {
    pub enabled: bool,
    pub editable: bool,
    pub fraction_adhere: f64,
    pub fraction_diagnosed_prescribed_inpatient: f64,
    pub fraction_diagnosed_prescribed_outpatient: f64,
    pub fraction_seek_care: f64,
    pub ave_i: f64,
    pub ave_p_hosp: f64,
    pub ave_p_death: f64,
}

// Public, flat, TOML/JSON-serializable community mitigation. Effectiveness is
// a row-major n*n matrix; length checked against `Parameters::n` by
// `Parameters::validate()`.
#[derive(Tsify, Debug, Clone, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CommunityMitigationParams {
    pub enabled: bool,
    pub editable: bool,
    pub start: f64,
    pub duration: f64,
    pub effectiveness: Vec<f64>,
}

// Solver-internal typed counterpart; statically sized for ODE hot path.
#[derive(Debug, Clone)]
pub(crate) struct CommunityMitigationParamsTyped<const N: usize> {
    pub enabled: bool,
    pub editable: bool,
    pub start: f64,
    pub duration: f64,
    pub effectiveness: SMatrix<f64, N, N>,
}

impl<const N: usize> From<CommunityMitigationParamsTyped<N>> for CommunityMitigationParams {
    fn from(value: CommunityMitigationParamsTyped<N>) -> Self {
        CommunityMitigationParams {
            enabled: value.enabled,
            editable: value.editable,
            start: value.start,
            duration: value.duration,
            effectiveness: value.effectiveness.data.as_slice().into(),
        }
    }
}

impl<const N: usize> TryFrom<CommunityMitigationParams> for CommunityMitigationParamsTyped<N> {
    type Error = &'static str;

    fn try_from(value: CommunityMitigationParams) -> Result<Self, Self::Error> {
        if value.effectiveness.len() != N * N {
            return Err("Invalid number of community effectiveness elements");
        }
        Ok(CommunityMitigationParamsTyped {
            enabled: value.enabled,
            editable: value.editable,
            start: value.start,
            duration: value.duration,
            effectiveness: SMatrix::from_iterator(value.effectiveness),
        })
    }
}

#[derive(Tsify, Debug, Clone, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TTIQParams {
    pub enabled: bool,
    pub editable: bool,
    pub p_id_infectious: f64,
    pub p_infectious_isolates: f64,
    pub isolation_reduction: f64,
    pub p_contact_trace: f64,
    pub p_traced_quarantines: f64,
}

#[derive(Tsify, Debug, Clone, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MitigationParams {
    pub vaccine: VaccineParams,
    pub antivirals: AntiviralsParams,
    pub community: CommunityMitigationParams,
    pub ttiq: TTIQParams,
}

#[derive(Debug, Clone)]
pub(crate) struct MitigationParamsTyped<const N: usize> {
    pub vaccine: VaccineParams,
    pub antivirals: AntiviralsParams,
    pub community: CommunityMitigationParamsTyped<N>,
    pub ttiq: TTIQParams,
}

impl<const N: usize> Default for MitigationParamsTyped<N> {
    fn default() -> Self {
        MitigationParamsTyped {
            vaccine: VaccineParams {
                enabled: false,
                editable: true,
                doses: 1,
                dose2_delay: 30.0,
                start: 50.0,
                p_get_2_doses: 0.9,
                administration_rate: 1_500_000.0,
                doses_available: 40_000_000.0,
                ramp_up: 14.0,
                ve_s: 0.40,
                ve_i: 0.0,
                ve_p: 0.5,
                ve_2s: 0.60,
                ve_2i: 0.0,
                ve_2p: 0.75,
            },
            antivirals: AntiviralsParams {
                enabled: false,
                editable: true,
                ave_i: 0.30,
                ave_p_hosp: 0.20,
                ave_p_death: 0.1,
                fraction_adhere: 0.50,
                fraction_diagnosed_prescribed_inpatient: 1.0,
                fraction_diagnosed_prescribed_outpatient: 0.40,
                fraction_seek_care: 0.50,
            },
            community: CommunityMitigationParamsTyped {
                enabled: false,
                editable: true,
                start: 60.0,
                duration: 20.0,
                effectiveness: SMatrix::from_element(0.25),
            },
            ttiq: TTIQParams {
                enabled: false,
                editable: true,
                p_id_infectious: 0.15,
                p_infectious_isolates: 0.75,
                isolation_reduction: 0.50,
                p_contact_trace: 0.25,
                p_traced_quarantines: 0.75,
            },
        }
    }
}

impl<const N: usize> From<MitigationParamsTyped<N>> for MitigationParams {
    fn from(value: MitigationParamsTyped<N>) -> Self {
        MitigationParams {
            vaccine: value.vaccine,
            antivirals: value.antivirals,
            community: value.community.into(),
            ttiq: value.ttiq,
        }
    }
}

impl<const N: usize> TryFrom<MitigationParams> for MitigationParamsTyped<N> {
    type Error = &'static str;

    fn try_from(value: MitigationParams) -> Result<Self, Self::Error> {
        Ok(MitigationParamsTyped {
            vaccine: value.vaccine,
            antivirals: value.antivirals,
            community: CommunityMitigationParamsTyped::try_from(value.community)?,
            ttiq: value.ttiq,
        })
    }
}
