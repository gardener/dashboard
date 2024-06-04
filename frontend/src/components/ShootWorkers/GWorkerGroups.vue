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
      <v-tooltip
        :class="{ 'worker-chips-tooltip' : hasShootWorkerGroups }"
        location="top"
        max-width="400px"
        open-delay="200"
      >
        <template #activator="{ props: tooltipProps }">
          <v-chip
            v-bind="tooltipProps"
            size="small"
            variant="tonal"
            :color="chipColor"
          >
            {{ itemCount }}
            {{ itemCount !== 1 ? 'Groups' : 'Group' }}
          </v-chip>
        </template>
        <span v-if="!hasShootWorkerGroups">This cluster does not have worker groups</span>
        <v-card
          v-else
          class="pa-1"
        >
          <g-worker-chip
            v-for="(workerGroup) in shootWorkerGroups"
            :key="workerGroup.name"
            :worker-group="workerGroup"
            :cloud-profile-name="shootCloudProfileName"
            class="ma-1"
          />
        </v-card>
      </v-tooltip>
    </template>
    <template #noItems>
      <v-tooltip
        location="top"
      >
        <template #activator="{ props: tooltipProps }">
          <v-chip
            v-bind="tooltipProps"
            size="small"
            variant="tonal"
            color="disabled"
          >
            workerless
          </v-chip>
        </template>
        This cluster does not have worker groups
      </v-tooltip>
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
import GWorkerChip from '@/components/ShootWorkers/GWorkerChip'
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
  hasShootWorkerGroups,
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

<style lang="scss" scoped>
.worker-chips-tooltip {
  :deep(.v-overlay__content) {
    opacity: 1 !important;
    padding: 0;
  }
}

</style>
