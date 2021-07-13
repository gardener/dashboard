<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <a :href="sanitizeUrl(url)" target="_blank" rel="noopener">
    <span :style="{ fontSize: size + 'px' }"><slot></slot></span><v-icon :size="size" >mdi-open-in-new</v-icon>
  </a>
</template>

<script>
import sanitizeUrl from '@/mixins/sanitizeUrl'

export default {
  name: 'external-link',
  mixins: [sanitizeUrl],
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
