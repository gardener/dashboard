<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-tooltip:top="{
      text: shootLastOperationTypeControlPlaneMigrationMessage,
      disabled: !isShootLastOperationTypeControlPlaneMigrating
    }"
  >
    <v-progress-circular
      v-if="isShootLastOperationTypeControlPlaneMigrating"
      indeterminate
      size="12"
      width="2"
      class="mr-1"
    />
    <g-text-router-link
      v-if="isAdmin"
      :to="seedItemLink"
      :text="shootSeedName"
    />
    <span v-else>{{ shootSeedName }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useAuthnStore } from '@/store/authn'

import GTextRouterLink from '@/components/GTextRouterLink.vue'

import { useShootItem } from '@/composables/useShootItem'

const {
  shootNamespace,
  shootSeedName,
  isShootLastOperationTypeControlPlaneMigrating,
  shootLastOperationTypeControlPlaneMigrationMessage,
} = useShootItem()

const authnStore = useAuthnStore()
const { isAdmin } = storeToRefs(authnStore)

const seedItemLink = computed(() => ({
  name: 'SeedItem',
  params: {
    name: shootSeedName.value,
  },
  query: {
    namespace: shootNamespace.value,
  },
}))
</script>
