<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div>
    <template v-if="canPatchShoots">
      <g-action-button
        :disabled="isShootMarkedForDeletion || isShootActionsDisabledForPurpose || disabled"
        :loading="loading"
        :icon="icon"
        color="action-button"
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
          {{ shootName }}
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
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store/authz'

import GDialog from '@/components/dialogs/GDialog'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GDialog,
  },
  mixins: [shootItem],
  props: {
    icon: {
      type: String,
      default: 'mdi-cog-outline',
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
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    disableConfirmInputFocus: {
      type: Boolean,
    },
    text: {
      type: String,
    },
  },
  emits: [
    'dialogOpened',
  ],
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined,
    }
  },
  computed: {
    ...mapState(useAuthzStore, [
      'canPatchShoots',
    ]),
    confirmValue () {
      return this.confirmRequired ? this.shootName : undefined
    },
    actionToolTip () {
      if (this.tooltip) {
        return this.shootActionToolTip(this.tooltip)
      }
      return this.shootActionToolTip(this.caption)
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
      this.$refs.gDialog.showDialog()
      this.$nextTick(() => {
        // need to defer event until dialog has been rendered
        this.$emit('dialogOpened')
      })
    },
    async waitForDialogClosed () {
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
