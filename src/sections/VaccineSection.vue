<script setup lang="ts">
import { computed } from "vue";
import { SelectBox } from "cfasim-ui/components";
import MitigationSection from "../components/MitigationSection.vue";
import ParamField from "../components/ParamField.vue";
import { useParams } from "../composables/useParams";
import { getField } from "../config/uiConfig";

const { params } = useParams();

const dosesCfg = getField("vaccine_doses");
const dosesOptions = (dosesCfg.options ?? []).map((o) => ({
  value: String(o.value),
  label: o.label,
}));
const dosesString = computed({
  get: () => String(params.vaccine_doses),
  set: (v: string) => {
    params.vaccine_doses = Number(v);
  },
});
</script>

<template>
  <MitigationSection
    label="Vaccine"
    :enabled="params.vaccine_enabled"
    @update:enabled="params.vaccine_enabled = $event"
  >
    <SelectBox
      :label="dosesCfg.label"
      v-model="dosesString"
      :options="dosesOptions"
    />
    <ParamField path="vaccine_start" v-model="params.vaccine_start" :max="params.days" />
    <ParamField
      path="vaccine_doses_available"
      v-model="params.vaccine_doses_available"
      :max="params.population"
    />
    <ParamField
      path="vaccine_administration_rate"
      v-model="params.vaccine_administration_rate"
    />
    <template v-if="params.vaccine_doses === 2">
      <ParamField
        path="vaccine_dose2_delay"
        v-model="params.vaccine_dose2_delay"
        :max="params.days"
      />
      <ParamField path="vaccine_p_get_2_doses" v-model="params.vaccine_p_get_2_doses" />
    </template>
    <ParamField path="vaccine_ve_s" v-model="params.vaccine_ve_s" />
    <ParamField path="vaccine_ve_i" v-model="params.vaccine_ve_i" />
    <ParamField path="vaccine_ve_p" v-model="params.vaccine_ve_p" />
    <template v-if="params.vaccine_doses === 2">
      <ParamField path="vaccine_ve_2s" v-model="params.vaccine_ve_2s" />
      <ParamField path="vaccine_ve_2i" v-model="params.vaccine_ve_2i" />
      <ParamField path="vaccine_ve_2p" v-model="params.vaccine_ve_2p" />
    </template>
    <ParamField path="vaccine_ramp_up" v-model="params.vaccine_ramp_up" />
  </MitigationSection>
</template>
