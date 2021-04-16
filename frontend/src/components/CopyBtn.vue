<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
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
      <template v-slot:activator="{ on }">
        <v-btn v-on="on" icon ref="copy" :color="btnColor" :class="{ 'hidden': !hidden && autoHide }">
          <v-icon :small="true">{{icon}}</v-icon>
        </v-btn>
      </template>
      <span>{{tooltipText}}</span>
    </v-tooltip>
  </div>
</template>

<script>
import Clipboard from 'clipboard'

export default {
  props: {
    clipboardText: {
      type: String,
      default: ''
    },
    copyFailedText: {
      type: String,
      default: 'Copy to clipboard failed'
    },
    tooltipText: {
      type: String,
      default: 'Copy to clipboard'
    },
    color: {
      type: String
    },
    userFeedback: {
      type: Boolean,
      default: true
    },
    autoHide: {
      type: Boolean
    }
  },
  data () {
    return {
      snackbar: false,
      clipboard: undefined,
      copySucceeded: false,
      timeoutId: undefined,
      hidden: false
    }
  },
  computed: {
    snackbarText () {
      return this.copyFailedText
    },
    snackbarColor () {
      return 'error'
    },
    clipboardOptions () {
      const options = {
        text: () => this.clipboardText
      }
      let vm = this.$parent
      while (vm && vm !== this.$root) {
        if (vm.$options.name === 'v-dialog') {
          options.container = vm.$refs.content
          break
        }
        vm = vm.$parent
      }
      return options
    },
    icon () {
      if (this.copySucceeded) {
        return 'mdi-check'
      }
      return 'mdi-content-copy'
    },
    btnColor () {
      if (this.copySucceeded) {
        return 'success'
      }
      if (this.color) {
        return this.color
      }
      return 'action-button'
    }
  },
  methods: {
    enableCopy () {
      if (this.clipboard) {
        this.clipboard.destroy()
      }
      this.clipboard = new Clipboard(this.$refs.copy.$el, this.clipboardOptions)
      this.clipboard.on('success', (event) => {
        this.copySucceeded = true
        clearTimeout(this.timeoutId)
        this.timeoutId = setTimeout(() => {
          this.copySucceeded = false
        }, 1000)
        this.$emit('copy')
      })
      this.clipboard.on('error', err => {
        console.error('error', err)
        this.snackbar = true
        this.copySucceeded = false
        this.$emit('copy-failed')
      })
    }
  },
  mounted () {
    this.enableCopy()
    if (this.autoHide) {
      this.$parent.$el.addEventListener('mouseover', e => { this.hidden = true })
      this.$parent.$el.addEventListener('mouseout', e => { this.hidden = false })
    }
  }
}
</script>

<style lang="scss" scoped>
  .hidden {
    opacity: 0;
  }
</style>
