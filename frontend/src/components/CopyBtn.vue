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
        <v-btn v-on="on" icon :color="btnColor" @click="copyText">
          <v-icon :small="true">{{icon}}</v-icon>
        </v-btn>
      </template>
      <span>{{tooltipText}}</span>
    </v-tooltip>
  </div>
</template>

<script>
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
    }
  },
  data () {
    return {
      snackbar: false,
      clipboard: undefined,
      copySucceeded: false,
      timeoutId: undefined
    }
  },
  computed: {
    snackbarText () {
      return this.copyFailedText
    },
    snackbarColor () {
      return 'error'
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
    async copyText () {
      try {
        await navigator.clipboard.writeText(this.clipboardText)
        this.copySucceeded = true
        clearTimeout(this.timeoutId)
        this.timeoutId = setTimeout(() => {
          this.copySucceeded = false
        }, 1000)
        this.$emit('copy')
      } catch (err) {
        console.error('error', err)
        this.snackbar = true
        this.copySucceeded = false
        this.$emit('copy-failed')
      }
    }
  }
}
</script>
