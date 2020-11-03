<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div v-if="canPatchShoots">
    <v-tooltip top max-width="600px" :disabled="disableToolTip">
      <template v-slot:activator="{ on }">
        <div v-on="on">
          <v-btn
            :icon="isIconButton"
            :text="isTextButton"
            :small="smallIcon"
            :color="iconColor"
            :loading="loading"
            :disabled="isShootMarkedForDeletion || isShootActionsDisabledForPurpose || disabled"
            @click="showDialog"
            :width="buttonWidth"
            class="text-none font-weight-regular pa-0"
          >
            <div>
              <v-icon :medium="!smallIcon">{{icon}}</v-icon>
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
      :confirmButtonText="confirmButtonText"
      :confirm-disabled="!valid"
      :errorMessage.sync="errorMessage"
      :detailedErrorMessage.sync="detailedErrorMessage"
      :max-width="maxWidth"
      :maxHeight="maxHeight"
      :confirmValue="confirmValue"
      :confirmMessage="confirmMessage"
      :confirmColor="dialogColor"
      :defaultColor="dialogColor"
      :disableConfirmInputFocus="disableConfirmInputFocus"
      ref="gDialog"
    >
      <template v-slot:caption>{{caption}}</template>
      <template v-slot:affectedObjectName>{{shootName}}</template>
      <template v-slot:message><slot name="actionComponent"></slot></template>
    </g-dialog>
  </div>
  <div v-else style="width: 36px"></div>
</template>

<script>
import GDialog from '@/components/dialogs/GDialog'
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
    shootItem: {
      type: Object
    },
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
    confirmMessage: {
      type: String
    },
    valid: {
      type: Boolean,
      default: true
    },
    maxWidth: {
      type: String,
      default: '1000'
    },
    maxHeight: {
      type: String,
      default: '50vh'
    },
    loading: {
      type: Boolean
    },
    iconColor: {
      type: String
    },
    smallIcon: {
      type: Boolean,
      default: false
    },
    dialogColor: {
      type: String,
      default: 'orange'
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
    message: {
      get () {
        return this.errorMessage
      },
      set (value) {
        this.$emit('update:errorMessage', value)
      }
    },
    detailedMessage: {
      get () {
        return this.detailedErrorMessage
      },
      set (value) {
        this.$emit('update:detailedErrorMessage', value)
      }
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
    }
  }
}
</script>
