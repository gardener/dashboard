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

import get from 'lodash/get'

const props = defineProps({
  label: {
    type: Object,
    required: true,
  },
})

const labelStyle = computed(() => {
  const background = `#${get(props.label, ['color'])}`
  const textColor = pickAccessibleTextColor(background)
  return `background-color: ${background}; color: ${textColor};`
})
</script>
