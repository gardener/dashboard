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
  <v-icon :class="iconClass" style="font-size:1.5em">{{icon}}</v-icon>
</template>

<script>
export default {
  props: ['value'],
  computed: {
    icon () {
      switch (this.value) {
        case 'azure':
          return 'mdi-microsoft'
        case 'aws':
          return 'mdi-amazon'
        case 'gcp':
          return 'mdi-google'
        case 'openstack':
          return 'mdi-server-network'
      }
      return 'mdi-amazon'
    },
    iconClass () {
      return `${this.kindColor}--text mr-1`
    },
    kindColor () {
      var kindColor
      switch (this.value) {
        case 'aws':
          kindColor = 'orange'
          break
        case 'gcp':
          kindColor = 'green'
          break
        case 'azure':
          kindColor = 'blue'
          break
        case 'openstack':
          kindColor = 'orange'
          break
      }
      return kindColor
    }
  }
}
</script>
