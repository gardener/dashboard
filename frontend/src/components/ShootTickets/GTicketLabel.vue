<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-chip
    label
    size="x-small"
    class="mr-1"
    :style="labelStyle(label)"
  >
    {{ label.name }}
  </v-chip>
</template>

<script>
import { pickAccessibleTextColor } from '@/utils/accessibleColors'

import get from 'lodash/get'

export default {
  props: {
    label: {
      type: Object,
      required: true,
    },
  },
  computed: {
    labelStyle () {
      return label => {
        const background = `#${get(label, ['color'])}`
        const textColor = pickAccessibleTextColor(background)
        return `background-color: ${background}; color: ${textColor};`
      }
    },
  },
}
</script>
