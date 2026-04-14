<script setup lang="ts">
import { computed } from "vue";
import MitigationSection from "../components/MitigationSection.vue";
import ParamField from "../components/ParamField.vue";
import { useParams } from "../composables/useParams";

const { params } = useParams();
const ttiq = computed(() => params.mitigations.ttiq);
</script>

<template>
  <MitigationSection
    label="TTIQ"
    :enabled="ttiq.enabled"
    @update:enabled="ttiq.enabled = $event"
  >
    <ParamField path="mitigations.ttiq.p_id_infectious" v-model="ttiq.p_id_infectious" />
    <ParamField
      path="mitigations.ttiq.p_infectious_isolates"
      v-model="ttiq.p_infectious_isolates"
    />
    <ParamField
      path="mitigations.ttiq.isolation_reduction"
      v-model="ttiq.isolation_reduction"
    />
    <ParamField
      path="mitigations.ttiq.p_contact_trace"
      v-model="ttiq.p_contact_trace"
    />
    <ParamField
      path="mitigations.ttiq.p_traced_quarantines"
      v-model="ttiq.p_traced_quarantines"
    />
  </MitigationSection>
</template>
