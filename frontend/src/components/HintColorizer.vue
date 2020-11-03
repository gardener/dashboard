<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

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
      const elementClasses = this.$el.classList
      elementClasses.forEach((className) => {
        if (className.startsWith('hintColor-')) {
          elementClasses.remove(className)
        }
      })

      if (!this.isSelectErrorColor && hintColor !== 'default') {
        elementClasses.add(`hintColor-${hintColor}`)
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

<style lang="scss" scoped>
  @import '~vuetify/src/styles/styles.sass';

  .hintColor-orange {
    ::v-deep .v-messages__message {
      color: map-get($orange, 'darken-2') !important;
    }
  }
</style>
