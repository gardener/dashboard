<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-wrap">
    <v-chip
      size="small"
      variant="tonal"
      color="primary"
      class="mr-2 my-1"
    >
      {{ title }}
      <v-tooltip
        activator="parent"
        location="top"
        :disabled="!description"
        max-width="600px"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="transformHtml(description)" />
      </v-tooltip>
    </v-chip>

    <v-chip
      v-for="option in options"
      :key="`${id}_${option.key}`"
      size="small"
      variant="tonal"
      color="primary"
      class="mr-2 my-1"
    >
      {{ option.title }}
      <v-tooltip
        activator="parent"
        location="top"
        :disabled="!option.description"
        max-width="600px"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="transformHtml(option.description)" />
      </v-tooltip>
    </v-chip>
  </div>
</template>

<script setup>
import { transformHtml } from '@/utils'

defineProps({
  id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  options: {
    type: Array,
    required: true,
  },
})
</script>

<style lang="scss" scoped>
  section {
    :deep(> p) {
      margin: 0;
    }
  }
</style>
