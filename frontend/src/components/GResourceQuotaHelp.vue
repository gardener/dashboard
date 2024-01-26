<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="resourceQuotaHelpText"
    class="mr-2"
  >
    <g-action-button
      icon="mdi-help-circle-outline"
      color="toolbar-title"
      @click="showDialog"
    >
      <template #tooltip>
        <span>Help</span>
      </template>
    </g-action-button>
    <g-dialog
      ref="gDialog"
      confirm-button-text="Ok"
      cancel-button-text=""
      width="600"
    >
      <template #caption>
        Quota Help
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
    </g-dialog>
  </div>
</template>

<script>
import { mapState } from 'pinia'

import { useConfigStore } from '@/store/config'

import GDialog from '@/components/dialogs/GDialog.vue'
import GActionButton from '@/components/GActionButton.vue'

import { transformHtml } from '@/utils'

export default {
  components: {
    GDialog,
    GActionButton,
  },
  computed: {
    ...mapState(useConfigStore, [
      'resourceQuotaHelpText',
    ]),
    resourceQuotaHelpHtml () {
      return transformHtml(this.resourceQuotaHelpText, true)
    },
  },
  methods: {
    showDialog () {
      this.$refs.gDialog.showDialog()
    },
  },
}
</script>
