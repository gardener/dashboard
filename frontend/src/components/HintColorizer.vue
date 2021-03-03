<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <slot></slot>
  </div>
</template>

<script>
import get from 'lodash/get'

export default {
  name: 'hint-colorizer',
  props: {
    hintColor: {
      type: String
    }
  },
  computed: {
    isSelectErrorColor () {
      const color = get(this, '$children[0].$children[0].color')
      return color === 'error'
    }
  },
  watch: {
    hintColor (hintColor) {
      this.applyHintColor(hintColor)
    }
  },
  methods: {
    applyHintColor (hintColor) {
      if (!this.$el) {
        return
      }
      const hintElement = this.$el.querySelector('.v-messages__message')
      if (!hintElement) {
        return
      }

      const colorCode = this.$vuetify.theme.currentTheme[hintColor]
      if (!this.isSelectErrorColor && hintColor !== 'default') {
        hintElement.style = `color: ${colorCode}`
      } else {
        hintElement.style = ''
      }
    }
  },
  mounted () {
    this.applyHintColor(this.hintColor)
  },
  updated () {
    this.applyHintColor(this.hintColor)
  }
}
</script>
