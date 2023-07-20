<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div class="g-action-button">
    <template v-if="canPatchShoots">
      <v-tooltip
        top
        max-width="600px"
        :disabled="disableToolTip"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            variant="text"
            :density="isIconButton ? 'comfortable' : 'default'"
            :disabled="isShootMarkedForDeletion || isShootActionsDisabledForPurpose || disabled"
            :[iconProp]="icon"
            :text="buttonText"
            :color="iconColor"
            :loading="loading"
            :width="buttonWidth"
            :class="{ 'text-none font-weight-regular justify-start': !!buttonText }"
            @click="showDialog"
          />
        </template>
        {{ actionToolTip }}
      </v-tooltip>
      <g-dialog
        ref="gDialog"
        v-model:error-message="errorMessage"
        v-model:detailed-error-message="detailedErrorMessage"
        :confirm-button-text="confirmButtonText"
        :confirm-disabled="!valid"
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
        <template
          v-if="$slots.top"
          #top
        >
          <slot name="top" />
        </template>
        <template
          v-if="$slots.card"
          #card
        >
          <slot name="card" />
        </template>
        <template
          v-if="$slots.actionComponent"
          #message
        >
          <slot name="actionComponent" />
        </template>
        <template
          v-if="$slots.errorMessage"
          #errorMessage
        >
          <slot name="errorMessage" />
        </template>
        <template
          v-if="$slots.additionalMessage"
          #additionalMessage
        >
          <slot name="additionalMessage" />
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

import { useAuthzStore } from '@/store'

import { shootItem } from '@/mixins/shootItem'

import GDialog from '@/components/dialogs/GDialog'

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
