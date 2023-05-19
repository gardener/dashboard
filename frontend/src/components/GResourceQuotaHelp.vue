<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="resourceQuotaHelpText" class="mr-2">
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
      <template v-slot:caption>Quota Help</template>
      <template v-slot:message>
        <div class="wrap-text" v-html="resourceQuotaHelpHtml"></div>
      </template>
    </g-dialog>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapState } from 'pinia'
import { useConfigStore } from '@/store'
import GDialog from '@/components/dialogs/GDialog.vue'
import GActionButton from '@/components/GActionButton.vue'
import { transformHtml } from '@/utils'

export default defineComponent({
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
})
</script>
