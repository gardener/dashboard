<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

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
import { pickAccessibleColorPair } from '@/utils/accessibleColors'

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
        const labelColors = pickAccessibleColorPair(background)
        return `background-color: ${labelColors.background}; color: ${labelColors.textColor};`
      }
    },
  },
}
</script>
