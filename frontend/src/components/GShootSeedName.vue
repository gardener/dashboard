<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    location="top"
    :disabled="!isShootLastOperationTypeControlPlaneMigrating"
  >
    <template #activator="{ props }">
      <div v-bind="props">
        <v-progress-circular
          v-if="isShootLastOperationTypeControlPlaneMigrating"
          indeterminate
          size="12"
          width="2"
          class="mr-1"
        />
        <router-link
          v-if="canLinkToSeed"
          :to="{ name: 'ShootItem', params: { name: shootSeedName, namespace:'garden' } }"
          class="text-anchor"
        >
          <span>{{ shootSeedName }}</span>
        </router-link>
        <span v-else>{{ shootSeedName }}</span>
      </div>
    </template>
    <span>{{ shootLastOperationTypeControlPlaneMigrationMessage }}</span>
  </v-tooltip>
</template>

<script>
import { defineComponent } from 'vue'

import { shootItem } from '@/mixins/shootItem'

export default defineComponent({
  mixins: [shootItem],
})
</script>
