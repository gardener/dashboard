<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-generic-action-button-dialog
    icon="mdi-help-circle-outline"
    color="toolbar-title"
    class="mr-4"
    caption="Quota Help"
    :can-perform-action="!!resourceQuotaHelpText"
    cancel-button-text=""
    confirm-button-text="Close"
  >
    <template #tooltip>
      <span>Help</span>
    </template>
    <template #content>
      <v-card-text>
        <!-- eslint-disable vue/no-v-html -->
        <div
          class="wrap-text"
          v-html="resourceQuotaHelpHtml"
        />
        <!-- eslint-enable vue/no-v-html -->
      </v-card-text>
    </template>
  </g-generic-action-button-dialog>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { useConfigStore } from '@/store/config'

import GGenericActionButtonDialog from '@/components/dialogs/GGenericActionButtonDialog.vue'

import { transformHtml } from '@/utils'

const configStore = useConfigStore()
const { resourceQuotaHelpText } = storeToRefs(configStore)

const resourceQuotaHelpHtml = computed(() => {
  return transformHtml(resourceQuotaHelpText.value, true)
})

</script>
