<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-dialog
    v-model="visible"
    persistent
    scrollable
    :width="width"
    max-width="90vw"
  >
    <v-card>
      <v-toolbar
        flat
        density="comfortable"
        class="bg-toolbar-background text-toolbar-title"
      >
        <v-toolbar-title class="dialog-title align-center justify-start">
          <slot name="caption">
            Confirm Dialog
          </slot>
          <template v-if="$slots.affectedObjectName">
            <span class="font-family-monospace font-weight-bold pl-2">
              <slot name="affectedObjectName"></slot>
            </span>
          </template>
        </v-toolbar-title>
      </v-toolbar>
      <slot name="top"></slot>
      <div
        ref="cardContent"
        class="card-content"
        :style="{ 'max-height': maxHeight }"
      >
        <slot name="card"></slot>
        <v-card-text v-if="$slots.message">
          <slot name="message"></slot>
        </v-card-text>
      </div>
      <div v-if="$slots.errorMessage || message"
        class="mt-2"
      >
        <slot name="errorMessage">
            <g-message
              color="error"
              v-model:message="message"
              v-model:detailed-message="detailedMessage"
            />
        </slot>
      </div>

      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-text-field
          v-if="confirmValue && !confirmDisabled"
          ref="deleteDialogInput"
          :label="hint"
          :error="notConfirmed && userInput.length > 0"
          hide-details
          v-model="userInput"
          type="text"
          variant="outlined"
          color="primary"
          density="compact"
          class="mr-2 confirm-input"
          @keyup.enter="resolveAction(true)"
        />
        <v-btn
          variant="text"
          @click="resolveAction(false)"
          v-if="cancelButtonText.length"
        >
          {{cancelButtonText}}
        </v-btn>
        <v-tooltip location="top" :disabled="valid">
          <template #activator="{ props }">
            <div v-bind="props">
              <v-btn
                variant="text"
                @click="resolveAction(true)"
                :disabled="!valid"
                class="text-toolbar-background"
              >
                {{confirmButtonText}}
              </v-btn>
            </div>
          </template>
          <span v-if="confirmDisabled">There are input errors that you need to resolve</span>
          <span v-else-if="notConfirmed">You need to confirm your changes by typing this cluster's name</span>
        </v-tooltip>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import GMessage from '@/components/GMessage.vue'

import { setDelayedInputFocus } from '@/utils'

import noop from 'lodash/noop'
import isFunction from 'lodash/isFunction'

export default {
  components: {
    GMessage,
  },
  props: {
    confirmValue: {
      type: String,
    },
    confirmDisabled: {
      type: Boolean,
      default: false,
    },
    errorMessage: {
      type: String,
    },
    detailedErrorMessage: {
      type: String,
    },
    confirmButtonText: {
      type: String,
      default: 'Confirm',
    },
    cancelButtonText: {
      type: String,
      default: 'Cancel',
    },
    width: {
      type: String,
      default: '500',
    },
    maxHeight: {
      type: String,
      default: '50vh',
    },
    disableConfirmInputFocus: {
      type: Boolean,
      default: false,
    },
  },
  data () {
    return {
      userInput: '',
      visible: false,
      resolve: noop,
    }
  },
  computed: {
    notConfirmed () {
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
        this.$emit('update:errorMessage', value)
      },
    },
    detailedMessage: {
      get () {
        return this.detailedErrorMessage
      },
      set (value) {
        this.$emit('update:detailedErrorMessage', value)
      },
    },
    valid () {
      return !this.confirmDisabled && !this.notConfirmed
    },
  },
  emits: [
    'update:errorMessage',
    'update:detailedErrorMessage',
    'dialogClosed',
  ],
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
      this.$emit('dialogClosed', value)
      this.visible = false
    },
    showScrollBar (retryCount) {
      if (!this.visible || retryCount > 10) {
        // circuit breaker
        return
      }
      const cardContentRef = this.$refs.cardContent
      if (!cardContentRef || !cardContentRef.clientHeight) {
        this.$nextTick(() => this.showScrollBar(retryCount + 1))
        return
      }
      const scrollTopVal = cardContentRef.scrollTop
      cardContentRef.scrollTop = scrollTopVal + 10
      cardContentRef.scrollTop = scrollTopVal - 10
    },
  },
  watch: {
    visible (value) {
      if (value) {
        this.showScrollBar(0)
      }
    },
  },
}
</script>

<style lang="scss" scoped>
  .confirm-input {
    width: 18em;
  }

  .card-content {
    overflow: scroll;
    height: auto;
  }
</style>
