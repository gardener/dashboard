<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <v-card>
    <v-toolbar flat dark dense color="cyan darken-2">
      <v-toolbar-title class="subtitle-1">Monitoring</v-toolbar-title>
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
              :operation="shootLastOperation"
              :lastErrors="shootLastErrors"
              :popperKey="`${shootNamespace}/${shootName}_lastOp`"
              :isStatusHibernated="isShootStatusHibernated"
              :isHibernationProgressing="isShootStatusHibernationProgressing"
              :reconciliationDeactivated="isShootReconciliationDeactivated"
              :shootDeleted="isShootLastOperationTypeDelete"
              popperPlacement="bottom"
              @titleChange="onShootStatusTitleChange">
            </shoot-status>
            <retry-operation class="retryOperation" :shootItem="shootItem"></retry-operation>
            {{shootStatusTitle}}
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
            <status-tags v-else :conditions="shootConditions" popperPlacement="bottom"></status-tags>
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
import RetryOperation from '@/components/RetryOperation'
import ClusterMetrics from '@/components/ClusterMetrics'
import { shootItem } from '@/mixins/shootItem'
import { mapGetters } from 'vuex'

export default {
  components: {
    ShootStatus,
    StatusTags,
    RetryOperation,
    ClusterMetrics
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem],
  data () {
    return {
      shootStatusTitle: ''
    }
  },
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
  },
  methods: {
    onShootStatusTitleChange (shootStatusTitle) {
      this.shootStatusTitle = shootStatusTitle
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
