<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="shootSeedName"
    v-tooltip:top="{
      text: isShootLastOperationTypeControlPlaneMigrating
        ? shootLastOperationTypeControlPlaneMigrationMessage
        : shootSeedName,
      disabled: !isShootLastOperationTypeControlPlaneMigrating && !truncate,
    }"
    :class="{ 'seed-name--truncate': truncate }"
  >
    <v-progress-circular
      v-if="isShootLastOperationTypeControlPlaneMigrating"
      indeterminate
      size="12"
      width="2"
      class="mr-1"
    />
    <g-text-router-link
      v-if="canViewLandscape"
      :to="seedItemLink"
      :text="shootSeedName"
    />
    <span v-else>{{ shootSeedName }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useAuthzStore } from '@/store/authz'

import GTextRouterLink from '@/components/GTextRouterLink.vue'

import { useShootItem } from '@/composables/useShootItem'

const {
  shootSeedName,
  isShootLastOperationTypeControlPlaneMigrating,
  shootLastOperationTypeControlPlaneMigrationMessage,
} = useShootItem()

defineProps({
  truncate: {
    type: Boolean,
    default: false,
  },
})

const authzStore = useAuthzStore()
const { canViewLandscape } = storeToRefs(authzStore)

const seedItemLink = computed(() => ({
  name: 'SeedItem',
  params: {
    name: shootSeedName.value,
  },
}))
</script>

<style scoped>
.seed-name--truncate {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
