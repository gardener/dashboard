<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-tooltip location="top">
      <template #activator="{ props: tooltipProps }">
        <v-btn
          v-bind="tooltipProps"
          :icon="icon"
          size="small"
          density="compact"
          variant="flat"
        />
      </template>
      <div>{{ expanded ? 'Collapse items' : 'Expand items' }}</div>
      <div>Shift-Click to {{ expanded ? 'collapse' : 'expand' }} all items</div>
    </v-tooltip>
  </div>
</template>

<script setup>

import { computed } from 'vue'

const props = defineProps({
  expanded: {
    type: Boolean,
    default: false,
  },
})

const icon = computed(() => {
  return props.expanded ? 'mdi-chevron-left' : 'mdi-chevron-right'
})

</script>
