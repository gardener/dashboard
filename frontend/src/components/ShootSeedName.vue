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
  <v-layout align-center row class="ma-0">
    <v-tooltip top :disabled="!isControlPlaneMigrating">
      <template slot="activator">
        <template v-if="isControlPlaneMigrating">
          <v-progress-circular indeterminate size=12 width=2 color="cyan darken-2" class="mr-1"></v-progress-circular>
          <template v-if="!short">
            <router-link v-if="canLinkToSeed(shootStatusSeedName)" class="cyan--text text--darken-2" :to="{ name: 'ShootItem', params: { name: shootStatusSeedName, namespace:'garden' } }">
              <span>{{shootStatusSeedName}}</span>
            </router-link>
            <span v-else>{{shootSeedName}}</span>
            <v-icon small class="mx-1">mdi-arrow-right-bold</v-icon>
          </template>
        </template>
        <router-link v-if="canLinkToSeed(shootSeedName)" class="cyan--text text--darken-2" :to="{ name: 'ShootItem', params: { name: shootSeedName, namespace:'garden' } }">
          <span>{{shootSeedName}}</span>
        </router-link>
        <span v-else>{{shootSeedName}}</span>
      </template>
      <span>Control Plane is migrating </span>
      <span class="font-weight-bold">{{shootStatusSeedName}}</span>
      <v-icon size=14 color="white">mdi-arrow-right-bold</v-icon>
      <span class="font-weight-bold">{{shootSeedName}}</span>
    </v-tooltip>
  </v-layout>
</template>

<script>

import { shootItem } from '@/mixins/shootItem'
import { canLinkToSeed } from '@/utils'

export default {
  props: {
    shootItem: {
      type: Object
    },
    short: {
      type: Boolean,
      default: false
    }
  },
  mixins: [shootItem],
  methods: {
    canLinkToSeed (seedName) {
      return canLinkToSeed({ namespace: this.shootNamespace, seedName })
    }
  }
}
</script>
