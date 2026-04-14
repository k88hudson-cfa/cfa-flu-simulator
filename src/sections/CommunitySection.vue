<script setup lang="ts">
import { computed } from "vue";
import MitigationSection from "../components/MitigationSection.vue";
import ParamField from "../components/ParamField.vue";
import MatrixInput from "../components/MatrixInput.vue";
import { useParams } from "../composables/useParams";

const { params, days } = useParams();
const community = computed(() => params.mitigations.community);
const durationMax = computed(() => Math.max(1, days.value - community.value.start));
</script>

<template>
  <MitigationSection
    label="Community"
    :enabled="community.enabled"
    @update:enabled="community.enabled = $event"
  >
    <ParamField
      path="mitigations.community.start"
      v-model="community.start"
      :max="days.value"
    />
    <ParamField
      path="mitigations.community.duration"
      v-model="community.duration"
      :max="durationMax"
    />
    <MatrixInput
      path="mitigations.community.effectiveness"
      v-model="community.effectiveness"
    />
  </MitigationSection>
</template>
