<script setup lang="ts">
import { useParams } from "../composables/useParams";
import ParamField from "../components/ParamField.vue";
import GroupEditor from "../components/GroupEditor.vue";

const { params, days } = useParams();
</script>

<template>
  <div class="section">
    <ParamField path="scenario.days" v-model="days" />
    <ParamField path="scenario.population" v-model="params.population" />
    <ParamField path="scenario.initial_infections" v-model="params.initial_infections" />
    <ParamField path="scenario.fraction_initial_immune" v-model="params.fraction_initial_immune" />
    <ParamField path="scenario.r0" v-model="params.r0" />
    <ParamField path="scenario.latent_period" v-model="params.latent_period" />
    <ParamField path="scenario.infectious_period" v-model="params.infectious_period" />
    <GroupEditor path="scenario.fraction_symptomatic" v-model="params.fraction_symptomatic" />
    <GroupEditor path="scenario.fraction_hospitalized" v-model="params.fraction_hospitalized" />
    <GroupEditor path="scenario.fraction_dead" v-model="params.fraction_dead" />
  </div>
</template>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
