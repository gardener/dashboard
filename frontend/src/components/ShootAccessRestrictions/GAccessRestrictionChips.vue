<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <div
      v-for="{ key, title, description, options: optionsList } in selectedAccessRestrictions"
      :key="key"
      class="d-flex"
    >
      <v-tooltip
        location="top"
        :disabled="!description"
        max-width="600px"
      >
        <template #activator="{ props }">
          <v-chip
            v-bind="props"
            size="small"
            variant="tonal"
            color="primary"
            class="mr-2 my-0"
          >
            {{ title }}
          </v-chip>
        </template>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <section v-html="transformHtml(description)" />
      </v-tooltip>
      <v-tooltip
        v-for="options in optionsList"
        :key="`${key}_${options.key}`"
        location="top"
        :disabled="!options.description"
        max-width="600px"
      >
        <template #activator="{ props }">
          <v-chip
            v-bind="props"
            size="small"
            variant="tonal"
            color="primary"
            class="mr-2"
          >
            {{ options.title }}
          </v-chip>
        </template>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <section v-html="transformHtml(options.description)" />
      </v-tooltip>
    </div>
  </div>
</template>

<script>
import { transformHtml } from '@/utils'

export default {
  props: {
    selectedAccessRestrictions: {
      type: Array,
    },
  },
  methods: {
    transformHtml (value) {
      return transformHtml(value)
    },
  },
}
</script>

<style lang="scss" scoped>
  section {
    :deep(> p) {
      margin: 0;
    }
  }
</style>
