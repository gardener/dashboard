<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <template v-if="canPatchShoots">
      <g-action-button
        :disabled="isDisabled"
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
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useAuthzStore } from '@/store/authz'

import GDialog from '@/components/dialogs/GDialog'

import { useShootItem } from '@/composables/useShootItem'

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
    ignoreDeletionStatus: {
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
  },
  emits: [
    'beforeDialogOpened',
    'dialogOpened',
  ],
  setup (props) {
    const errorMessage = ref()
    const detailedErrorMessage = ref()

    const authzStore = useAuthzStore()
    const {
      canPatchShoots,
    } = storeToRefs(authzStore)

    const {
      shootName,
      isShootMarkedForDeletion,
      isShootActionsDisabledForPurpose,
    } = useShootItem()

    return {
      errorMessage,
      detailedErrorMessage,
      canPatchShoots,
      shootName,
      isShootMarkedForDeletion,
      isShootActionsDisabledForPurpose,
    }
  },
  computed: {
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
    isDisabled () {
      return (this.isShootMarkedForDeletion && !this.ignoreDeletionStatus) ||
      this.isShootActionsDisabledForPurpose ||
      this.disabled
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
    shootActionToolTip (tooltip) {
      if (this.isShootActionsDisabledForPurpose) {
        return 'Actions disabled for clusters with purpose "infrastructure"'
      }

      if (!this.ignoreDeletionStatus && this.isShootMarkedForDeletion) {
        return 'Actions disabled for clusters that are marked for deletion'
      }

      return tooltip
    },
  },
}
</script>
