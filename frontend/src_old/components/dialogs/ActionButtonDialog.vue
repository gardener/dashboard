<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div v-if="canPatchShoots">
    <v-tooltip location="top" max-width="600px" :disabled="disableToolTip">
      <template v-slot:activator="{ on }">
        <div v-on="on">
          <v-btn
            :icon="isIconButton"
            :variant="isTextButton && 'text'"
            :size="smallIcon && 'small'"
            :color="iconColor"
            :loading="loading"
            :disabled="isShootMarkedForDeletion || isShootActionsDisabledForPurpose || disabled"
            @click="showDialog"
            :width="buttonWidth"
            class="text-none font-weight-regular pa-0"
          >
            <div>
              <v-icon :size="!smallIcon && 'medium'">{{icon}}</v-icon>
            </div>
            <div v-if="isTextButton" class="ml-3 d-flex flex-grow-1">
              {{buttonText}}
            </div>
          </v-btn>
        </div>
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
      <template v-slot:caption>{{caption}}</template>
      <template v-slot:affectedObjectName>{{shootName}}</template>
      <template v-slot:top><slot name="top"></slot></template>
      <template v-slot:card><slot name="card"></slot></template>
      <template v-slot:message><slot name="actionComponent"></slot></template>
      <template v-slot:errorMessage><slot name="errorMessage"></slot></template>
    </g-dialog>
  </div>
  <div v-else style="width: 36px"></div>
</template>

<script>
import GDialog from '@/components/dialogs/GDialog.vue'
import { shootItem } from '@/mixins/shootItem'
import { mapGetters } from 'vuex'

export default {
  name: 'action-button-dialog',
  components: {
    GDialog
  },
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined
    }
  },
  props: {
    icon: {
      type: String,
      default: 'mdi-cog-outline'
    },
    caption: {
      type: String
    },
    tooltip: {
      type: String
    },
    confirmButtonText: {
      type: String,
      default: 'Save'
    },
    confirmRequired: {
      type: Boolean,
      default: false
    },
    valid: {
      type: Boolean,
      default: true
    },
    width: {
      type: String
    },
    maxHeight: {
      type: String,
      default: '50vh'
    },
    loading: {
      type: Boolean
    },
    iconColor: {
      type: String,
      default: 'action-button'
    },
    smallIcon: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    disableConfirmInputFocus: {
      type: Boolean
    },
    buttonText: {
      type: String
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'canPatchShoots'
    ]),
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
    }
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
        this.$emit('dialog-opened')
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
    }
  }
}
</script>
