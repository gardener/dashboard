<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container
    fluid
    class="pa-6"
  >
    <v-row class="d-flex">
      <v-col
        cols="12"
        md="6"
      >
        <g-seed-details-card />
        <g-seed-infrastructure-card />
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <g-seed-access-card />
        <g-seed-monitoring-card />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import GSeedAccessCard from '@/components/SeedDetails/GSeedAccessCard.vue'
import GSeedDetailsCard from '@/components/SeedDetails/GSeedDetailsCard.vue'
import GSeedInfrastructureCard from '@/components/SeedDetails/GSeedInfrastructureCard.vue'
import GSeedMonitoringCard from '@/components/SeedDetails/GSeedMonitoringCard.vue'
</script>
