<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    v-if="projectPhase !== 'Ready'"
    location="top"
  >
    <template #activator="{ props: activatorProps }">
      <v-icon
        v-bind="activatorProps"
        :size="size"
        :color="color"
        :icon="icon"
        class="ml-1"
      />
    </template>
    <div>
      The project phase is <v-chip
        color="primary"
        label
        size="x-small"
        class="px-1"
      >
        {{ projectPhase }}
      </v-chip>
    </div>
    <div class="text-caption">
      <span v-if="projectPhase === 'Terminating'">
        Gardener is currently cleaning up BackupEntries related to this project. The project will be removed when all cleanup activity has been finished.
      </span>
      <span v-else-if="projectPhase === 'Pending'">
        The project is currently being created and may not yet be ready to be used.
      </span>
      <span v-else>
        The project is in an unready state. The project might not be functional.
      </span>
    </div>
  </v-tooltip>
</template>

<script setup>
import {
  computed,
  toRef,
} from 'vue'

import { useProjectPhase } from '@/composables/useProjectItem'

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

const projectItem = toRef(props, 'project')

const projectPhase = useProjectPhase(projectItem)

const color = computed(() => {
  return ['Terminating', 'Pending'].includes(projectPhase.value)
    ? 'primary'
    : 'warning'
})

const icon = computed(() => {
  switch (projectPhase.value) {
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
