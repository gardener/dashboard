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
  <v-list-item>
    <v-list-item-icon>
      <v-icon v-if="icon" color="cyan darken-2">{{icon}}</v-icon>
    </v-list-item-icon>
    <v-list-item-content>
      <v-list-item-subtitle>{{appTitle}}</v-list-item-subtitle>
      <v-list-item-title class="pt-1">
        <v-tooltip v-if="isShootStatusHibernated" top>
          <template v-slot:activator="{ on }">
            <span v-on="on">{{urlText}}</span>
          </template>
          {{appTitle}} is not running for hibernated clusters
        </v-tooltip>
        <a v-else :href="url" target="_blank" class="cyan--text text--darken-2">{{urlText}}</a>
      </v-list-item-title>
    </v-list-item-content>
  </v-list-item>
</template>

<script>

export default {
  props: {
    appTitle: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    urlText: {
      type: String,
      required: true
    },
    icon: {
      type: String
    },
    isShootStatusHibernated: {
      type: Boolean
    }
  }
}
</script>
