<script setup lang="ts">
import { Button, SidebarLayout } from "cfasim-ui/components";
import { provideParams } from "./composables/useParams";
import ScenarioSection from "./sections/ScenarioSection.vue";
import VaccineSection from "./sections/VaccineSection.vue";
import AntiviralsSection from "./sections/AntiviralsSection.vue";
import CommunitySection from "./sections/CommunitySection.vue";
import TTIQSection from "./sections/TTIQSection.vue";
import ResultsView from "./views/ResultsView.vue";

const { ready, reset } = provideParams();
</script>

<template>
  <SidebarLayout>
    <template #sidebar>
      <template v-if="ready">
        <div class="toolbar">
          <Button variant="secondary" @click="reset">Reset Parameters</Button>
        </div>
        <h2>Scenario</h2>
        <ScenarioSection />
        <h2>Mitigations</h2>
        <VaccineSection />
        <AntiviralsSection />
        <CommunitySection />
        <TTIQSection />
      </template>
      <p v-else class="loading">Loading model…</p>
    </template>
    <ResultsView v-if="ready" />
  </SidebarLayout>
</template>

<style>
:root {
  --accent: rgb(0, 87, 183);
}

[data-theme="cdc"] {
  --font-weight-heading: 600;
}

.input-label {
  font-size: var(--font-size-sm);
}
</style>

<style scoped>
.loading {
  padding: 1rem;
  opacity: 0.7;
}

.toolbar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

:deep(.MainContent) {
  max-width: 1600px;
}
</style>
