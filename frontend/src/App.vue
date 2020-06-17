<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <router-view></router-view>
</template>

<script>
export default {
  name: 'App',
  created () {
    // provide the keyboard events for dialogs. Dialogs can't catch keyboard events
    // if any input element of the dialog didn't have the focus.
    window.addEventListener('keyup', ({ keyCode }) => {
      if (keyCode === 27) {
        this.$bus.$emit('esc-pressed')
      }
    })
  }
}
</script>

<style lang="scss">
  [data-app] {
    .v-main > .container {
      min-height: calc(100vh - 156px)
    }
  }
</style>
