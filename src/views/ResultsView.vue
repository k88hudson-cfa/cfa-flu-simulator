<script setup lang="ts">
import { computed } from "vue";
import { LineChart, type Series, type AreaSection } from "cfasim-ui/charts";
import ChartTooltipContent from "../components/ChartTooltipContent.vue";
import OnThisPage from "../components/OnThisPage.vue";
import SummaryView from "./SummaryView.vue";
import { useParams, type ModelOutputExport, type OutputItemGrouped, type OutputTypeLabel } from "../composables/useParams";
import { useModelRun } from "../composables/useModelRun";

const { params, days } = useParams();
const { results, running, error } = useModelRun();

// --- series extraction helpers ---------------------------------------------

function sumSeries(rows: OutputItemGrouped[]): number[] {
  return rows.map((r) => r.grouped_values.reduce((a, b) => a + b, 0));
}

function groupSeries(rows: OutputItemGrouped[], groupIndex: number): number[] {
  return rows.map((r) => r.grouped_values[groupIndex] ?? 0);
}

function xLabels(rows: OutputItemGrouped[]): string[] {
  return rows.map((r) => String(Math.round(r.time)));
}

// --- unit scaling ----------------------------------------------------------

interface Scale {
  divisor: number;
  unit: string;
}

function pickScale(maxValue: number): Scale {
  if (maxValue >= 1e6) return { divisor: 1e6, unit: "Millions" };
  if (maxValue >= 1e3) return { divisor: 1e3, unit: "Thousands" };
  return { divisor: 1, unit: "" };
}

function scale(data: number[], divisor: number): number[] {
  return divisor === 1 ? data : data.map((v) => v / divisor);
}

// --- chart building --------------------------------------------------------

interface ChartData {
  series: Series[];
  xLabels: string[];
  scale: Scale;
  areaSections: AreaSection[];
}

const UNMITIGATED_COLOR = "#9ca3af"; // neutral gray for the counterfactual

function buildChart(
  kind: OutputTypeLabel,
  extract: (rows: OutputItemGrouped[]) => number[],
  showAreaLegend = false,
): ChartData | null {
  const r: ModelOutputExport | null = results.value;
  if (!r) return null;

  const mitigated = r.output.Mitigated?.[kind];
  const unmitigated = r.output.Unmitigated?.[kind];
  const hasBoth = !!mitigated && !!unmitigated;
  const primary = mitigated ?? unmitigated;
  if (!primary) return null;

  const primaryData = extract(primary);
  const max = Math.max(
    ...primaryData,
    ...(unmitigated ? extract(unmitigated) : []),
  );
  const sc = pickScale(max);

  const series: Series[] = [];
  let mitigatedSeriesIndex = 0;
  if (hasBoth) {
    series.push({
      data: scale(extract(unmitigated), sc.divisor),
      color: UNMITIGATED_COLOR,
      dashed: true,
      legend: "Unmitigated",
    });
    series.push({
      data: scale(extract(mitigated), sc.divisor),
      strokeWidth: 2,
      legend: "Mitigated",
    });
    mitigatedSeriesIndex = 1;
  } else {
    series.push({
      data: scale(primaryData, sc.divisor),
      strokeWidth: 2,
      legend: "Unmitigated",
    });
  }

  return {
    series,
    xLabels: xLabels(primary),
    scale: sc,
    areaSections: buildAreaSections(primary, mitigatedSeriesIndex, showAreaLegend),
  };
}

// --- active-mitigation windows ---------------------------------------------

