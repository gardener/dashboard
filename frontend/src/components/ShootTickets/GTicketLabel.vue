<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-chip
    label
    size="x-small"
    class="mr-1"
    :style="labelStyle"
  >
    {{ label.name }}
  </v-chip>
</template>

<script setup>
import { computed } from 'vue'

import { pickAccessibleTextColor } from '@/utils/accessibleColors'

const props = defineProps({
  label: {
    type: Object,
    required: true,
  },
})
const HEX_COLOR_REGEX = /^[0-9a-fA-F]{6}$/

const labelStyle = computed(() => {
  if (!HEX_COLOR_REGEX.test(props.label.color)) {
    return {
      backgroundColor: 'rgb(var(--v-theme-surface-variant))',
      color: 'rgb(var(--v-theme-on-surface-variant))',
    }
  }

  const background = `#${props.label.color}`
  return {
    backgroundColor: background,
    color: pickAccessibleTextColor(background),
  }
})

</script>
