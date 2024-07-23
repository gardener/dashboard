<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    v-if="staleSinceTimestamp"
    location="top"
  >
    <template #activator="{ props: activatorProps }">
      <v-icon
        v-bind="activatorProps"
        :size="size"
        :icon="icon"
        class="ml-1"
      />
    </template>
    <span v-if="staleAutoDeleteTimestamp">
      This is a <span class="font-weight-bold">stale</span> project. Gardener will auto delete this project
      <g-time-string
        :date-time="staleAutoDeleteTimestamp"
        mode="future"
        no-tooltip
        content-class="font-weight-bold"
      />
    </span>
    <span v-else>
      This project is considered <span class="font-weight-bold">stale</span> since
      <g-time-string
        :date-time="staleSinceTimestamp"
        without-prefix-or-suffix
        no-tooltip
        content-class="font-weight-bold"
      />
    </span>
  </v-tooltip>
</template>

<script setup>
import {
  computed,
  toRef,
} from 'vue'

import GTimeString from '@/components/GTimeString.vue'

import {
  useProjectStaleAutoDeleteTimestamp,
  useProjectStaleSinceTimestamp,
} from '@/composables/useProjectItem'

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

const size = toRef(props, 'size')
const projectItem = toRef(props, 'project')

const staleAutoDeleteTimestamp = useProjectStaleAutoDeleteTimestamp(projectItem)
const staleSinceTimestamp = useProjectStaleSinceTimestamp(projectItem)

const icon = computed(() => {
  return staleAutoDeleteTimestamp.value
    ? 'mdi-delete-clock'
    : 'mdi-clock-alert-outline'
})
</script>
