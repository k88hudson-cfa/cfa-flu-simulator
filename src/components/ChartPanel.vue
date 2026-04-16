<script setup lang="ts">
import { LineChart } from "cfasim-ui/charts";
import ChartTooltipContent from "./ChartTooltipContent.vue";
import type { ChartData } from "../utils/chartScale";

defineProps<{
  data: ChartData;
  filename: string;
  height?: number;
  yLabel?: string;
}>();
</script>

<template>
  <LineChart
    :series="data.series"
    :x-labels="data.xLabels"
    :area-sections="data.areaSections"
    :y-label="yLabel"
    :filename="filename"
    :height="height ?? 200"
    :y-min="0"
    :x-min="0"
    tooltip-trigger="hover"
    tooltip-clamp="window"
  >
    <template #tooltip="{ index, values }">
      <ChartTooltipContent
        :index="index"
        :values="values"
        :x-labels="data.xLabels"
        :series="data.series"
        :raw-by-series="data.rawBySeries"
      />
    </template>
  </LineChart>
</template>
