<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
