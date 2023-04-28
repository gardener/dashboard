<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list-item>
    <v-list-item-icon>
      <v-icon v-if="icon" color="primary">{{icon}}</v-icon>
    </v-list-item-icon>
    <v-list-item-content :class="contentClass">
      <v-list-item-subtitle>{{appTitle}}</v-list-item-subtitle>
      <v-list-item-title class="pt-1">
        <v-tooltip v-if="isShootStatusHibernated" location="top">
          <template v-slot:activator="{ on }">
            <span v-on="on">{{urlText}}</span>
          </template>
          {{appTitle}} is not running for hibernated clusters
        </v-tooltip>
        <external-link v-else :url="url"></external-link>
      </v-list-item-title>
    </v-list-item-content>
  </v-list-item>
</template>

<script>
import ExternalLink from '@/components/ExternalLink.vue'

export default {
  components: {
    ExternalLink
  },
  props: {
    appTitle: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    urlText: {
      type: String,
      required: true
    },
    icon: {
      type: String
    },
    isShootStatusHibernated: {
      type: Boolean
    },
    contentClass: {
      type: String
    }
  }
}
</script>
