<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <template v-if="canPatchShoots">
    <v-tooltip
      top
      max-width="600px"
      :disabled="disableToolTip"
    >
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          density="comfortable"
          variant="text"
          :disabled="isShootMarkedForDeletion || isShootActionsDisabledForPurpose || disabled"
          :[iconProp]="icon"
          :text="buttonText"
          :color="iconColor"
          :loading="loading"
          :width="buttonWidth"
          @click="showDialog"
        />
      </template>
      {{actionToolTip}}
    </v-tooltip>
    <g-dialog
      :confirm-button-text="confirmButtonText"
      :confirm-disabled="!valid"
      v-model:error-message="errorMessage"
      v-model:detailed-error-message="detailedErrorMessage"
      :width="width"
      :max-height="maxHeight"
      :confirm-value="confirmValue"
      :disable-confirm-input-focus="disableConfirmInputFocus"
      ref="gDialog"
    >
      <template #caption>{{caption}}</template>
      <template #affectedObjectName>{{shootName}}</template>
      <template #top><slot name="top"></slot></template>
      <template #card><slot name="card"></slot></template>
      <template #message><slot name="actionComponent"></slot></template>
      <template #errorMessage><slot name="errorMessage"></slot></template>
    </g-dialog>
  </template>
  <div v-else style="width: 36px"></div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store'

import { shootItem } from '@/mixins/shootItem'

import GDialog from '@/components/dialogs/GDialog'

export default defineComponent({
  components: {
    GDialog,
  },
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined,
    }
  },
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
    valid: {
      type: Boolean,
      default: true,
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
    iconColor: {
      type: String,
      default: 'action-button',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    disableConfirmInputFocus: {
      type: Boolean,
    },
    buttonText: {
      type: String,
    },
  },
  mixins: [shootItem],
  computed: {
    ...mapState(useAuthzStore, [
      'canPatchShoots',
    ]),
    iconProp () {
      return this.isTextButton ? 'prepend-icon' : 'icon'
    },
    confirmValue () {
      return this.confirmRequired ? this.shootName : undefined
    },
    isIconButton () {
      return !this.buttonText
    },
    isTextButton () {
      return !!this.buttonText
    },
    buttonWidth () {
      return this.buttonText ? '100%' : undefined
    },
    actionToolTip () {
      if (this.tooltip) {
        return this.tooltip
      }
      return this.shootActionToolTip(this.caption)
    },
    disableToolTip () {
      if (this.buttonText === this.actionToolTip) {
        return true
      }
      return false
    },
  },
  emits: [
    'dialogOpened',
  ],
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
})
</script>

<style lang="scss" scoped>
  :deep(.v-btn) {
    padding-left: 16px !important;
    justify-content: left !important;
  }
</style>
