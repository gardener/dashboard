<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-tooltip location="top">
      <template #activator="{ props:tprops }">
        <v-icon
          v-bind="tprops"
          size="small"
          class="mr-2"
        >
          {{ computedItem.kind.icon }}
        </v-icon>
      </template>
      <span>{{ computedItem.kind.tooltip }}</span>
    </v-tooltip>
    {{ computedItem.name }}
    <v-tooltip
      v-if="!computedItem.hasOwnCredential"
      location="top"
    >
      <template #activator="{ props: tprops }">
        <v-icon
          v-bind="tprops"
          size="small"
          class="ml-2"
        >
          mdi-account-arrow-left
        </v-icon>
      </template>
      <span>Credential shared by {{ computedItem.credentialNamespace }}</span>
    </v-tooltip>
  </div>
</template>

<script>

import { computeBindingItem } from '@/utils'

export default {
  props: {
    item: {
      type: Object,
    },
  },
  computed: {
    computedItem () {
      return computeBindingItem(this.item)
    },
  },
}
</script>
