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
export default {
  name: 'select-hint-colorizer',
  props: {
    hintColor: {
      type: String
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
      if (hintColor !== 'default') {
        elementClasses.add(`hintColor-${hintColor}`)
      }
    }
  },
  mounted () {
    this.applyHintColor(this.hintColor)
  }
}
</script>

<style lang="styl" scoped>
  @import '~vuetify/src/stylus/settings/_colors.styl';

  .hintColor-orange {
    >>>.v-messages__wrapper {
      .v-messages__message {
        color: $orange.darken-2 !important;
      }
    }
  }
</style>
