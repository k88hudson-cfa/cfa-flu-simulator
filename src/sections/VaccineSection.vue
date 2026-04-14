<script setup lang="ts">
import { computed } from "vue";
import { SelectBox } from "cfasim-ui/components";
import MitigationSection from "../components/MitigationSection.vue";
import ParamField from "../components/ParamField.vue";
import { useParams } from "../composables/useParams";
import { getField } from "../config/uiConfig";

const { params, days } = useParams();
const vax = computed(() => params.mitigations.vaccine);

const dosesCfg = getField("mitigations.vaccine.doses");
const dosesOptions = (dosesCfg.options ?? []).map((o) => ({
  value: String(o.value),
  label: o.label,
}));
const dosesString = computed({
  get: () => String(vax.value.doses),
  set: (v: string) => {
    vax.value.doses = Number(v);
  },
});
</script>

<template>
  <MitigationSection
    label="Vaccine"
    :enabled="vax.enabled"
    @update:enabled="vax.enabled = $event"
  >
    <SelectBox
      :label="dosesCfg.label"
      v-model="dosesString"
      :options="dosesOptions"
    />
    <ParamField path="mitigations.vaccine.start" v-model="vax.start" :max="days" />
    <ParamField
      path="mitigations.vaccine.doses_available"
      v-model="vax.doses_available"
      :max="params.population"
    />
    <ParamField
      path="mitigations.vaccine.administration_rate"
      v-model="vax.administration_rate"
    />
    <template v-if="vax.doses === 2">
      <ParamField
        path="mitigations.vaccine.dose2_delay"
        v-model="vax.dose2_delay"
        :max="days"
      />
      <ParamField path="mitigations.vaccine.p_get_2_doses" v-model="vax.p_get_2_doses" />
    </template>
    <ParamField path="mitigations.vaccine.ve_s" v-model="vax.ve_s" />
    <ParamField path="mitigations.vaccine.ve_i" v-model="vax.ve_i" />
    <ParamField path="mitigations.vaccine.ve_p" v-model="vax.ve_p" />
    <template v-if="vax.doses === 2">
      <ParamField path="mitigations.vaccine.ve_2s" v-model="vax.ve_2s" />
      <ParamField path="mitigations.vaccine.ve_2i" v-model="vax.ve_2i" />
      <ParamField path="mitigations.vaccine.ve_2p" v-model="vax.ve_2p" />
    </template>
    <ParamField path="mitigations.vaccine.ramp_up" v-model="vax.ramp_up" />
  </MitigationSection>
</template>
