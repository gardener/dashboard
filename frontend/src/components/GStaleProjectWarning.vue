<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip location="top" v-if="projectDetails.staleSinceTimestamp">
    <template #activator="{ props }">
      <v-icon v-bind="props" :size="size" :color="color" :icon="icon"  class="ml-1" />
    </template>
    <span v-if="projectDetails.staleAutoDeleteTimestamp">
      This is a <span class="font-weight-bold">stale</span> project. Gardener will auto delete this project
      <g-time-string :date-time="projectDetails.staleAutoDeleteTimestamp"
        mode="future"
        no-tooltip
        content-class="font-weight-bold"
      />
    </span>
    <span v-else>
      This project is considered <span class="font-weight-bold">stale</span> since
      <g-time-string
        :date-time="projectDetails.staleSinceTimestamp"
        without-prefix-or-suffix
        no-tooltip
        content-class="font-weight-bold"
      />
    </span>
  </v-tooltip>
</template>

<script setup>
import { computed, toRef } from 'vue'
import GTimeString from '@/components/GTimeString.vue'
import { getProjectDetails } from '@/utils'

const props = defineProps({
  project: {
    type: Object,
    default: null,
  },
  size: {
    type: String,
    default: 'default',
  },
  color: {
    type: String,
    default: 'primary',
  },
})

const { size, color } = toRef(props, 'color')

const projectDetails = computed(() => {
  return getProjectDetails(props.project)
})

const icon = computed(() => {
  return projectDetails.value.staleAutoDeleteTimestamp
    ? 'mdi-delete-clock'
    : 'mdi-clock-alert-outline'
})
</script>
