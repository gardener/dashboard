<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card>
    <v-toolbar flat dense color="toolbar-background toolbar-title--text">
      <v-toolbar-title class="text-subtitle-1">Logging and Monitoring</v-toolbar-title>
    </v-toolbar>
    <v-list>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-tractor</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Status</v-list-item-subtitle>
          <v-list-item-title class="d-flex align-center pt-1">
            <g-shoot-status
              class="pr-2"
              :shoot-item="shootItem"
              :popper-key="`${shootNamespace}/${shootName}_lastOp`"
              popper-placement="bottom"
              show-status-text
              >
            </g-shoot-status>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-speedometer</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Readiness</v-list-item-subtitle>
          <v-list-item-title class="d-flex align-center pt-1">
            <span v-if="!shootConditions.length">-</span>
            <g-status-tags v-else :shoot-item="shootItem" popper-placement="bottom" show-status-text></g-status-tags>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-divider inset></v-divider>
      <g-cluster-metrics v-if="!metricsNotAvailableText" :shoot-item="shootItem"></g-cluster-metrics>
      <v-list-item v-else>
        <v-list-item-icon>
          <v-icon color="primary">mdi-alert-circle-outline</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>
            {{metricsNotAvailableText}}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
import GShootStatus from '@/components/GShootStatus'
import GStatusTags from '@/components/GStatusTags'
import GClusterMetrics from '@/components/GClusterMetrics'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GShootStatus,
    GStatusTags,
    GClusterMetrics,
  },
  mixins: [shootItem],
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
