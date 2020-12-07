<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-dialog
    ref="gDialog"
    :confirmButtonText="confirmButtonText"
    :cancelButtonText="cancelButtonText"
    :max-width="maxWidth"
    :defaultColor="dialogColor"
    :confirmValue="confirmValue"
    >
    <template v-slot:caption>{{captionText}}</template>
    <template v-slot:message>
      <div v-html="messageHtml"></div>
      <v-checkbox v-if="showDoNotAskAgain" v-model="doNotAskAgain" label="Do not ask me again"></v-checkbox>
    </template>
  </g-dialog>
</template>

<script>
import GDialog from '@/components/dialogs/GDialog'

export default {
  name: 'confirm-dialog',
  components: {
    GDialog
  },
  data () {
    return {
      confirmButtonText: undefined,
      cancelButtonText: undefined,
      captionText: undefined,
      messageHtml: undefined,
      dialogColor: undefined,
      maxWidth: undefined,
      confirmValue: undefined,
      showDoNotAskAgain: false,
      doNotAskAgain: false
    }
  },
  methods: {
    async waitForConfirmation ({ confirmButtonText, cancelButtonText, captionText, messageHtml, dialogColor, maxWidth, confirmValue, showDoNotAskAgain = false } = {}) {
      this.confirmButtonText = confirmButtonText || 'Confirm'
      this.cancelButtonText = cancelButtonText || 'Cancel'
      this.captionText = captionText || 'Confirm'
      this.messageHtml = messageHtml
      this.dialogColor = dialogColor || 'orange'
      this.maxWidth = maxWidth || '400'
      this.confirmValue = confirmValue
      this.showDoNotAskAgain = showDoNotAskAgain

      const confirmed = await this.$refs.gDialog.confirmWithDialog()
      if (!confirmed) {
        return undefined
      }

      if (this.showDoNotAskAgain) {
        return {
          confirmed,
          doNotAskAgain: this.doNotAskAgain
        }
      }
      return confirmed
    }
  }
}
</script>
