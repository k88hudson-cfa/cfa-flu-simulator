import { ref, watch, type Ref } from "vue";
import {
  loadWasm,
  useParams,
  type ModelOutputExport,
} from "./useParams";

export interface ModelRun {
  results: Ref<ModelOutputExport | null>;
  running: Ref<boolean>;
  error: Ref<string | null>;
}

/**
 * Re-runs SEIRModelUnified whenever params or days change (200ms debounce).
 * Must be called from a component under a provideParams() ancestor.
 */
export function useModelRun(): ModelRun {
  const { params, days, ready } = useParams();
  const results = ref<ModelOutputExport | null>(null);
  const running = ref(false);
  const error = ref<string | null>(null);

  let timer: ReturnType<typeof setTimeout> | null = null;

  async function run() {
    running.value = true;
    error.value = null;
    try {
      const mod = await loadWasm();
      // Deep clone so reactive proxies don't leak across the wasm boundary.
      const plain = JSON.parse(JSON.stringify(params));
      const model = new mod.SEIRModelUnified(plain);
      results.value = model.run(days.value);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      running.value = false;
    }
  }

  watch(
    [() => JSON.stringify(params), days, ready],
    () => {
      if (!ready.value) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, 200);
    },
    { immediate: true },
  );

  return { results, running, error };
}
