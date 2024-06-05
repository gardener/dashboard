<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-collapsable-items
    :items="shootWorkerGroups"
    :uid="shootMetadata.uid"
    inject-key="expandedWorkerGroups"
    :collapse="collapse"
  >
    <template #collapsed="{ itemCount }">
      <v-chip
        size="small"
        variant="tonal"
        :color="chipColor"
      >
        {{ itemCount }}
        {{ itemCount !== 1 ? 'Groups' : 'Group' }}
        <v-tooltip
          location="top"
          activator="parent"
          text="Worker Groups"
        />
      </v-chip>
    </template>
    <template #noItems>
      <v-chip
        size="small"
        variant="tonal"
        color="disabled"
      >
        workerless
        <v-tooltip
          location="top"
          text="This cluster does not have worker groups"
          activator="parent"
        />
      </v-chip>
    </template>
    <template #item="{ item }">
      <g-worker-group
        v-model="workerGroupTab"
        :worker-group="item"
        :cloud-profile-name="shootCloudProfileName"
        :shoot-metadata="shootMetadata"
        class="ma-1"
      />
    </template>
  </g-collapsable-items>
</template>

<script setup>
import {
  ref,
  computed,
} from 'vue'

import { useCloudProfileStore } from '@/store/cloudProfile'

import GWorkerGroup from '@/components/ShootWorkers/GWorkerGroup'
import GCollapsableItems from '@/components/GCollapsableItems'

import { useShootItem } from '@/composables/useShootItem'

import {
  filter,
  some,
} from '@/lodash'

defineProps({
  collapse: {
    type: Boolean,
    default: false,
  },
})

const {
  shootMetadata,
  shootCloudProfileName,
  shootWorkerGroups,
} = useShootItem()

const cloudProfileStore = useCloudProfileStore()

const workerGroupTab = ref('overview')

const machineImages = computed(() => {
  const machineImages = cloudProfileStore.machineImagesByCloudProfileName(shootCloudProfileName.value)
  return filter(machineImages, image => some(shootWorkerGroups.value, { machine: { image: { name: image.name, version: image.version } } }))
})

const chipColor = computed(() => {
  return some(machineImages.value, 'isDeprecated') ? 'warning' : 'primary'
})
</script>
