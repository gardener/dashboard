<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <!-- do not use kebab case for viewBox SVG attribute -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="width"
    :height="height"
    :viewBox="viewBox"
    :aria-labelledby="iconName"
  >
    <title
      v-if="iconName"
      :id="iconName"
      lang="en"
    >
      {{ iconName }} icon
    </title>
    <g :fill="iconColorCode">
      <slot />
    </g>
  </svg>
</template>

<script>
import { isHtmlColorCode } from '@/utils'

import get from 'lodash/get'

export default {
  props: {
    iconName: {
      type: String,
      required: false,
    },
    width: {
      type: [Number, String],
      default: 24,
    },
    height: {
      type: [Number, String],
      default: 24,
    },
    viewBox: {
      type: [Array, String],
      default: '0 0 25 25',
    },
    iconColor: {
      type: String,
      default: '#FFF',
    },
  },
  computed: {
    iconColorCode () {
      const iconColor = this.iconColor
      if (isHtmlColorCode(iconColor)) {
        return iconColor
      }
      const currentTheme = this.$vuetify.theme.current
      return get(currentTheme, ['colors', iconColor])
    },
  },
}
</script>
