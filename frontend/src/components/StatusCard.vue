<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
    <v-card-title class="subheading white--text cyan darken-2 statusTitle">
      Monitoring
    </v-card-title>
    <div class="list">
      <v-card-title class="listItem">
        <v-icon class="cyan--text text--darken-2 avatar">mdi-tractor</v-icon>
        <div>
          <span class="grey--text">Status</span><br>
          <shoot-status
            class="shootStatus"
            :operation="lastOperation"
            :lastError="lastError"
            :popperKey="`${namespace}/${name}_lastOp`"
            :isHibernated="isHibernated"
            :reconciliationDeactivated="reconciliationDeactivated"
            :shootDeleted="isShootMarkedForDeletion"
            popperPlacement="bottom"
            @titleChange="onShootStatusTitleChange">
          </shoot-status>
          <retry-operation class="retryOperation" :shootItem="shootItem"></retry-operation>
            {{shootStatusTitle}}
        </div>
      </v-card-title>
      <v-divider class="my-2" inset></v-divider>
      <v-card-title class="listItem">
        <v-icon class="cyan--text text--darken-2 avatar">mdi-speedometer</v-icon>
        <div>
          <span class="grey--text">Readiness</span><br>
          <template v-if="conditions.length === 0">-</template>
          <status-tags v-else :conditions="conditions" popperPlacement="bottom"></status-tags>
        </div>
      </v-card-title>
      <template v-if="isAdmin && seedShootIngressDomain">
        <v-divider class="my-2" inset></v-divider>
        <cluster-metrics :info="info"></cluster-metrics>
      </template>
    </div>
  </v-card>
</template>



<script>
  import ShootStatus from '@/components/ShootStatus'
  import StatusTags from '@/components/StatusTags'
  import RetryOperation from '@/components/RetryOperation'
  import ClusterMetrics from '@/components/ClusterMetrics'
  import get from 'lodash/get'
  import { isHibernated,
           isReconciliationDeactivated,
           isShootMarkedForDeletion } from '@/utils'
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
    data () {
      return {
        shootStatusTitle: ''
      }
    },
    computed: {
      ...mapGetters([
        'isAdmin'
      ]),
      lastOperation () {
        return get(this.shootItem, 'status.lastOperation', {})
      },
      lastError () {
        return get(this.shootItem, 'status.lastError', {})
      },
      name () {
        return get(this.shootItem, 'metadata.name')
      },
      namespace () {
        return get(this.shootItem, 'metadata.namespace')
      },
      metadata () {
        return get(this.shootItem, 'metadata', {})
      },
      annotations () {
        return get(this.shootItem, 'metadata.annotations', {})
      },
      spec () {
        return get(this.shootItem, 'spec', {})
      },
      status () {
        return get(this.shootItem, 'status', {})
      },
      conditions () {
        return get(this.shootItem, 'status.conditions', [])
      },
      isHibernated () {
        return isHibernated(this.spec)
      },
      reconciliationDeactivated () {
        const metadata = { annotations: this.annotations }
        return isReconciliationDeactivated(metadata)
      },
      isShootMarkedForDeletion () {
        return isShootMarkedForDeletion(this.metadata)
      },
      info () {
        return get(this.shootItem, 'info', {})
      },
      seedShootIngressDomain () {
        return this.info.seedShootIngressDomain || ''
      }
    },
    methods: {
      onShootStatusTitleChange (shootStatusTitle) {
        this.shootStatusTitle = shootStatusTitle
      }
    }
  }
</script>

<style lang="styl" scoped>

  .statusTitle {
    line-height: 10px;
  }

  .listItem {
    padding-top: 0px;
    padding-bottom: 0px;
  }

  .list {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .avatar {
    padding-right: 33px;
  }

  .shootStatus {
    padding-right: 8px;
  }

  .retryOperation >>> .btn {
    margin-right: 4px;
    margin-left: 0px;
    margin-bottom: 0px;
    margin-top: 0px;
  }

</style>