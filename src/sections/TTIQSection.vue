<script setup lang="ts">
import MitigationSection from "../components/MitigationSection.vue";
import ParamField from "../components/ParamField.vue";
import { useParams } from "../composables/useParams";

const { params } = useParams();
</script>

<template>
  <MitigationSection
    label="TTIQ"
    :enabled="params.ttiq_enabled"
    @update:enabled="params.ttiq_enabled = $event"
  >
    <ParamField path="ttiq_p_id_infectious" v-model="params.ttiq_p_id_infectious" />
    <ParamField
      path="ttiq_p_infectious_isolates"
      v-model="params.ttiq_p_infectious_isolates"
    />
    <ParamField
      path="ttiq_isolation_reduction"
      v-model="params.ttiq_isolation_reduction"
    />
    <ParamField
      path="ttiq_p_contact_trace"
      v-model="params.ttiq_p_contact_trace"
    />
    <ParamField
      path="ttiq_p_traced_quarantines"
      v-model="params.ttiq_p_traced_quarantines"
    />
  </MitigationSection>
</template>
