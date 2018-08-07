<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-dialog v-model="value" persistent max-width="500">
  <v-card>
    <v-card-title :class="titleColorClass">
      <div class="headline">
        <slot name="caption">
          Confirm Dialog
        </slot>
        <code :class="textColorClass" v-if="$slots.affectedObjectName"><slot name="affectedObjectName"></slot></code>
      </div>
    </v-card-title>
    <v-card-text class="subheadingfont">
      <slot name="message">
        This is a generic dialog template.
      </slot>
      <v-text-field
        v-if="confirm && !confirmDisabled"
        ref="deleteDialogInput"
        :hint="hint"
        persistent-hint
        :error="hasError && userInput.length > 0"
        v-model="userInput"
        type="text"
        color="cyan darken-2">
      </v-text-field>
    </v-card-text>

    <alert color="error" :message.sync="message" :detailedMessage.sync="detailedMessage"></alert>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn flat @click.native.stop="cancelClicked()">Cancel</v-btn>
      <v-btn @click.native.stop="okClicked()" :disabled="confirmDisabled || hasError" :class="textColorClass" flat>Confirm</v-btn>
    </v-card-actions>
  </v-card>
  </v-dialog>
</template>

<script>
  import { setDelayedInputFocus } from '@/utils'
  import Alert from '@/components/Alert'

  export default {
    name: 'confirm-dialog',
    components: {
      Alert
    },
    props: {
      value: {
        type: Boolean,
        required: true
      },
      ok: {
        type: Function,
        required: true
      },
      cancel: {
        type: Function,
        required: true
      },
      confirm: {
        type: String
      },
      confirmDisabled: {
        type: Boolean,
        default: false
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
      }
    },
    data () {
      return {
        userInput: ''
      }
    },
    watch: {
      value (value) {
        if (value) {
          this.onShow()
        }
      }
    },
    computed: {
      hasError () {
        return this.confirm && this.confirm !== this.userInput
      },
      hint () {
        if (this.userInput.length === 0) {
          return `Type '${this.confirm}' to confirm`
        } else if (this.userInput !== this.confirm) {
          return `Your input did not match with required phrase '${this.confirm}'`
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
      titleColorClass () {
        return this.confirm ? this.titleColorClassForString(this.confirmColor) : this.titleColorClassForString(this.defaultColor)
      },
      textColorClass () {
        return this.confirm ? this.textColorClassForString(this.confirmColor) : this.textColorClassForString(this.defaultColor)
      }
    },
    methods: {
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
      cancelClicked () {
        if (this.cancel) {
          this.cancel()
        }
      },
      okClicked () {
        if (this.ok) {
          this.ok()
        }
      },
      onShow () {
        // we must delay the "focus" handling because the dialog.open is animated
        // and the 'autofocus' property didn't work in this case.
        this.userInput = ''
        setDelayedInputFocus(this, 'deleteDialogInput')
      }
    }
  }
</script>