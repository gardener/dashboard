<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list-item>
    <template #prepend>
      <v-icon
        icon="mdi-console"
        color="primary"
      />
    </template>
    <g-list-item-content>
      Terminal
      <template #description>
        {{ description }}
      </template>
    </g-list-item-content>
    <template #append>
      <g-action-button
        icon="mdi-console-line"
        :disabled="disabled"
        :to="to"
        :tooltip="buttonDescription || description"
      />
    </template>
  </g-list-item>
</template>

<script>
import GListItem from './GListItem.vue'
import GListItemContent from './GListItemContent.vue'
import GActionButton from './GActionButton.vue'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GListItem,
    GListItemContent,
    GActionButton,
  },
  mixins: [shootItem],
  props: {
    target: {
      type: String,
    },
    description: {
      type: String,
    },
    buttonDescription: {
      type: String,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    to () {
      return {
        name: 'ShootItemTerminal',
        params: {
          namespace: this.shootNamespace,
          name: this.shootName,
        },
      }
    },
  },
}
</script>
