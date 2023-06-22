<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card>
    <v-toolbar flat dense color="toolbar-background toolbar-title--text">
      <v-toolbar-title class="text-subtitle-1">Logging and Monitoring</v-toolbar-title>
    </v-toolbar>
    <g-list>
      <g-list-item>
        <template #prepend>
          <v-icon icon="mdi-tractor" color="primary"/>
        </template>
        <g-list-item-content label="Status">
            <shoot-status
              class="pr-2"
              :shoot-item="shootItem"
              :popper-key="`${shootNamespace}/${shootName}_lastOp`"
              popper-placement="bottom"
              show-status-text
              >
            </shoot-status>
        </g-list-item-content>
      </g-list-item>
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-speedometer</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Readiness</v-list-item-subtitle>
          <v-list-item-title class="d-flex align-center pt-1">
            <span v-if="!shootConditions.length">-</span>
            <status-tags v-else :shoot-item="shootItem" popper-placement="bottom" show-status-text></status-tags>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-divider inset></v-divider>
      <cluster-metrics v-if="!metricsNotAvailableText" :shoot-item="shootItem"></cluster-metrics>
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
import { defineComponent } from 'vue'
import { mapState } from 'pinia'
import { useAuthnStore } from '@/store'

import ShootStatus from '@/components/ShootStatus.vue'
import StatusTags from '@/components/StatusTags.vue'
import ClusterMetrics from '@/components/ClusterMetrics.vue'
import { shootItem } from '@/mixins/shootItem'
import { useSanitizeUrl } from '@/composables'

export default defineComponent({
  setup () {
    const sanitizeUrl = useSanitizeUrl()
    return {
      sanitizeUrl,
    }
  },
  components: {
    ShootStatus,
    StatusTags,
    ClusterMetrics,
  },
  mixins: [shootItem],
  inject: ['api', 'logger'],
  computed: {
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
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
})
</script>
