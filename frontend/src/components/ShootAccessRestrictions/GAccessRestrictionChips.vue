<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-for="{ key, title, description, options: optionsList } in props.accessRestrictions"
    :key="key"
    class="d-flex"
  >
    <v-chip
      size="small"
      variant="tonal"
      color="primary"
      class="mr-2 my-0"
    >
      {{ title }}
      <v-tooltip
        activator="parent"
        location="top"
        :disabled="!description"
        max-width="600px"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="transformHtml(description) " />
      </v-tooltip>
    </v-chip>

    <v-chip
      v-for="options in optionsList "
      :key="`${key}_${options.key}`"
      size="small"
      variant="tonal"
      color="primary"
      class="mr-2"
    >
      {{ options.title }}
      <v-tooltip
        activator="parent"
        location="top"
        :disabled="!options.description"
        max-width="600px"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="transformHtml(options.description) " />
      </v-tooltip>
    </v-chip>
  </div>
</template>

<script setup>
import { transformHtml } from '@/utils'

const props = defineProps({
  accessRestrictions: {
    type: Array,
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
