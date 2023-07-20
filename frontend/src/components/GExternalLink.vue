<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <a
    :href="sanitizeUrl(url)"
    target="_blank"
    rel="noopener"
    class="text-anchor text-decoration-none text-no-wrap"
  >
    <span class="text-decoration-underline"><slot>{{ defaultTitle }}</slot></span>
    <v-icon
      :size="iconSize"
      icon="mdi-open-in-new"
      class="inherit-color"
    />
  </a>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  inject: ['sanitizeUrl'],
  props: {
    url: {
      type: String,
      required: true,
    },
    title: {
      type: String,
    },
    iconSize: {
      type: [Number, String],
      default: 14,
    },
  },
  computed: {
    defaultTitle () {
      return this.title ?? this.url
    },
  },
})
</script>
