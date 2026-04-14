<script setup lang="ts">
import type { Series } from "cfasim-ui/charts";

defineProps<{
  index: number;
  values: { value: number; color: string; seriesIndex: number }[];
  xLabels: string[];
  series: Series[];
  unit: string;
}>();
</script>

<template>
  <div class="tt">
    <div class="tt__day">Day {{ xLabels[index] }}</div>
    <div v-for="(v, i) in values" :key="i" class="tt__row">
      <span class="tt__swatch" :style="{ background: v.color }" />
      <span class="tt__label">{{ series[v.seriesIndex].legend }}</span>
      <span class="tt__value">
        {{ v.value.toFixed(2) }}{{ unit ? ` ${unit.toLowerCase()}` : "" }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* LineChart provides the .chart-tooltip-content wrapper (card + padding +
   shadow). This is just layout inside it. */
.tt {
  font-size: 0.8rem;
}
.tt__day {
  font-weight: 600;
  margin-bottom: 0.25rem;
  opacity: 0.7;
}
.tt__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
}
.tt__swatch {
  display: inline-block;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 2px;
}
.tt__value {
  font-variant-numeric: tabular-nums;
}
</style>
