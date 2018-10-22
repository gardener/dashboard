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
  <div>
    <v-snackbar
      v-if="userFeedback"
      :bottom="true"
      v-model="snackbar"
      :success="true"
      :absolute="true"
      :timeout="2000"
      :color="snackbarColor"
    >
      {{snackbarText}}
    </v-snackbar>
    <v-tooltip top>
      <v-btn slot="activator" icon ref="copy">
        <v-icon :small="true">content_copy</v-icon>
      </v-btn>
      <span>{{tooltipText}}</span>
    </v-tooltip>
  </div>
</template>

<script>
import Clipboard from 'clipboard'

export default {
  components: {
    Clipboard
  },
  props: {
    clipboardText: {
      type: String,
      default: ''
    },
    copySuccessText: {
      type: String,
      default: 'Copied to clipboard'
    },
    copyFailedText: {
      type: String,
      default: 'Copy to clipboard failed'
    },
    tooltipText: {
      type: String,
      default: 'Copy to clipboard'
    },
    userFeedback: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      snackbar: false,
      clipboard: undefined,
      copyFailed: false
    }
  },
  computed: {
    snackbarText () {
      return this.copyFailed ? this.copyFailedText : this.copySuccessText
    },
    snackbarColor () {
      return this.copyFailed ? 'error' : undefined
    }
  },
  methods: {
    enableCopy () {
      if (this.clipboard) {
        this.clipboard.destroy()
      }

      this.clipboard = new Clipboard(this.$refs.copy.$el, {
        text: () => this.clipboardText
      })
      this.clipboard.on('success', (event) => {
        this.snackbar = true
        this.copyFailed = false
        this.$emit('copy')
      })
      this.clipboard.on('error', err => {
        console.error('error', err)
        this.copyFailed = true
        this.snackbar = true
        this.$emit('copyFailed')
      })
    }
  },
  mounted () {
    this.enableCopy()
  }
}
</script>
