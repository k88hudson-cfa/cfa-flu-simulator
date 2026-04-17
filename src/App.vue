<script setup lang="ts">
import { ref } from "vue";
import { Button, SidebarLayout } from "cfasim-ui/components";
import { provideParams } from "./composables/useParams";
import ScenarioSection from "./sections/ScenarioSection.vue";
import VaccineSection from "./sections/VaccineSection.vue";
import AntiviralsSection from "./sections/AntiviralsSection.vue";
import CommunitySection from "./sections/CommunitySection.vue";
import TTIQSection from "./sections/TTIQSection.vue";
import ResultsView from "./views/ResultsView.vue";
import { generateReport } from "./utils/pdfReport";

const { ready, params, days } = provideParams();
const downloading = ref(false);

async function handleDownload() {
  const container = document.getElementById("results-root");
  if (!container || downloading.value) return;
  downloading.value = true;
  try {
    await generateReport(container, params, days.value);
  } catch (e) {
    console.error("Report generation failed", e);
  } finally {
    downloading.value = false;
  }
}
</script>

<template>
  <SidebarLayout>
    <template #sidebar>
      <template v-if="ready">
        <Button
          class="download-btn"
          variant="secondary"
          :disabled="downloading"
          @click="handleDownload"
        >
          {{ downloading ? "Generating…" : "Download report" }}
        </Button>
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
.download-btn {
  align-self: flex-start;
  margin-bottom: 1rem;
}
:deep(.MainContent) {
  max-width: 1600px;
}
</style>
