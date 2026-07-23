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
import { wcagContrast } from 'culori'

import get from 'lodash/get'

function accessibleTextColor (background) {
  try {
    return wcagContrast(background, '#ffffff') >= 4.5 ? '#fff' : '#000'
  } catch {
    return '#fff'
  }
}

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
        const bgColor = `#${get(label, ['color'])}`
        return `background-color: ${bgColor}; color: ${accessibleTextColor(bgColor)};`
      }
    },
  },
}
</script>
