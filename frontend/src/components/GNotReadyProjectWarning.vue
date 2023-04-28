<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip location="top" v-if="projectDetails.phase !== 'Ready'">
    <template v-slot:activator="{ props }">
      <v-icon v-bind="props" :size="size" :color="color" :icon="icon"  class="ml-1" />
    </template>
    <div>
      The project phase is <v-chip color="primary" label x-small class="px-1">{{ projectDetails.phase }}</v-chip>
    </div>
    <div class="text-caption">
      <span v-if="projectDetails.phase === 'Terminating'">
        Gardener is currently cleaning up BackupEntries related to this project. The project will be removed when all cleanup activity has been finished.
      </span>
      <span v-else-if="projectDetails.phase === 'Pending'">
        The project is currently being created and may not yet be ready to be used.
      </span>
      <span v-else>
        The project is in an unready state. The project might not be functional.
      </span>
    </div>
  </v-tooltip>
</template>

<script setup>
import { computed } from 'vue'
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
})

const projectDetails = computed(() => {
  return getProjectDetails(props.project)
})

const color = computed(() => {
  return ['Terminating', 'Pending'].includes(projectDetails.value.phase)
    ? 'primary'
    : 'warning'
})

const icon = computed(() => {
  switch (projectDetails.value.phase) {
    case 'Terminating':
      return 'mdi-delete-sweep'
    case 'Pending':
      return 'mdi-plus-circle-outline'
    default:
      return 'mdi-alert-circle-outline'
  }
})
</script>

<style lang="scss" scoped>
  .staleIcon {
    margin-left: 10px;
  }
</style>
