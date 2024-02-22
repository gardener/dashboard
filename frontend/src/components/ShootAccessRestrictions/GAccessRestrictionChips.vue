<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-collapsable-items
    :items="selectedAccessRestrictions"
    :uid="shootUid"
    inject-key="expandedAccessRestrictions"
    :collapse="collapse"
    hide-empty
    item-name="Restriction"
  >
    <template #item="{ item: { key, title, description, options: optionsList } }">
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
            label
          >
            {{ options.title }}
          </v-chip>
        </template>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <section v-html="transformHtml(options.description)" />
      </v-tooltip>
    </template>
  </g-collapsable-items>
</template>

<script>
import GCollapsableItems from '@/components/GCollapsableItems'

import { transformHtml } from '@/utils'

export default {
  components: {
    GCollapsableItems,
  },
  props: {
    selectedAccessRestrictions: {
      type: Array,
    },
    collapse: {
      type: Boolean,
      default: false,
    },
    shootUid: {
      type: String,
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
