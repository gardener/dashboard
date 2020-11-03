<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-app>
    <loading></loading>
    <main-navigation></main-navigation>
    <main-toolbar></main-toolbar>
    <main-content ref="content"></main-content>
    <g-snotify></g-snotify>
  </v-app>
</template>

<script>
import MainNavigation from '@/components/MainNavigation.vue'
import MainToolbar from '@/components/MainToolbar.vue'
import MainContent from '@/components/MainContent.vue'
import Loading from '@/components/Loading.vue'
import GSnotify from '@/components/GSnotify.vue'
import set from 'lodash/set'

function setElementStyle (element, key, value) {
  if (element) {
    set(element.style, key, value)
  }
}

function disableVerticalScrolling (element) {
  setElementStyle(element, 'overflowY', 'hidden')
}

export default {
  name: 'Default',
  components: {
    MainNavigation,
    MainToolbar,
    MainContent,
    Loading,
    GSnotify
  },
  methods: {
    getWrapElement () {
      return this.$el.querySelector(':scope > div[class$="wrap"]')
    }
  },
  beforeRouteUpdate (to, from, next) {
    this.$refs.content.setScrollTop(0)
    next()
  },
  mounted () {
    disableVerticalScrolling(this.$el)
    const element = this.getWrapElement()
    disableVerticalScrolling(element)
  }
}
</script>
