<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card class="mb-4">
    <g-toolbar title="Logging and Monitoring" />
    <g-list-item>
      <template #prepend>
        <v-icon color="primary">
          mdi-tractor
        </v-icon>
      </template>
      <g-list-item-content label="Status">
        <g-shoot-status
          popper-placement="bottom"
          show-status-text
        />
      </g-list-item-content>
    </g-list-item>
    <v-divider inset />
    <g-list-item>
      <template #prepend>
        <v-icon color="primary">
          mdi-speedometer
        </v-icon>
      </template>
      <g-list-item-content label="Readiness">
        <div class="d-flex align-center pt-1">
          <span v-if="!shootConditions.length">-</span>
          <g-status-tags
            v-else
            popper-placement="bottom"
            show-status-text
          />
        </div>
      </g-list-item-content>
    </g-list-item>
    <g-list-item v-if="canViewLandscape">
      <g-list-item-content label="Seed Readiness">
        <div class="d-flex align-center pt-1">
          <span v-if="!shootConditions.length">-</span>
          <g-seed-status-tags
            v-else
            :identifier="shootUid"
            popper-placement="bottom"
            show-status-text
          />
        </div>
      </g-list-item-content>
    </g-list-item>
    <template
      v-if="showMetricsSection"
    >
      <v-divider inset />
      <g-cluster-metrics />
    </template>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'

import GShootStatus from '@/components/GShootStatus'
import GStatusTags from '@/components/GStatusTags'
import GSeedStatusTags from '@/components/GSeedStatusTags'
import GClusterMetrics from '@/components/GClusterMetrics'

import { useShootItem } from '@/composables/useShootItem'
const authzStore = useAuthzStore()

const {
  canViewLandscape,
  canGetCloudProviderCredentials,
} = storeToRefs(authzStore)

const {
  isOidcObservabilityUrlsEnabled,
} = useConfigStore()

const shootItem = useShootItem()
const {
  shootUid,
  shootConditions,
} = shootItem

const showMetricsSection = computed(() => {
  return canViewLandscape.value ||
    isOidcObservabilityUrlsEnabled ||
    canGetCloudProviderCredentials.value
})
</script>
