<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog v-model="visible" scrollable persistent :width="width" max-width="90vw" @keydown.esc="resolveAction(false)">
    <v-card>
      <v-toolbar flat class="toolbar-background toolbar-title--text">
        <v-toolbar-title class="dialog-title align-center justify-start">
          <slot name="caption">
            Confirm Dialog
          </slot>
          <template v-if="$slots.affectedObjectName">
            &nbsp;
            <tt class="font-weight-bold"><slot name="affectedObjectName"></slot></tt>
          </template>
        </v-toolbar-title>
      </v-toolbar>
      <v-card-text class="pa-3" :style="{'max-height': maxHeight}" ref="contentCard">
        <slot name="message">
          This is a generic dialog template.
        </slot>
        <g-message color="error" class="mt-4" :message.sync="message" :detailed-message.sync="detailedMessage"></g-message>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-text-field
          v-if="confirmValue && !confirmDisabled"
          class="mr-2 confirm-input"
          @keyup.enter="resolveAction(true)"
          ref="deleteDialogInput"
          :label="hint"
          :error="hasError && userInput.length > 0"
          hide-details
          v-model="userInput"
          type="text"
          outlined
          color="primary"
          dense>
        </v-text-field>
        <v-btn text @click="resolveAction(false)" v-if="cancelButtonText.length">{{cancelButtonText}}</v-btn>
        <v-btn text @click="resolveAction(true)" :disabled="!valid" class="toolbar-background--text">{{confirmButtonText}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { setDelayedInputFocus } from '@/utils'
import GMessage from '@/components/GMessage'
import noop from 'lodash/noop'
import isFunction from 'lodash/isFunction'

export default {
  name: 'gdialog',
  components: {
    GMessage
  },
  props: {
    confirmValue: {
      type: String
    },
    confirmDisabled: {
      type: Boolean,
      default: false
    },
    confirmMessage: {
      type: String
    },
    errorMessage: {
      type: String
    },
    detailedErrorMessage: {
      type: String
    },
    confirmButtonText: {
      type: String,
      default: 'Confirm'
    },
    cancelButtonText: {
      type: String,
      default: 'Cancel'
    },
    width: {
      type: String,
      default: '500'
    },
    maxHeight: {
      type: String,
      default: '50vh'
    },
    disableConfirmInputFocus: {
      type: Boolean
    }
  },
  data () {
    return {
      userInput: '',
      visible: false,
      resolve: noop
    }
  },
  computed: {
    hasError () {
      return this.confirmValue && this.confirmValue !== this.userInput
    },
    hint () {
      if (this.userInput.length === 0) {
        return `Type ${this.confirmValue} to confirm`
      } else if (this.userInput !== this.confirmValue) {
        return `Input does not match ${this.confirmValue}`
      }
      return ''
    },
    message: {
      get () {
        return this.errorMessage
      },
      set (value) {
        this.$emit('update:error-message', value)
      }
    },
    detailedMessage: {
      get () {
        return this.detailedErrorMessage
      },
      set (value) {
        this.$emit('update:detailed-error-message', value)
      }
    },
    valid () {
      return !this.confirmDisabled && !this.hasError
    }
  },
  methods: {
    confirmWithDialog (confirmationInterceptor) {
      this.showDialog()
      this.userInput = ''
      this.confirmationInterceptor = confirmationInterceptor

      // we must delay the "focus" handling because the dialog.open is animated
      // and the 'autofocus' property didn't work in this case.
      if (!this.disableConfirmInputFocus) {
        setDelayedInputFocus(this, 'deleteDialogInput')
      }

      return new Promise(resolve => {
        this.resolve = resolve
      })
    },
    hideDialog () {
      this.visible = false
    },
    showDialog () {
      this.visible = true
    },
    async resolveAction (value) {
      if (value && !this.valid) {
        return
      }

      if (isFunction(this.resolve)) {
        if (value) {
          if (this.confirmationInterceptor) {
            const confirmed = await this.confirmationInterceptor()
            if (!confirmed) {
              // cancel resolve action
              return
            }
          }
        }
        const resolve = this.resolve
        this.resolve = undefined
        resolve(value)
      }
      this.$emit('dialog-closed', value)
      this.visible = false
    },
    showScrollBar (retryCount = 0) {
      if (!this.visible || retryCount > 10) {
        // circuit breaker
        return
      }
      const contentCardRef = this.$refs.contentCard
      if (!contentCardRef || !contentCardRef.clientHeight) {
        this.$nextTick(() => this.showScrollBar(retryCount + 1))
        return
      }
      const scrollTopVal = contentCardRef.scrollTop
      contentCardRef.scrollTop = scrollTopVal + 10
      contentCardRef.scrollTop = scrollTopVal - 10
    }
  },
  watch: {
    visible (value) {
      if (value) {
        this.showScrollBar()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  .confirm-input {
    width: 18em;
  }
</style>
