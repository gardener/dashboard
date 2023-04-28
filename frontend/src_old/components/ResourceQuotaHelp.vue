<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="resourceQuotaHelpText">
    <v-tooltip location="top">
      <template v-slot:activator="{ on }">
        <v-btn
          v-on="on"
          icon
          color="toolbar-title"
          @click="showDialog"
        >
          <v-icon>mdi-help-circle-outline</v-icon>
        </v-btn>
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
import GDialog from '@/components/dialogs/GDialog.vue'
import { transformHtml } from '@/utils'
import { mapGetters } from 'vuex'

export default {
  name: 'resource-quota-help',
  components: {
    GDialog
  },
  computed: {
    ...mapGetters([
      'resourceQuotaHelpText'
    ]),
    resourceQuotaHelpHtml () {
      return transformHtml(this.resourceQuotaHelpText, true)
    }
  },
  methods: {
    showDialog () {
      this.$refs.gDialog.showDialog()
    }
  }
}
</script>
