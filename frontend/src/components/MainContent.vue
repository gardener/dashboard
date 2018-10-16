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
  <v-content>
    <router-view></router-view>
  </v-content>
</template>

<script>
import set from 'lodash/set'

function setElementStyle (element, key, value) {
  if (element) {
    set(element.style, key, value)
  }
}

function setElementOverflowY (element, value) {
  setElementStyle(element, 'overflowY', value)
}

function setWrapElementHeight (element, value) {
  setElementStyle(element, 'height', `calc(100vh - ${value}px)`)
}

export default {
  name: 'main-content',
  methods: {
    getWrapElement () {
      return this.$el.querySelector(':scope > div[class$="wrap"]')
    },
    setScrollTop (top = 0) {
      const element = this.getWrapElement()
      set(element, 'scrollTop', top)
    }
  },
  watch: {
    '$vuetify.application.top' (value) {
      const element = this.getWrapElement()
      setWrapElementHeight(element, value)
    }
  },
  mounted () {
    setElementOverflowY(this.$el, 'hidden')
    const element = this.getWrapElement()
    setElementOverflowY(element, 'auto')
    setWrapElementHeight(element, this.$vuetify.application.top)
  }
}
</script>
