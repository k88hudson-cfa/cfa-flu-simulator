import { markRaw, ref, shallowRef, watch, type Ref } from "vue";
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

// Minimum ms between model runs during a drag. At 60Hz (rAF) the JS heap
// grows faster than V8 can minor-GC between frames; 50ms (~20Hz) gives
// the browser time to tear down old SVG nodes and reclaim result objects
// without visibly degrading slider-drag responsiveness.
const THROTTLE_MS = 50;

/**
 * Re-runs SEIRModelUnified whenever params or days change. Throttles
 * runs to one per THROTTLE_MS and guarantees only one run is in flight
 * at a time; coalesces bursts (the latest state runs, intermediates drop).
 *
 * Must be called from a component under a provideParams() ancestor.
 */
export function useModelRun(): ModelRun {
  const { params, days, ready } = useParams();
  // shallowRef: the result tree is big, deeply-nested, and treated as an
  // immutable snapshot. Vue's default ref() would wrap every nested
  // object/array in a reactive Proxy on first access, allocating hundreds
  // of proxies per run and creating GC pressure. shallowRef only triggers
  // subscribers when the top-level reference is replaced.
  const results = shallowRef<ModelOutputExport | null>(null);
  const running = ref(false);
  const error = ref<string | null>(null);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastRunAt = 0;
  let rerunRequested = false;

  // Reusable plain-object buffer for wasm input. Deep-assigned in place
  // before each run so we don't allocate a fresh clone each frame.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let paramsBuf: any = null;

  // Recursively copy src into dst, reusing dst's existing objects/arrays
  // where possible. Assumes both have identical shapes (true when src is
  // always the same Parameters schema).
  function deepAssign(dst: unknown, src: unknown): unknown {
    if (Array.isArray(src)) {
      const d = Array.isArray(dst) ? dst : [];
      d.length = src.length;
      for (let i = 0; i < src.length; i++) d[i] = src[i];
      return d;
    }
    if (src && typeof src === "object") {
      const d = (dst && typeof dst === "object" && !Array.isArray(dst)
        ? dst
        : {}) as Record<string, unknown>;
      const s = src as Record<string, unknown>;
      for (const key in s) d[key] = deepAssign(d[key], s[key]);
      return d;
    }
    return src;
  }

  async function runOnce() {
    running.value = true;
    error.value = null;
    lastRunAt = performance.now();
    try {
      const mod = await loadWasm();
      paramsBuf = deepAssign(paramsBuf, params);
      const model = new mod.SEIRModelUnified(paramsBuf);
      try {
        // markRaw: belt-and-suspenders; guarantees the object is never
        // turned into a reactive proxy even if accessed through a ref().
        results.value = markRaw(model.run(days.value));
      } finally {
        model.free();
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      running.value = false;
      if (rerunRequested) {
        rerunRequested = false;
        schedule();
      }
    }
  }

  function schedule() {
    if (timer !== null) return;
    if (running.value) {
      rerunRequested = true;
      return;
    }
    const wait = Math.max(0, THROTTLE_MS - (performance.now() - lastRunAt));
    timer = setTimeout(() => {
      timer = null;
      runOnce();
    }, wait);
  }

  watch(
    [() => JSON.stringify(params), days, ready],
    () => {
      if (!ready.value) return;
      schedule();
    },
    { immediate: true },
  );

  return { results, running, error };
}
