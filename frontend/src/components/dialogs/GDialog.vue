<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
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
        <g-alert color="error" class="mt-4" :message.sync="message" :detailedMessage.sync="detailedMessage"></g-alert>
      </v-card-text>
      <v-alert tile :color="confirmAlertColor" v-if="confirmValue && !confirmDisabled">
        <span class="text-body-2" v-if="!!confirmMessage">{{confirmMessage}}</span>
        <v-text-field
          @keyup.enter="okClicked()"
          ref="deleteDialogInput"
          :hint="hint"
          persistent-hint
          :error="hasError && userInput.length > 0"
          v-model="userInput"
          type="text"
          filled
          dense
          color="grey darken-2">
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
import GAlert from '@/components/GAlert'
import noop from 'lodash/noop'
import isFunction from 'lodash/isFunction'

export default {
  name: 'gdialog',
  components: {
    GAlert
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
      return `${color || 'cyan'} lighten-5`
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
    confirmWithDialog ({ onShowCallback, confirmCallback } = {}) {
      this.showDialog()
      this.userInput = ''
      this.confirmCallback = confirmCallback

      // we must delay the "focus" handling because the dialog.open is animated
      // and the 'autofocus' property didn't work in this case.
      if (!this.disableConfirmInputFocus) {
        setDelayedInputFocus(this, 'deleteDialogInput')
      }

      if (onShowCallback) {
        this.$nextTick(() => {
          // delay the callback to make sure that all components are loaded
          onShowCallback()
        })
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
        case 'red':
          return 'red darken-2 grey--text text--lighten-4'
        case 'orange':
          return 'orange darken-2 grey--text text--lighten-4'
        default:
          return 'cyan darken-2 grey--text text--lighten-4'
      }
    },
    textColorClassForString (textColorClass) {
      switch (textColorClass) {
        case 'red':
          return 'red--text text--darken-2'
        case 'orange':
          return 'orange--text text--darken-2'
        default:
          return 'cyan--text text--darken-2'
      }
    },
    async resolveAction (value) {
      if (isFunction(this.resolve)) {
        if (value) {
          if (this.confirmCallback) {
            const confirmed = await this.confirmCallback()
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
