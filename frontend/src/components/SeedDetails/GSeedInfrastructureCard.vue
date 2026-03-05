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
              :region="seedProviderRegion"
              :zones="seedProviderZones"
            />
          </template>
          <div class="pt-1 d-flex flex-shrink-1">
            <g-vendor
              extended
              :provider-type="seedProviderType"
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
            mdi-server
          </v-icon>
        </template>
        <g-list-item-content label="Allocatable Shoots">
          {{ seedAllocatableShoots || '-' }}
        </g-list-item-content>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-spa
          </v-icon>
        </template>
        <g-list-item-content label="High Availability">
          <div class="d-flex flex-wrap align-center">
            <span class="mr-1">Failure tolerance</span>
            <g-high-availability-tag
              :popover-key="controlPlaneHighAvailabilityTagPopoverKey"
              :failure-tolerance-type="seedBestSupportedFailureToleranceType"
              size="small"
              color="primary"
              chip-class="mr-1"
            />
          </div>
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
import { computed } from 'vue'

import GHighAvailabilityTag from '@/components/ControlPlaneHighAvailability/GHighAvailabilityTag.vue'
import GVendor from '@/components/GVendor.vue'

import { useSeedItem } from '@/composables/useSeedItem/index'

const {
  seedProviderType,
  seedProviderRegion,
  seedProviderZones,
  seedUid,
  seedBestSupportedFailureToleranceType,
  seedNetworksNodes,
  seedNetworksPods,
  seedNetworksServices,
  seedNetworksShootDefaultsPods,
  seedNetworksShootDefaultsServices,
  seedNetworksBlockCIDRs,
  seedAllocatableShoots,
} = useSeedItem()

const controlPlaneHighAvailabilityTagPopoverKey = computed(() => {
  return `g-seed-control-plane-high-availability-tag:${seedUid.value}`
})

const seedNetworksBlockCIDRsText = computed(() => {
  return seedNetworksBlockCIDRs.value?.join(', ') ?? ''
})
</script>
