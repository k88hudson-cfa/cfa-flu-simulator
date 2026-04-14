<script setup lang="ts">
import { Toggle } from "cfasim-ui/components";

defineProps<{
  label: string;
  enabled: boolean;
}>();
defineEmits<(e: "update:enabled", v: boolean) => void>();
</script>

<template>
  <section class="mitigation-section" :data-enabled="enabled">
    <header class="mitigation-section__header">
      <span class="mitigation-section__title">{{ label }}</span>
      <Toggle
        :label="enabled ? 'Enabled' : 'Disabled'"
        :model-value="enabled"
        @update:model-value="$emit('update:enabled', $event)"
      />
    </header>
    <div v-if="enabled" class="mitigation-section__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.mitigation-section {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.02);
}
.mitigation-section[data-enabled="true"] {
  border-color: rgba(74, 222, 128, 0.3);
  background: rgba(74, 222, 128, 0.03);
}
.mitigation-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}
.mitigation-section__title {
  font-weight: 600;
  font-size: 0.875rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.85;
}
.mitigation-section__body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.75rem;
  margin-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
