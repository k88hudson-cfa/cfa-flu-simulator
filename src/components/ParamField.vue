<script setup lang="ts">
import { computed } from "vue";
import { NumberInput } from "cfasim-ui/components";
import { getField } from "../config/uiConfig";

const props = defineProps<{
  path: string;
  modelValue: number;
  // Optional runtime overrides (e.g. community.start max depends on `days`)
  min?: number;
  max?: number;
}>();
const emit = defineEmits<(e: "update:modelValue", v: number) => void>();

const cfg = computed(() => getField(props.path));

const numberType = computed<"integer" | "float">(() =>
  cfg.value.type === "integer" ? "integer" : "float",
);
const percent = computed(() => cfg.value.type === "percent");
</script>

<template>
  <NumberInput
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :label="cfg.label"
    :hint="cfg.tooltip"
    :min="min ?? cfg.min"
    :max="max ?? cfg.max"
    :step="cfg.step"
    :slider="cfg.slider"
    :percent="percent"
    :number-type="numberType"
    live
  />
</template>
