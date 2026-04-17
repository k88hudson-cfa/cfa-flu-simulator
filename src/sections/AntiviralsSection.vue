<script setup lang="ts">
import MitigationSection from "../components/MitigationSection.vue";
import ParamField from "../components/ParamField.vue";
import { useParams } from "../composables/useParams";

const { params } = useParams();
</script>

<template>
  <MitigationSection
    label="Antivirals"
    :enabled="params.antivirals_enabled"
    @update:enabled="params.antivirals_enabled = $event"
  >
    <ParamField path="antivirals_ave_i" v-model="params.antivirals_ave_i" />
    <ParamField path="antivirals_ave_p_hosp" v-model="params.antivirals_ave_p_hosp" />
    <ParamField path="antivirals_ave_p_death" v-model="params.antivirals_ave_p_death" />
    <ParamField
      path="antivirals_fraction_seek_care"
      v-model="params.antivirals_fraction_seek_care"
    />
    <ParamField
      path="antivirals_fraction_diagnosed_prescribed_outpatient"
      v-model="params.antivirals_fraction_diagnosed_prescribed_outpatient"
    />
    <ParamField
      path="antivirals_fraction_adhere"
      v-model="params.antivirals_fraction_adhere"
    />
    <ParamField
      path="antivirals_fraction_diagnosed_prescribed_inpatient"
      v-model="params.antivirals_fraction_diagnosed_prescribed_inpatient"
    />
  </MitigationSection>
</template>
