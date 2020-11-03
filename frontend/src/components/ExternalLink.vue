<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <a :href="url" target="_blank" :class="textColor">
    <span :style="{ fontSize: size + 'px' }"><slot></slot></span><v-icon :size="size" :color="color">mdi-open-in-new</v-icon>
  </a>
</template>

<script>
import { textColorFromColor } from '@/utils'

export default {
  name: 'external-link',
  props: {
    url: {
      type: String
    },
    text: {
      type: String
    },
    size: {
      type: Number,
      default: 14
    },
    color: {
      type: String,
      default: 'cyan darken-2'
    }
  },
  computed: {
    textColor () {
      return textColorFromColor(this.color)
    }
  }
}
</script>

<style scoped>
  a {
    text-decoration: none;
  }
  a > span {
    text-decoration-line: underline;
  }
</style>
