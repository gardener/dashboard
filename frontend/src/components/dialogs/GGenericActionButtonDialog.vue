<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <template v-if="canPerformAction">
      <g-action-button
        :disabled="disabled"
        :loading="loading"
        :icon="icon"
        :color="color"
        :text="text"
        :tooltip="actionToolTip"
        :tooltip-disabled="disableToolTip"
        @click="showDialog"
      />
      <g-dialog
        ref="gDialog"
        v-model:error-message="errorMessage"
        v-model:detailed-error-message="detailedErrorMessage"
        :confirm-button-text="confirmButtonText"
        :width="width"
        :max-height="maxHeight"
        :confirm-value="confirmValue"
        :disable-confirm-input-focus="disableConfirmInputFocus"
      >
        <template #caption>
          {{ caption }}
        </template>
        <template #affectedObjectName>
          {{ affectedObjectName }}
        </template>
        <template #header>
          <slot name="header" />
        </template>
        <template #content>
          <slot name="content" />
        </template>
        <template #footer>
          <slot name="footer" />
        </template>
      </g-dialog>
    </template>
    <div
      v-else
      style="width: 36px"
    />
  </div>
</template>

<script>
import { ref } from 'vue'

import GDialog from '@/components/dialogs/GDialog'

export default {
  components: {
    GDialog,
  },
  props: {
    icon: {
      type: String,
      default: 'mdi-cog-outline',
    },
    color: {
      type: String,
      default: 'action-button',
    },
    caption: {
      type: String,
    },
    tooltip: {
      type: String,
    },
    confirmButtonText: {
      type: String,
      default: 'Save',
    },
    confirmRequired: {
      type: Boolean,
      default: false,
    },
    width: {
      type: String,
    },
    maxHeight: {
      type: String,
      default: '50vh',
    },
    loading: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    disableConfirmInputFocus: {
      type: Boolean,
      default: false,
    },
    text: {
      type: String,
    },
    canPerformAction: {
      type: Boolean,
      required: true,
    },
    affectedObjectName: {
      type: String,
    },
  },
  emits: [
    'beforeDialogOpened',
    'dialogOpened',
  ],
  setup (props) {
    const errorMessage = ref()
    const detailedErrorMessage = ref()

    return {
      errorMessage,
      detailedErrorMessage,
    }
  },
  computed: {
    confirmValue () {
      return this.confirmRequired ? this.affectedObjectName : undefined
    },
    actionToolTip () {
      return this.tooltip || this.caption
    },
    disableToolTip () {
      return this.text === this.actionToolTip
    },
  },
  methods: {
    showDialog (resetError = true) {
      if (resetError) {
        this.errorMessage = undefined
        this.detailedErrorMessage = undefined
      }
      if (this.$refs.gDialog) {
        this.$emit('beforeDialogOpened')
        this.$refs.gDialog.showDialog()
        this.$emit('dialogOpened')
      }
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
      if (this.$refs.gDialog) {
        this.$refs.gDialog.hideDialog()
      }
    },
  },
}
</script>
