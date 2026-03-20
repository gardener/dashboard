<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-text-router-link
    v-if="managedSeedShootItemLink"
    :to="managedSeedShootItemLink"
    :text="managedSeedShootName"
  />
  <v-chip
    v-else-if="showUnmanagedChip"
    v-tooltip:top="'This seed is not backed by a ManagedSeed / Shoot resource'"
    size="small"
    variant="tonal"
  >
    Unmanaged
  </v-chip>
</template>

<script setup>
import { computed } from 'vue'

import GTextRouterLink from '@/components/GTextRouterLink'

const props = defineProps({
  managedSeedShootName: {
    type: String,
    default: undefined,
  },
  showUnmanagedChip: {
    type: Boolean,
    default: true,
  },
})

const managedSeedShootItemLink = computed(() => {
  if (!props.managedSeedShootName) {
    return undefined
  }

  return {
    name: 'ShootItem',
    params: {
      namespace: 'garden',
      name: props.managedSeedShootName,
    },
  }
})
</script>
