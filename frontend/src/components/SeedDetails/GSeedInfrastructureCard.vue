<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card class="mb-4">
    <g-toolbar title="Infrastructure" />
    <g-list>
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-cloud-outline
          </v-icon>
        </template>
        <g-list-item-content>
          <template #label>
            <g-vendor
              title
              extended
              :provider-type="seedProviderType"
              vendor-type="infra"
              :region="seedProviderRegion"
              :zones="seedProviderZones"
            />
          </template>
          <div class="pt-1 d-flex flex-shrink-1">
            <g-vendor
              extended
              :provider-type="seedProviderType"
              vendor-type="infra"
              :region="seedProviderRegion"
              :zones="seedProviderZones"
            />
          </div>
        </g-list-item-content>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-gauge
          </v-icon>
        </template>
        <g-list-item-content label="Capacity">
          <g-seed-capacity-indicator
            :allocatable-shoots="seedAllocatableShoots"
            :shoot-count="seedShootCount"
          />
        </g-list-item-content>
      </g-list-item>
      <g-list-item>
        <g-list-item-content label="Shoot Health">
          <g-shoot-health-donut
            :shoot-count="seedShootCount"
            :total-unhealthy-shoots="seedTotalUnhealthyShoots"
            :matching-unhealthy-shoots="seedUnhealthyShoots"
            :active-filter-labels="activeFilterLabels"
          />
        </g-list-item-content>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-ip-network
          </v-icon>
        </template>
        <g-list-item-content label="Pods CIDR">
          {{ seedNetworksPods || '-' }}
        </g-list-item-content>
      </g-list-item>
      <g-list-item content-class="py-0">
        <g-list-item-content label="Nodes CIDR">
          {{ seedNetworksNodes || '-' }}
        </g-list-item-content>
      </g-list-item>
      <g-list-item>
        <g-list-item-content label="Services CIDR">
          {{ seedNetworksServices || '-' }}
        </g-list-item-content>
      </g-list-item>
      <g-list-item v-if="seedNetworksBlockCIDRsText">
        <g-list-item-content label="Blocked CIDRs">
          {{ seedNetworksBlockCIDRsText }}
        </g-list-item-content>
      </g-list-item>
      <g-list-item>
        <g-list-item-content label="Shoot Default Pods CIDR">
          {{ seedNetworksShootDefaultsPods || '-' }}
        </g-list-item-content>
      </g-list-item>
      <g-list-item>
        <g-list-item-content label="Shoot Default Services CIDR">
          {{ seedNetworksShootDefaultsServices || '-' }}
        </g-list-item-content>
      </g-list-item>
    </g-list>
  </v-card>
</template>

<script setup>
import {
  computed,
  onUnmounted,
  watch,
} from 'vue'

import { useSeedStatStore } from '@/store/seedStat'

import GSeedCapacityIndicator from '@/components/Seeds/GSeedCapacityIndicator.vue'
import GShootHealthDonut from '@/components/GShootHealthDonut.vue'
import GVendor from '@/components/GVendor.vue'

import { useSeedItem } from '@/composables/useSeedItem/index'
import { useShootListFilters } from '@/composables/useShootListFilters'

const seedStatStore = useSeedStatStore()

const {
  seedProviderType,
  seedProviderRegion,
  seedProviderZones,
  seedNetworksNodes,
  seedNetworksPods,
  seedNetworksServices,
  seedNetworksShootDefaultsPods,
  seedNetworksShootDefaultsServices,
  seedNetworksBlockCIDRs,
  seedAllocatableShoots,
  seedShootCount,
  seedTotalUnhealthyShoots,
  seedUnhealthyShoots,
  seedName,
} = useSeedItem()

const { activeFilterLabels } = useShootListFilters()

const seedNetworksBlockCIDRsText = computed(() => {
  return seedNetworksBlockCIDRs.value?.join(', ') ?? ''
})

const seedStatsSubscriptionOptions = computed(() => {
  if (!seedName.value) {
    return null
  }

  return {
    name: seedName.value,
    unhealthyFilterMask: seedStatStore.currentUnhealthyFilterMask,
  }
})

watch(seedStatsSubscriptionOptions, options => {
  if (options) {
    seedStatStore.subscribe(options)
  } else {
    seedStatStore.unsubscribe()
  }
}, {
  immediate: true,
})

onUnmounted(() => {
  seedStatStore.unsubscribe()
})
</script>
