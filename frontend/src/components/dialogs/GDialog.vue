<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog v-model="visible" scrollable persistent :max-width="maxWidth" @keydown.esc="resolveAction(false)">
    <v-card>
      <v-toolbar flat :class="titleColorClass">
        <v-toolbar-title class="dialog-title align-center justify-start">
          <slot name="caption">
            Confirm Dialog
          </slot>
          <template v-if="$slots.affectedObjectName">
            &nbsp;
            <code :class="textColorClass"><slot name="affectedObjectName"></slot></code>
          </template>
        </v-toolbar-title>
      </v-toolbar>
      <v-card-text class="pa-3" :style="{'max-height': maxHeight}" ref="contentCard">
        <slot name="message">
          This is a generic dialog template.
        </slot>
        <g-message color="error" class="mt-4" :message.sync="message" :detailedMessage.sync="detailedMessage"></g-message>
      </v-card-text>
      <v-alert tile :color="confirmAlertColor" v-if="confirmValue && !confirmDisabled">
        <span class="text-body-2" v-if="!!confirmMessage">{{confirmMessage}}</span>
        <v-text-field
          @keyup.enter="resolveAction(true)"
          ref="deleteDialogInput"
          :hint="hint"
          persistent-hint
          :error="hasError && userInput.length > 0"
          v-model="userInput"
          type="text"
          filled
          dense>
        </v-text-field>
      </v-alert>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="resolveAction(false)">{{cancelButtonText}}</v-btn>
        <v-btn text @click="resolveAction(true)" :disabled="!valid" :class="textColorClass">{{confirmButtonText}}</v-btn>
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
    confirmColor: {
      type: String,
      default: 'red'
    },
    defaultColor: {
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
    maxWidth: {
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
        return `Type '${this.confirmValue}' to confirm`
      } else if (this.userInput !== this.confirmValue) {
        return `Your input did not match with required phrase '${this.confirmValue}'`
      }
      return ''
    },
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
    confirmAlertColor () {
      const color = this.confirmValue ? this.confirmColor : this.defaultColor
      if (this.$vuetify.theme.dark) {
        return `${color || 'primary'} darken-3`
      }
      return `${color || 'primary'} lighten-3`
    },
    titleColorClass () {
      return this.confirmValue ? this.titleColorClassForString(this.confirmColor) : this.titleColorClassForString(this.defaultColor)
    },
    textColorClass () {
      return this.confirmValue ? this.textColorClassForString(this.confirmColor) : this.textColorClassForString(this.defaultColor)
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
    titleColorClassForString (titleColorClass) {
      switch (titleColorClass) {
        case 'error':
          return 'error accentTitle--text'
        case 'warning':
          return 'warning accentTitle--text'
        default:
          return 'accent accentTitle--text'
      }
    },
    textColorClassForString (textColorClass) {
      switch (textColorClass) {
        case 'error':
          return 'error--text'
        case 'warning':
          return 'warning--text'
        default:
          return 'primary--text'
      }
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
  .dialog-title {
    code {
      box-shadow: none !important;
    }
  }
</style>
