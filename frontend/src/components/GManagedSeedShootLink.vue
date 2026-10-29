<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <template v-if="!managedSeedStore.isInitial">
    <g-auto-hide
      v-if="managedSeedShootItemLink && copyable"
      right
    >
      <template #activator>
        <g-text-router-link
          :to="managedSeedShootItemLink"
          :text="managedSeedShootName"
        />
      </template>
      <g-copy-btn
        :clipboard-text="managedSeedShootName"
        tooltip-text="Copy shoot name to clipboard"
      />
    </g-auto-hide>
    <g-text-router-link
      v-else-if="managedSeedShootItemLink"
      :to="managedSeedShootItemLink"
      :text="managedSeedShootName"
    />
    <v-chip
      v-else-if="!hideUnmanagedChip"
      v-tooltip:top="'This seed is not backed by a ManagedSeed / Shoot resource'"
      size="small"
      variant="tonal"
    >
      Unmanaged
    </v-chip>
  </template>
</template>

<script setup>
import { computed } from 'vue'

import { useManagedSeedStore } from '@/store/managedSeed'

import GAutoHide from '@/components/GAutoHide.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GTextRouterLink from '@/components/GTextRouterLink'

const managedSeedStore = useManagedSeedStore()

const props = defineProps({
  managedSeedShootName: {
    type: String,
    default: undefined,
  },
  hideUnmanagedChip: {
    type: Boolean,
    default: false,
  },
  copyable: {
    type: Boolean,
    default: false,
  },
})

const managedSeedShootItemLink = computed(() => {
  if (!props.managedSeedShootName) {
    return undefined
  }

  return {
    name: 'ShootItem',
    params: {
      projectName: 'garden',
      name: props.managedSeedShootName,
    },
  }
})
</script>