function buildAreaSections(
  rows: OutputItemGrouped[],
  seriesIndex: number,
  showLegend: boolean,
): AreaSection[] {
  const legend: AreaSection["legend"] = showLegend ? "below" : false;
  const sections: AreaSection[] = [];
  const times = rows.map((r) => r.time);

  // x-index for a given day (nearest timestep)
  const atDay = (day: number): number => {
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const d = Math.abs(times[i] - day);
      if (d < bestDiff) {
        bestDiff = d;
        best = i;
      }
    }
    return best;
  };

  const vax = params.mitigations.vaccine;
  if (vax.enabled && vax.administration_rate > 0 && vax.doses_available > 0) {
    const campaignDays = vax.doses_available / vax.administration_rate;
    const startDay = vax.start + vax.ramp_up;
    const endDay = Math.min(days.value, startDay + campaignDays);
    if (endDay > startDay) {
      sections.push({
        seriesIndex,
        startIndex: atDay(startDay),
        endIndex: atDay(endDay),
        color: "var(--accent)",
        opacity: 0.18,
        label: `Day ${Math.round(startDay)}–${Math.round(endDay)}`,
        description: `${formatDoses(vax.doses_available)} vaccines administered`,
        legend,
      });
    }
  }

  const comm = params.mitigations.community;
  if (comm.enabled && comm.duration > 0) {
    const end = Math.min(days.value, comm.start + comm.duration);
    sections.push({
      seriesIndex,
      startIndex: atDay(comm.start),
      endIndex: atDay(end),
      color: "#f59e0b",
      opacity: 0.15,
      label: `Day ${Math.round(comm.start)}–${Math.round(end)}`,
      description: "Community mitigation",
      legend,
    });
  }

  return sections;
}

