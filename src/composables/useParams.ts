import { inject, provide, reactive, ref, type InjectionKey, type Ref } from "vue";

// Subset of the wasm module we care about. The real types are generated at
// public/wasm/cfa-flu-simulator/cfa_flu_simulator.d.ts; reimport them here
// to avoid coupling to the build output path in tsconfig.
export interface VaccineParams {
  enabled: boolean;
  editable: boolean;
  doses: number;
  start: number;
  dose2_delay: number;
  p_get_2_doses: number;
  administration_rate: number;
  doses_available: number;
  ramp_up: number;
  ve_s: number;
  ve_i: number;
  ve_p: number;
  ve_2s: number;
  ve_2i: number;
  ve_2p: number;
}

export interface AntiviralsParams {
  enabled: boolean;
  editable: boolean;
  fraction_adhere: number;
  fraction_diagnosed_prescribed_inpatient: number;
  fraction_diagnosed_prescribed_outpatient: number;
  fraction_seek_care: number;
  ave_i: number;
  ave_p_hosp: number;
  ave_p_death: number;
}

export interface CommunityMitigationParams {
  enabled: boolean;
  editable: boolean;
  start: number;
  duration: number;
  effectiveness: number[];
}

export interface TTIQParams {
  enabled: boolean;
  editable: boolean;
  p_id_infectious: number;
  p_infectious_isolates: number;
  isolation_reduction: number;
  p_contact_trace: number;
  p_traced_quarantines: number;
}

export interface MitigationParams {
  vaccine: VaccineParams;
  antivirals: AntiviralsParams;
  community: CommunityMitigationParams;
  ttiq: TTIQParams;
}

export interface Parameters {
  n: number;
  population: number;
  population_fraction_labels: string[];
  population_fractions: number[];
  contact_matrix: number[];
  initial_infections: number;
  fraction_initial_immune: number;
  r0: number;
  latent_period: number;
  infectious_period: number;
  fraction_symptomatic: number[];
  fraction_hospitalized: number[];
  hospitalization_delay: number;
  fraction_dead: number[];
  death_delay: number;
  mitigations: MitigationParams;
  p_test_sympto: number;
  test_sensitivity: number;
  p_test_forward: number;
}

export type MitigationLabel = "Unmitigated" | "Mitigated";
export type OutputTypeLabel =
  | "InfectionIncidence"
  | "SymptomaticIncidence"
  | "HospitalIncidence"
  | "DeathIncidence";

export interface OutputItemGrouped {
  time: number;
  grouped_values: number[];
}

export interface ModelOutputExport {
  output: Record<MitigationLabel, Record<OutputTypeLabel, OutputItemGrouped[]>>;
  p_detect: Record<MitigationLabel, { time: number; value: number }[]>;
  mitigation_types: MitigationLabel[];
  output_types: OutputTypeLabel[];
}

export interface WasmModel {
  run: (days: number) => ModelOutputExport;
  free: () => void;
}

export interface WasmModule {
  default: () => Promise<unknown>;
  get_default_parameters: () => Parameters;
  SEIRModelUnified: new (params: Parameters) => WasmModel;
}

export { loadWasm };

let wasmPromise: Promise<WasmModule> | null = null;

function loadWasm(): Promise<WasmModule> {
  if (!wasmPromise) {
    // Fully-qualified URL so Vite skips its resolver (files under /public/
    // cannot be imported via bare paths from source code).
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "") + "/";
    const url = `${window.location.origin}${base}wasm/cfa-flu-simulator/cfa_flu_simulator.js`;
    wasmPromise = (async () => {
      const mod = (await import(/* @vite-ignore */ url)) as WasmModule;
      await mod.default();
      return mod;
    })();
  }
  return wasmPromise;
}

export interface ParamsStore {
  params: Parameters;
  days: Ref<number>;
  ready: Ref<boolean>;
}

const ParamsKey: InjectionKey<ParamsStore> = Symbol("params");

export function createParamsStore(): ParamsStore {
  // Seed with a reasonable placeholder so reactive bindings don't crash
  // before the wasm module finishes loading. Replaced with wasm defaults
  // once loaded.
  const params = reactive<Parameters>({
    n: 2,
    population: 330_000_000,
    population_fraction_labels: ["Children", "Adults"],
    population_fractions: [0.25, 0.75],
    contact_matrix: [18, 9, 3, 12],
    initial_infections: 1000,
    fraction_initial_immune: 0,
    r0: 1.5,
    latent_period: 1,
    infectious_period: 2.5,
    fraction_symptomatic: [0.5, 0.5],
    fraction_hospitalized: [0.01, 0.1],
    hospitalization_delay: 7,
    fraction_dead: [0.0005, 0.005],
    death_delay: 10,
    mitigations: {
      vaccine: {
        enabled: false, editable: true, doses: 1, start: 50, dose2_delay: 30,
        p_get_2_doses: 0.9, administration_rate: 1_500_000,
        doses_available: 40_000_000, ramp_up: 14,
        ve_s: 0.4, ve_i: 0, ve_p: 0.5, ve_2s: 0.6, ve_2i: 0, ve_2p: 0.75,
      },
      antivirals: {
        enabled: false, editable: true,
        fraction_adhere: 0.5, fraction_diagnosed_prescribed_inpatient: 1,
        fraction_diagnosed_prescribed_outpatient: 0.4, fraction_seek_care: 0.5,
        ave_i: 0.3, ave_p_hosp: 0.2, ave_p_death: 0.1,
      },
      community: {
        enabled: false, editable: true, start: 60, duration: 20,
        effectiveness: [0.5, -0.1, -0.1, 0],
      },
      ttiq: {
        enabled: false, editable: true,
        p_id_infectious: 0.15, p_infectious_isolates: 0.75,
        isolation_reduction: 0.5, p_contact_trace: 0.25, p_traced_quarantines: 0.75,
      },
    },
    p_test_sympto: 0,
    test_sensitivity: 0.9,
    p_test_forward: 0.9,
  });

  const days = ref(200);
  const ready = ref(false);

  loadWasm().then((mod) => {
    const defaults = mod.get_default_parameters();
    Object.assign(params, defaults);
    ready.value = true;
  });

  return { params, days, ready };
}

export function provideParams(): ParamsStore {
  const store = createParamsStore();
  provide(ParamsKey, store);
  return store;
}

export function useParams(): ParamsStore {
  const store = inject(ParamsKey);
  if (!store) throw new Error("useParams() called without provideParams()");
  return store;
}
