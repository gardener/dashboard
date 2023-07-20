<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list-item :class="contentClass">
    <template
      v-if="icon"
      #prepend
    >
      <v-icon
        :icon="icon"
        color="primary"
      />
    </template>
    <g-list-item-content
      :label="appTitle"
    >
      <v-tooltip
        v-if="isShootStatusHibernated"
        location="top"
      >
        <template #activator="{ props }">
          <span v-bind="props">{{ urlText }}</span>
        </template>
        {{ appTitle }} is not running for hibernated clusters
      </v-tooltip>
      <g-external-link
        v-else
        :url="url"
      />
    </g-list-item-content>
  </g-list-item>
</template>

<script>
import { defineComponent } from 'vue'

import GListItem from './GListItem.vue'
import GListItemContent from './GListItemContent.vue'
import GExternalLink from '@/components/GExternalLink.vue'

export default defineComponent({
  components: {
    GListItem,
    GListItemContent,
    GExternalLink,
  },
  props: {
    appTitle: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    urlText: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
    },
    isShootStatusHibernated: {
      type: Boolean,
    },
    contentClass: {
      type: String,
    },
  },
})
</script>
