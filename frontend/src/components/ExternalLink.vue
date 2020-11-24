<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <a :href="url" target="_blank">
    <span :style="{ fontSize: size + 'px' }"><slot></slot></span><v-icon :size="size" :color="color">mdi-open-in-new</v-icon>
  </a>
</template>

<script>

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
