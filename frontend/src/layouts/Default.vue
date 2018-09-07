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
  import assign from 'lodash/assign'

  export default {
    name: 'Default',
    components: {
      MainNavigation,
      MainToolbar,
      MainContent,
      Loading,
      GSnotify
    },
    beforeRouteUpdate (to, from, next) {
      this.$refs.content.setScrollTop(0)
      next()
    },
    mounted () {
      const element = this.$el
      if (element.style) {
        assign(element.style, {
          overflowY: 'hidden'
        })
      }
      const wrapElement = element.querySelector(':scope > div[class$="wrap"]')
      if (wrapElement && wrapElement.style) {
        assign(wrapElement.style, {
          overflowY: 'hidden'
        })
      }
    }
  }
</script>

<style lang="styl" scoped>
.v-navigation-drawer {
  z-index: 9
}
.v-toolbar--fixed {
  z-index: 8
}
</style>
