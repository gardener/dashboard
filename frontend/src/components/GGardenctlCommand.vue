<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list-item>
    <template
      v-if="showIcon"
      #prepend
    >
      <v-icon
        icon="mdi-console-line"
        color="primary"
      />
    </template>
    <g-list-item-content>
      {{ title }}
      <template #description>
        {{ subtitle }}
      </template>
    </g-list-item-content>
    <template #append>
      <g-gardenctl-info />
      <g-copy-btn :clipboard-text="command" />
      <g-action-button
        :icon="showCommand ? 'mdi-eye-off' : 'mdi-eye'"
        :tooltip="showCommand ? 'Hide Command' : 'Show Command'"
        @click="showCommand = !showCommand"
      />
    </template>
  </g-list-item>
  <g-list-item v-if="showCommand">
    <g-list-item-content>
      <g-code-block
        lang="shell"
        :content="displayCommand"
        :show-copy-button="false"
      />
    </g-list-item-content>
  </g-list-item>
</template>

<script setup>
import {
  computed,
  ref,
} from 'vue'

import GActionButton from '@/components/GActionButton.vue'
import GCodeBlock from '@/components/GCodeBlock.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GGardenctlInfo from '@/components/GGardenctlInfo.vue'
import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
  command: {
    type: String,
    required: true,
  },
  showIcon: {
    type: Boolean,
    default: true,
  },
})

const showCommand = ref(false)

const displayCommand = computed(() => {
  return '$ ' + props.command
    .replace(/ --/g, ' \\\n    --')
})
</script>

<style scoped>
  :deep(.hljs-meta) {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    user-select: none;
  }
</style>
