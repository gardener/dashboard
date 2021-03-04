<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-dialog
    ref="gDialog"
    :confirm-button-text="confirmButtonText"
    :cancel-button-text="cancelButtonText"
    :max-width="maxWidth"
    :default-color="dialogColor"
    :confirm-value="confirmValue"
    >
    <template v-slot:caption>{{captionText}}</template>
    <template v-slot:message>
      <div v-html="messageHtml"></div>
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
      confirmValue: undefined
    }
  },
  methods: {
    waitForConfirmation ({ confirmButtonText, cancelButtonText, captionText, messageHtml, dialogColor, maxWidth, confirmValue } = {}) {
      this.confirmButtonText = confirmButtonText || 'Confirm'
      this.cancelButtonText = cancelButtonText || 'Cancel'
      this.captionText = captionText || 'Confirm'
      this.messageHtml = messageHtml
      this.dialogColor = dialogColor || 'toolbar-background'
      this.maxWidth = maxWidth || '400'
      this.confirmValue = confirmValue

      return this.$refs.gDialog.confirmWithDialog()
    }
  }
}
</script>
