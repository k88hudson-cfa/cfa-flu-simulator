// Runs the upstream dynode-web reference model across several mitigation
// scenarios and dumps JSON fixtures to model/tests/reference-data/ for the
// reference-equivalence test to load.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use wasm_dynode::{DynodeModel, OutputType, Parameters, SEIRModel};

const DAYS: usize = 200;

// Wire-format mirror of upstream `OutputItemGrouped` (which has `pub(crate)`
// fields, so we can't read them directly). One serde round-trip per output
// type lifts the data into a struct we control.
#[derive(Serialize, Deserialize)]
struct RefItem {
    time: f64,
    grouped_values: Vec<f64>,
}

#[derive(Serialize)]
struct Fixture {
    scenario: &'static str,
    days: usize,
    infection_incidence: Vec<RefItem>,
    symptomatic_incidence: Vec<RefItem>,
    hospital_incidence: Vec<RefItem>,
    death_incidence: Vec<RefItem>,
}

fn make_params(scenario: &str) -> Parameters<2> {
    let mut p = Parameters::<2>::default();
    // Force all flags off; each scenario below enables exactly one.
    p.mitigations.vaccine.enabled = false;
    p.mitigations.antivirals.enabled = false;
    p.mitigations.community.enabled = false;
    p.mitigations.ttiq.enabled = false;
    match scenario {
        "no_mitigations" => {}
        "vaccine_only" => p.mitigations.vaccine.enabled = true,
        "antivirals_only" => p.mitigations.antivirals.enabled = true,
        "community_only" => p.mitigations.community.enabled = true,
        "ttiq_only" => p.mitigations.ttiq.enabled = true,
        other => panic!("unknown scenario {other}"),
    }
    p
}

fn extract(items: &[wasm_dynode::OutputItemGrouped]) -> Vec<RefItem> {
    let value = serde_json::to_value(items).expect("serialize items");
    serde_json::from_value(value).expect("RefItem shape matches OutputItemGrouped")
}

fn run_scenario(scenario: &'static str) -> Fixture {
    let model = SEIRModel::new(make_params(scenario));
    let output = model.integrate(DAYS);
    Fixture {
        scenario,
        days: DAYS,
        infection_incidence: extract(output.get_output(&OutputType::InfectionIncidence)),
        symptomatic_incidence: extract(output.get_output(&OutputType::SymptomaticIncidence)),
        hospital_incidence: extract(output.get_output(&OutputType::HospitalIncidence)),
        death_incidence: extract(output.get_output(&OutputType::DeathIncidence)),
    }
}

fn main() {
    let out_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../model/tests/reference-data");
    std::fs::create_dir_all(&out_dir).expect("create reference-data dir");

    let scenarios = [
        "no_mitigations",
        "vaccine_only",
        "antivirals_only",
        "community_only",
        "ttiq_only",
    ];

    for scenario in scenarios {
        let fixture = run_scenario(scenario);
        let path = out_dir.join(format!("{scenario}.json"));
        let json = serde_json::to_string_pretty(&fixture).expect("serialize fixture");
        std::fs::write(&path, json).expect("write fixture");
        println!("wrote {}", path.display());
    }
}
