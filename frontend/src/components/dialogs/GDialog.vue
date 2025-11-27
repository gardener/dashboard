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
            <span class="font-family-monospace font-weight-bold">
              &ZeroWidthSpace;<slot name="affectedObjectName" />
            </span>
          </template>
        </v-toolbar-title>
        <v-btn
          v-if="isToolbarCloseButtonVisible"
          class="mr-4"
          variant="text"
          density="comfortable"
          icon="mdi-close"
          color="toolbar-title"
          @click.stop="hideDialog"
        />
      </v-toolbar>
      <div v-if="$slots.header">
        <slot name="header" />
      </div>
      <div
        ref="cardContentRef"
        class="card-content"
      >
        <slot name="content" />
      </div>
      <div v-if="$slots.footer">
        <slot name="footer" />
      </div>
      <div
        v-if="message"
        class="mt-2"
      >
        <g-message
          v-model:message="message"
          v-model:detailed-message="detailedMessage"
          color="error"
          tile
        />
      </div>

      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-text-field
          v-if="confirmValue"
          ref="deleteDialogInput"
          v-model="userInput"
          :label="hint"
          :error="notConfirmed && userInput.length > 0"
          hide-details
          type="text"
          variant="outlined"
          color="primary"
          density="compact"
          class="mr-2 confirm-input"
          @keyup.enter="resolveAction(true)"
        />
        <v-btn
          v-if="cancelButtonText.length"
          variant="text"
          @click="resolveAction(false)"
        >
          {{ cancelButtonText }}
        </v-btn>
        <div
          v-tooltip:top="{
            text: 'You need to confirm your changes by typing this cluster\'s name',
            disabled: !notConfirmed
          }"
        >
          <v-btn
            variant="text"
            class="text-toolbar-background"
            :disabled="notConfirmed || !valid"
            @click="resolveAction(true)"
          >
            {{ confirmButtonText }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref } from 'vue'
import { useVuelidate } from '@vuelidate/core'

import GMessage from '@/components/GMessage.vue'

import { useScrollBar } from '@/composables/useScrollBar'

import { setDelayedInputFocus } from '@/utils'
import { messageFromErrors } from '@/utils/validators'

import trim from 'lodash/trim'
import noop from 'lodash/noop'
import isFunction from 'lodash/isFunction'

const zeroWidthSpace = '\u200B'

export default {
  components: {
    GMessage,
  },
  props: {
    confirmValue: {
      type: String,
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
    isToolbarCloseButtonVisible: {
      type: Boolean,
      default: false,
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
    valid: {
      // use to pass validation result from a parent component
      // Use only if outside v$ scope
      type: Boolean,
      default: true,
    },
  },
  emits: [
    'update:errorMessage',
    'update:detailedErrorMessage',
    'dialogClosed',
  ],
  setup () {
    const cardContentRef = ref(null)
    useScrollBar(cardContentRef)

    return {
      v$: useVuelidate(),
      cardContentRef,
    }
  },
  data () {
    return {
      userInput: '',
      visible: false,
      resolve: noop,
    }
  },
  computed: {
    trimmedUserInput () {
      return trim(this.userInput, ' ' + zeroWidthSpace)
    },
    notConfirmed () {
      return this.confirmValue && this.confirmValue !== this.trimmedUserInput
    },
    hint () {
      if (this.trimmedUserInput.length === 0) {
        return `Type ${this.confirmValue} to confirm`
      } else if (this.trimmedUserInput !== this.confirmValue) {
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
    hasVisibleErrors () {
      return this.v$.$errors.length > 0
    },
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
      if (value) {
        if (!this.valid || this.notConfirmed) {
          return
        }
        if (this.v$.$invalid) {
          await this.v$.$validate()
          const message = messageFromErrors(this.v$.$errors)
          this.message = 'There are input errors that you need to resolve'
          this.detailedMessage = message
          return
        }
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
