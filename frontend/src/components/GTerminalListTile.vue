<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list-item>
    <template v-slot:prepend>
      <v-icon icon="mdi-console" color="primary"/>
    </template>
    <g-list-item-content>
      Terminal
      <template v-slot:description>
        {{ description }}
      </template>
    </g-list-item-content>
    <template v-slot:append>
      <g-action-button
        icon="mdi-console-line"
        :disabled="disabled"
        :to=to
        :tooltip="buttonDescription || description"
      />
    </template>
  </g-list-item>
</template>

<script>
import { defineComponent } from 'vue'

import GListItem from './GListItem.vue'
import GListItemContent from './GListItemContent.vue'
import GActionButton from './GActionButton.vue'

import { shootItem } from '@/mixins/shootItem'

export default defineComponent({
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
})
</script>
