<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card v-if="commandParametersPresentAndValid" class="mb-4">
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

import {
  isRfc1123LabelName,
  isGardenName,
} from '@/utils/validators'

const configStore = useConfigStore()
const { clusterIdentity } = storeToRefs(configStore)
const { seedName } = useSeedItem()

const targetSeedCommand = computed(() => {
  return `gardenctl target --garden ${clusterIdentity.value} --seed ${seedName.value}`
})
const commandParametersPresentAndValid = computed(() => {
  return clusterIdentity.value && isGardenName(clusterIdentity.value)
  && seedName.value && isRfc1123LabelName(seedName.value)
})
</script>
