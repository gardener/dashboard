<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <GGenericActionButtonDialog
    ref="gDialog"
    :icon="icon"
    :color="color"
    :caption="caption"
    :tooltip="actionTooltip"
    :confirm-button-text="confirmButtonText"
    :confirm-required="confirmRequired"
    :width="width"
    :max-height="maxHeight"
    :loading="loading"
    :disabled="isDisabled"
    :disable-confirm-input-focus="disableConfirmInputFocus"
    :text="text"
    :can-perform-action="canPatchShoots"
    :affected-object-name="shootName"
    @before-dialog-opened="handleBeforeDialogOpened"
    @dialog-opened="handleDialogOpened"
  >
    <template #header>
      <slot name="header" />
    </template>
    <template #content>
      <slot name="content" />
    </template>
    <template #footer>
      <slot name="footer" />
    </template>
  </GGenericActionButtonDialog>
</template>

<script>
import { storeToRefs } from 'pinia'

import { useAuthzStore } from '@/store/authz'

import GGenericActionButtonDialog from '@/components/dialogs/GGenericActionButtonDialog'

import { useShootItem } from '@/composables/useShootItem'

export default {
  components: {
    GGenericActionButtonDialog,
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
    const authzStore = useAuthzStore()
    const { canPatchShoots } = storeToRefs(authzStore)
    const { shootName, isShootMarkedForDeletion, isShootActionsDisabledForPurpose } = useShootItem()

    return {
      canPatchShoots,
      shootName,
      isShootMarkedForDeletion,
      isShootActionsDisabledForPurpose,
    }
  },
  computed: {
    isDisabled () {
      return (this.isShootMarkedForDeletion && !this.ignoreDeletionStatus) ||
        this.isShootActionsDisabledForPurpose ||
        this.disabled
    },
    actionTooltip () {
      if (this.isShootActionsDisabledForPurpose) {
        return 'Actions disabled for clusters with purpose infrastructure'
      }
      if (this.isShootMarkedForDeletion && !this.ignoreDeletionStatus) {
        return 'Actions disabled for clusters that are marked for deletion'
      }
      return this.tooltip
    },
  },
  methods: {
    handleBeforeDialogOpened () {
      this.$emit('beforeDialogOpened')
    },
    handleDialogOpened () {
      this.$emit('dialogOpened')
    },
    showDialog () {
      if (this.$refs.gDialog) {
        this.$refs.gDialog.showDialog()
      }
    },
    waitForDialogClosed () {
      return this.$refs.gDialog.waitForDialogClosed()
    },
    setError ({ errorMessage, detailedErrorMessage }) {
      if (this.$refs.gDialog) {
        this.$refs.gDialog.setError({ errorMessage, detailedErrorMessage })
      }
    },
    hideDialog () {
      if (this.$refs.gDialog) {
        this.$refs.gDialog.hideDialog()
      }
    },
  },
}
</script>
