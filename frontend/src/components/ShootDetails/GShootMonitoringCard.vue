<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card class="mb-4">
    <g-toolbar title="Logging and Monitoring" />
    <g-list>
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-tractor
          </v-icon>
        </template>
        <g-list-item-content label="Status">
          <g-shoot-status
            :popper-key="`${shootNamespace}/${shootName}_lastOp`"
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
      <v-divider inset />
      <g-cluster-metrics
        v-if="!metricsNotAvailableText"
      />
      <g-list-item v-else>
        <template #prepend>
          <v-icon color="primary">
            mdi-alert-circle-outline
          </v-icon>
        </template>
        <g-list-item-content>
          {{ metricsNotAvailableText }}
        </g-list-item-content>
      </g-list-item>
    </g-list>
  </v-card>
</template>

<script>
import GShootStatus from '@/components/GShootStatus'
import GStatusTags from '@/components/GStatusTags'
import GClusterMetrics from '@/components/GClusterMetrics'

import { useShootItem } from '@/composables/useShootItem'

export default {
  components: {
    GShootStatus,
    GStatusTags,
    GClusterMetrics,
  },
  setup () {
    return {
      ...useShootItem(),
    }
  },
  computed: {
    metricsNotAvailableText () {
      if (this.isTestingCluster) {
        return 'Cluster Metrics not available for clusters with purpose testing'
      }
      if (!this.seedShootIngressDomain) {
        return 'Cluster Metrics not available'
      }
      return undefined
    },
  },
}
</script>
