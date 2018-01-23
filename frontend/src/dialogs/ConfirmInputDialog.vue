<!--
Copyright 2018 by The Gardener Authors.

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
        ref="deleteDialogInput"
        :hint="hint"
        persistent-hint
        :error="hasError"
        v-model="userInput"
        type="text">
      </v-text-field>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn flat @click.native.stop="cancelClicked()">Cancel</v-btn>
      <v-btn  @click.native.stop="okClicked()" :disabled="hasError" class="red--text" flat>Confirm</v-btn>
    </v-card-actions>
  </v-card>
  </v-dialog>
</template>

<script>
  import { setDelayedInputFocus } from '@/utils'

  export default {
    props: {
      value: {
        type: Boolean,
        required: true
      },
      ok: {
        type: Function,
        required: true
      },
      confirm: {
        type: String,
        required: true
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
        return this.confirm !== this.userInput
      },
      hint () {
        if (this.userInput.length === 0) {
          return `Type '${this.confirm}' to confirm`
        } else if (this.userInput !== this.confirm) {
          return `Your input did not match with required phrase '${this.confirm}'`
        }
        return ''
      }
    },
    methods: {
      cancelClicked () {
        if (this.cancel) {
          this.cancel()
        }
        this.$emit('input', false)
      },
      okClicked () {
        if (this.ok) {
          this.ok()
        }
        this.$emit('input', false)
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
