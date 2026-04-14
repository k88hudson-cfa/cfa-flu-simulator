<script setup lang="ts">
import { computed } from "vue";
import MitigationSection from "../components/MitigationSection.vue";
import ParamField from "../components/ParamField.vue";
import { useParams } from "../composables/useParams";

const { params } = useParams();
const av = computed(() => params.mitigations.antivirals);
</script>

<template>
  <MitigationSection
    label="Antivirals"
    :enabled="av.enabled"
    @update:enabled="av.enabled = $event"
  >
    <ParamField path="mitigations.antivirals.ave_i" v-model="av.ave_i" />
    <ParamField path="mitigations.antivirals.ave_p_hosp" v-model="av.ave_p_hosp" />
    <ParamField path="mitigations.antivirals.ave_p_death" v-model="av.ave_p_death" />
    <ParamField
      path="mitigations.antivirals.fraction_seek_care"
      v-model="av.fraction_seek_care"
    />
    <ParamField
      path="mitigations.antivirals.fraction_diagnosed_prescribed_outpatient"
      v-model="av.fraction_diagnosed_prescribed_outpatient"
    />
    <ParamField
      path="mitigations.antivirals.fraction_adhere"
      v-model="av.fraction_adhere"
    />
    <ParamField
      path="mitigations.antivirals.fraction_diagnosed_prescribed_inpatient"
      v-model="av.fraction_diagnosed_prescribed_inpatient"
    />
  </MitigationSection>
</template>
