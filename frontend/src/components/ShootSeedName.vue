<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row align="center" class="ma-0">
    <v-tooltip top :disabled="!isControlPlaneMigrating">
      <template v-slot:activator="{ on }">
        <div v-on="on">
          <template v-if="isControlPlaneMigrating">
            <v-progress-circular indeterminate size=12 width=2 color="cyan darken-2" class="mr-1"></v-progress-circular>
            <router-link v-if="canLinkToSeed" class="cyan--text text--darken-2" :to="{ name: 'ShootItem', params: { name: shootStatusSeedName, namespace:'garden' } }">
              <span>{{shootStatusSeedName}}</span>
            </router-link>
            <span v-else>{{shootSeedName}}</span>
            <v-icon small class="mx-1">mdi-arrow-right</v-icon>
          </template>
          <router-link v-if="canLinkToSeed" class="cyan--text text--darken-2" :to="{ name: 'ShootItem', params: { name: shootSeedName, namespace:'garden' } }">
            <span>{{shootSeedName}}</span>
          </router-link>
          <span v-else>{{shootSeedName}}</span>
        </div>
      </template>
      <span>Control Plane is migrating </span>
      <span class="font-weight-bold">{{shootStatusSeedName}}</span>
      <v-icon size=14 color="white">mdi-arrow-right</v-icon>
      <span class="font-weight-bold">{{shootSeedName}}</span>
    </v-tooltip>
  </v-row>
</template>

<script>

import { shootItem } from '@/mixins/shootItem'

export default {
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem]
}
</script>
