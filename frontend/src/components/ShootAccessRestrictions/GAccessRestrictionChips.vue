<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-collapsable-items
    :items="props.accessRestrictions"
    :uid="shootUid"
    inject-key="expandedAccessRestrictions"
    :collapse="collapse"
    hide-empty
    item-name="Restriction"
  >
    <template #item="{ item: { key, title, description, options: optionsList } }">
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
    </template>
  </g-collapsable-items>
</template>

<script setup>
import GCollapsableItems from '@/components/GCollapsableItems'

import { transformHtml } from '@/utils'

const props = defineProps({
  accessRestrictions: {
    type: Array,
  },
  collapse: {
    type: Boolean,
    default: false,
  },
  shootUid: {
    type: String,
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
