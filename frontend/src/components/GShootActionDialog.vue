<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-dialog
    ref="gDialog"
    :confirm-button-text="confirmButtonText"
    :confirm-disabled="confirmDisabled"
    :confirm-value="confirmValue"
    :disable-confirm-input-focus="confirmInputFocusDisabled"
    :width="width"
    :max-height="maxHeight"
  >
    <template #caption>{{ caption }}</template>
    <template #affectedObjectName>{{ shootName }}</template>
    <template #message><slot/></template>
    <template #errorMessage>
      <g-message
        color="error"
        v-model:message="errorMessage"
        v-model:detailed-message="detailedErrorMessage"
      />
    </template>
  </g-dialog>
</template>

<script>
import { shootItem } from '@/mixins/shootItem'

import GDialog from '@/components/dialogs/GDialog'
import GMessage from '@/components/GMessage.vue'

export default {
  components: {
    GDialog,
    GMessage,
  },
  props: {
    caption: {
      type: String,
      required: true,
    },
    confirmButtonText: {
      type: String,
      default: 'Save',
    },
    confirmRequired: {
      type: Boolean,
      default: false,
    },
    confirmInputFocusDisabled: {
      type: Boolean,
      default: false,
    },
    valid: {
      type: Boolean,
      default: true,
    },
    width: {
      type: String,
      default: '500',
    },
    maxHeight: {
      type: String,
      default: '50vh',
    },
  },
  mixins: [shootItem],
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined,
    }
  },
  computed: {
    confirmValue () {
      return this.confirmRequired ? this.shootName : undefined
    },
    confirmDisabled () {
      return !this.valid
    },
  },
  methods: {
    showDialog (resetError = true) {
      if (resetError) {
        this.errorMessage = undefined
        this.detailedErrorMessage = undefined
      }
      this.$refs.gDialog.showDialog()
    },
    waitForDialogClosed () {
      return this.$refs.gDialog.confirmWithDialog()
    },
    setError ({ errorMessage, detailedErrorMessage }) {
      this.errorMessage = errorMessage
      this.detailedErrorMessage = detailedErrorMessage
      this.showDialog(false)
    },
    hideDialog () {
      this.$refs.gDialog.hideDialog()
    },
  },
}
</script>
