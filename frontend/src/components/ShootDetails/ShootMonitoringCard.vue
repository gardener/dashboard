<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card>
    <v-toolbar flat dark dense color="cyan darken-2">
      <v-toolbar-title class="subtitle-1">Logging and Monitoring</v-toolbar-title>
    </v-toolbar>
    <v-list>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="cyan darken-2">mdi-tractor</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Status</v-list-item-subtitle>
          <v-list-item-title class="d-flex align-center pt-1">
            <shoot-status
              class="pr-2"
              :shootItem="shootItem"
              :popperKey="`${shootNamespace}/${shootName}_lastOp`"
              popperPlacement="bottom"
              showStatusText
              >
            </shoot-status>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="cyan darken-2">mdi-speedometer</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Readiness</v-list-item-subtitle>
          <v-list-item-title class="d-flex align-center pt-1">
            <span v-if="!shootConditions.length">-</span>
            <status-tags v-else :shootItem="shootItem" popperPlacement="bottom"></status-tags>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <template v-if="canGetSecrets">
        <v-divider inset></v-divider>
        <cluster-metrics v-if="!metricsNotAvailableText" :shootItem="shootItem"></cluster-metrics>
        <v-list-item v-else>
          <v-list-item-icon>
            <v-icon color="cyan darken-2">mdi-alert-circle-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>
              {{metricsNotAvailableText}}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </template>
    </v-list>
  </v-card>
</template>

<script>
import ShootStatus from '@/components/ShootStatus'
import StatusTags from '@/components/StatusTags'
import ClusterMetrics from '@/components/ClusterMetrics'
import { shootItem } from '@/mixins/shootItem'
import { mapGetters } from 'vuex'

export default {
  components: {
    ShootStatus,
    StatusTags,
    ClusterMetrics
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'canGetSecrets'
    ]),
    metricsNotAvailableText () {
      if (this.isTestingCluster) {
        return 'Cluster Metrics not available for clusters with purpose testing'
      }
      if (!this.seedShootIngressDomain) {
        return 'Cluster Metrics not available'
      }
      return undefined
    }
  }
}
</script>

<style lang="scss" scoped>
  .retryOperation {
    ::v-deep .v-btn {
      margin: 0 4px 0 0;
    }
  }
</style>
