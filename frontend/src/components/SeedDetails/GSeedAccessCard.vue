<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card class="mb-4">
    <g-toolbar title="Access" />
    <g-list>
      <g-gardenctl-command
        title="Target Seed"
        subtitle="Gardenctl command to target the seed cluster"
        :command="targetSeedCommand"
      />
    </g-list>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useConfigStore } from '@/store/config'

import GGardenctlCommand from '@/components/GGardenctlCommand.vue'
import GList from '@/components/GList.vue'

import { useSeedItem } from '@/composables/useSeedItem/index'

const configStore = useConfigStore()
const { clusterIdentity } = storeToRefs(configStore)
const { seedName } = useSeedItem()

const targetSeedCommand = computed(() => {
  const args = []

  if (clusterIdentity.value) {
    args.push(`--garden ${clusterIdentity.value}`)
  }
  if (seedName.value) {
    args.push(`--seed ${seedName.value}`)
  }

  return `gardenctl target ${args.join(' ')}`
})
</script>
