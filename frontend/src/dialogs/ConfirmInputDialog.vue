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
    <v-card-title class="red darken-2 grey--text text--lighten-4">
      <div class="headline">
        <slot name="caption">
          Confirm Dialog
        </slot>
      </div>
    </v-card-title>
    <v-card-text class="subheadingfont">
      <slot name="message">
        This is a generic dialog template.
      </slot>
      <v-text-field
        v-if="confirmRequired && !confirmDisabled"
        ref="deleteDialogInput"
        :hint="hint"
        persistent-hint
        :error="hasError"
        v-model="userInput"
        type="text">
      </v-text-field>
    </v-card-text>

    <alert color="error" :message.sync="message" :detailedMessage.sync="detailedMessage"></alert>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn flat @click.native.stop="cancelClicked()">Cancel</v-btn>
      <v-btn @click.native.stop="okClicked()" :disabled="confirmDisabled || hasError" class="red--text" flat>Confirm</v-btn>
    </v-card-actions>
  </v-card>
  </v-dialog>
</template>

<script>
  import { setDelayedInputFocus } from '@/utils'
  import Alert from '@/components/Alert'

  export default {
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
        type: String,
        default: ''
      },
      confirmRequired: {
        type: Boolean,
        default: true
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
        return this.confirmRequired && this.confirm !== this.userInput
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
      }
    },
    methods: {
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