function formatDoses(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

// --- derived chart data per panel -----------------------------------------

const overallChart = computed(() =>
  buildChart("InfectionIncidence", sumSeries, true),
);
const deathChart = computed(() => buildChart("DeathIncidence", sumSeries));
const hospChart = computed(() => buildChart("HospitalIncidence", sumSeries));
const symptomaticChart = computed(() =>
  buildChart("SymptomaticIncidence", sumSeries),
);

const groupCharts = computed(() => {
  const labels = params.population_fraction_labels;
  return labels.map((label, i) => ({
    label,
    data: buildChart("InfectionIncidence", (rows) => groupSeries(rows, i)),
  }));
});

// Subtitle based on active mitigations
const subtitle = computed(() => {
  const active: string[] = [];
  if (params.mitigations.vaccine.enabled) active.push("vaccination");
  if (params.mitigations.antivirals.enabled) active.push("antivirals");
  if (params.mitigations.community.enabled) active.push("community mitigation");
  if (params.mitigations.ttiq.enabled) active.push("TTIQ");
  const pop = formatDoses(params.population);
  if (active.length === 0) {
    return `Baseline scenario: population ${pop} over ${days.value} days`;
  }
  return `Impact of ${active.join(" + ")} on a population of ${pop} over ${days.value} days`;
});

const headerTitle = computed(() =>
  results.value && results.value.mitigation_types.length > 1
    ? "Mitigated vs. Unmitigated Scenario"
    : "Unmitigated Scenario",
);

const onThisPageGroups = computed(() => [
  {
    label: "Model results",
    items: [
      { id: "charts", label: "Charts" },
      { id: "summary", label: "Summary" },
    ],
  },
]);
</script>

<template>
  <div class="results-layout">
    <div class="results">
      <header class="results__header">
        <h1>{{ headerTitle }}</h1>
        <p class="results__subtitle">{{ subtitle }}</p>
      </header>

      <p v-if="error" class="results__error">Error: {{ error }}</p>
      <p v-else-if="!results && running" class="results__loading">Running model…</p>

      <template v-if="overallChart">
        <section class="results__section" data-otp-id="charts" id="charts">
          <h2>Overall Infection Incidence</h2>
        <LineChart
          :series="overallChart.series"
          :x-labels="overallChart.xLabels"
          :area-sections="overallChart.areaSections"
          :y-label="`Incidence${overallChart.scale.unit ? ` (${overallChart.scale.unit})` : ''}`"
          :height="320"
          :y-min="0"
          :x-min="0"
          tooltip-trigger="hover"
        >
          <template #tooltip="{ index, values }">
            <ChartTooltipContent
              :index="index"
              :values="values"
              :x-labels="overallChart.xLabels"
              :series="overallChart.series"
              :unit="overallChart.scale.unit"
            />
          </template>
        </LineChart>
      </section>

      <section class="results__grid-3">
        <div v-if="deathChart" class="results__small">
          <h3>Deaths</h3>
          <LineChart
            :series="deathChart.series"
            :x-labels="deathChart.xLabels"
            :area-sections="deathChart.areaSections"
            :y-label="`Incidence${deathChart.scale.unit ? ` (${deathChart.scale.unit})` : ''}`"
            :height="180"
            :y-min="0"
            :x-min="0"
            tooltip-trigger="hover"
          >
            <template #tooltip="{ index, values }">
              <ChartTooltipContent
                :index="index"
                :values="values"
                :x-labels="deathChart.xLabels"
                :series="deathChart.series"
                :unit="deathChart.scale.unit"
              />
            </template>
          </LineChart>
        </div>
        <div v-if="hospChart" class="results__small">
          <h3>Hospitalizations</h3>
          <LineChart
            :series="hospChart.series"
            :x-labels="hospChart.xLabels"
            :area-sections="hospChart.areaSections"
            :height="180"
            :y-min="0"
            :x-min="0"
            tooltip-trigger="hover"
          >
            <template #tooltip="{ index, values }">
              <ChartTooltipContent
                :index="index"
                :values="values"
                :x-labels="hospChart.xLabels"
                :series="hospChart.series"
                :unit="hospChart.scale.unit"
              />
            </template>
          </LineChart>
        </div>
        <div v-if="symptomaticChart" class="results__small">
          <h3>Symptomatic Infections</h3>
          <LineChart
            :series="symptomaticChart.series"
            :x-labels="symptomaticChart.xLabels"
            :area-sections="symptomaticChart.areaSections"
            :height="180"
            :y-min="0"
            :x-min="0"
            tooltip-trigger="hover"
          >
            <template #tooltip="{ index, values }">
              <ChartTooltipContent
                :index="index"
                :values="values"
                :x-labels="symptomaticChart.xLabels"
                :series="symptomaticChart.series"
                :unit="symptomaticChart.scale.unit"
              />
            </template>
          </LineChart>
        </div>
      </section>

      <section class="results__section">
        <h1>Infection Incidence by Age Group</h1>
        <div class="results__grid-n">
          <div v-for="(g, gi) in groupCharts" :key="g.label" class="results__small">
            <h3>{{ g.label }}</h3>
            <LineChart
              v-if="g.data"
              :series="g.data.series"
              :x-labels="g.data.xLabels"
              :area-sections="g.data.areaSections"
              :y-label="gi === 0 && g.data.scale.unit ? `(${g.data.scale.unit})` : ''"
              :height="200"
              :y-min="0"
              :x-min="0"
              tooltip-trigger="hover"
            >
              <template #tooltip="{ index, values }">
                <ChartTooltipContent
                  :index="index"
                  :values="values"
                  :x-labels="g.data.xLabels"
                  :series="g.data.series"
                  :unit="g.data.scale.unit"
                />
              </template>
            </LineChart>
          </div>
        </div>
      </section>

      <section class="results__section" data-otp-id="summary" id="summary">
        <h1>Summary</h1>
        <SummaryView />
      </section>
    </template>
    </div>
    <aside class="results-layout__rail">
      <OnThisPage :groups="onThisPageGroups" />
    </aside>
  </div>
</template>

<style scoped>
.results-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1.5rem;
  align-items: start;
}
.results-layout__rail {
  padding: 1rem 1.5rem 1rem 0;
  align-self: stretch;
}
@media (max-width: 900px) {
  .results-layout {
    grid-template-columns: 1fr;
  }
  .results-layout__rail {
    display: none;
  }
}
.results {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  min-width: 0;
}
.results h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
.results h2 { font-size: 1rem; margin: 0 0 0.5rem; }
.results h3 { font-size: 0.875rem; margin: 0 0 0.25rem; }
.results__subtitle { margin: 0.25rem 0 0; opacity: 0.65; }
.results__error { color: #ef4444; }
.results__loading { opacity: 0.7; }
.results__grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.results__grid-n {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}
</style>
