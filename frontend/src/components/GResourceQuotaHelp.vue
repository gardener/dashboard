<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="resourceQuotaHelpText">
    <v-tooltip location="top">
      <template v-slot:activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-help-circle-outline"
          color="toolbar-title"
          variant="text"
          size="small"
          @click="showDialog"
        />
      </template>
      Help
    </v-tooltip>
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
import { transformHtml } from '@/utils'

export default defineComponent({
  components: {
    GDialog,
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
