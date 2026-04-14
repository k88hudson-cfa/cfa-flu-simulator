<script setup lang="ts">
import { SidebarLayout } from "cfasim-ui/components";
import { provideParams } from "./composables/useParams";
import ScenarioSection from "./sections/ScenarioSection.vue";
import VaccineSection from "./sections/VaccineSection.vue";
import AntiviralsSection from "./sections/AntiviralsSection.vue";
import CommunitySection from "./sections/CommunitySection.vue";
import TTIQSection from "./sections/TTIQSection.vue";
import ResultsView from "./views/ResultsView.vue";

const { ready } = provideParams();
</script>

<template>
  <SidebarLayout>
    <template #sidebar>
      <template v-if="ready">
        <h3 class="group-header">SCENARIO</h3>
        <ScenarioSection />
        <h3 class="group-header">MITIGATIONS</h3>
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

<style scoped>
.group-header {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.6;
  margin: 1rem 0 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.group-header:first-child {
  margin-top: 0;
}
.loading {
  padding: 1rem;
  opacity: 0.7;
}
</style>
