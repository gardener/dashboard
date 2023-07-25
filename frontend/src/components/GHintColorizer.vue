<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <slot ref="input" />
  </div>
</template>

<script>
import get from 'lodash/get'

export default {
  inject: ['getColorCode'],
  props: {
    hintColor: {
      type: String,
    },
  },
  computed: {
    isSelectErrorColor () {
      const color = get(this, '$children[0].$children[0].color')
      return color === 'error'
    },
  },
  watch: {
    hintColor (hintColor) {
      this.applyHintColor(hintColor)
    },
  },
  mounted () {
    this.applyHintColor(this.hintColor)
  },
  updated () {
    this.applyHintColor(this.hintColor)
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

      const colorCode = this.getColorCode(hintColor)
      if (!this.isSelectErrorColor && hintColor !== 'default') {
        hintElement.style = `color: ${colorCode}`
      } else {
        hintElement.style = ''
      }
    },
  },
}
</script>
