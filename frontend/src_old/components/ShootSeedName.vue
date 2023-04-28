<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip location="top" :disabled="!isShootLastOperationTypeControlPlaneMigrating">
    <template v-slot:activator="{ on }">
      <div v-on="on">
        <v-progress-circular v-if="isShootLastOperationTypeControlPlaneMigrating" indeterminate size=12 width=2 class="mr-1"></v-progress-circular>
        <router-link v-if="canLinkToSeed" :to="{ name: 'ShootItem', params: { name: shootSeedName, namespace:'garden' } }">
          <span>{{shootSeedName}}</span>
        </router-link>
        <span v-else>{{shootSeedName}}</span>
      </div>
    </template>
    <span>{{shootLastOperationTypeControlPlaneMigrationMessage}}</span>
  </v-tooltip>
</template>

<script>

import { shootItem } from '@/mixins/shootItem'

export default {
  mixins: [shootItem]
}
</script>
