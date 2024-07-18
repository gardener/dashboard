<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-btn
      :icon="icon"
      size="small"
      variant="flat"
    />
    <v-tooltip
      activator="parent"
      location="top"
    >
      <div>{{ expanded ? 'Collapse items' : 'Expand items' }}</div>
      <div>
        <span :class="{'font-weight-bold': shiftPressed}">
          Shift-Click
        </span>
        to {{ expanded ? 'collapse' : 'expand' }} all items
      </div>
    </v-tooltip>
  </div>
</template>

<script setup>

import {
  computed,
  ref,
} from 'vue'
import {
  onKeyDown,
  onKeyUp,
} from '@vueuse/core'

const props = defineProps({
  expanded: {
    type: Boolean,
    default: false,
  },
})

const shiftPressed = ref(false)

const icon = computed(() => {
  if (shiftPressed.value) {
    return props.expanded ? 'mdi-chevron-double-left' : 'mdi-chevron-double-right'
  }
  return props.expanded ? 'mdi-chevron-left' : 'mdi-chevron-right'
})

onKeyDown('Shift', e => {
  shiftPressed.value = true
})

onKeyUp('Shift', e => {
  shiftPressed.value = false
})

</script>
