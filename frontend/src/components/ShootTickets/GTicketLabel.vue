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
import contrast from 'get-contrast'

import { get } from '@/lodash'

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
        const bgColor = `#${get(label, 'color')}`
        const textColor = contrast.isAccessible(bgColor, '#fff') ? '#fff' : '#000'
        return `background-color: ${bgColor}; color: ${textColor};`
      }
    },
  },
}
</script>
