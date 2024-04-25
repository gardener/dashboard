<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

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
        <g-text-router-link
          v-if="canLinkToSeed"
          :to="{ name: 'ShootItem', params: { name: shootSeedName, namespace: 'garden' } }"
          :text="shootSeedName"
        />
        <span v-else>{{ shootSeedName }}</span>
      </div>
    </template>
    <span>{{ shootLastOperationTypeControlPlaneMigrationMessage }}</span>
  </v-tooltip>
</template>

<script setup>
import GTextRouterLink from '@/components/GTextRouterLink.vue'

import { useShootItem } from '@/composables/useShootItem'

const {
  shootSeedName,
  canLinkToSeed,
  isShootLastOperationTypeControlPlaneMigrating,
  shootLastOperationTypeControlPlaneMigrationMessage,
} = useShootItem()
</script>
