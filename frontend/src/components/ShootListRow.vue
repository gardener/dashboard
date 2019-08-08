<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <tr>
    <td class="nowrap" v-if="this.headerVisible['project']">
      <router-link class="cyan--text text--darken-2" :to="{ name: 'ShootList', params: { namespace:row.namespace } }">
        {{ row.projectName }}
      </router-link>
    </td>
    <td class="nowrap" v-if="this.headerVisible['name']">
      <v-layout align-center row fill-height class="pa-0 ma-0">
        <v-flex grow>
          <router-link class="cyan--text text--darken-2" :to="{ name: 'ShootItem', params: { name: row.name, namespace:row.namespace } }">
            {{ row.name }}
          </router-link>
        </v-flex>
        <v-flex shrink>
          <self-termination-warning :expirationTimestamp="row.expirationTimestamp"></self-termination-warning>
          <hibernation-schedule-warning
            v-if="isShootHasNoHibernationScheduleWarning"
            :name="row.name"
            :namespace="row.namespace"
            :purpose="row.purpose">
          </hibernation-schedule-warning>
        </v-flex>
      </v-layout>
    </td>
    <td class="nowrap" v-if="this.headerVisible['infrastructure']">
      <v-tooltip top>
        <v-layout align-center justify-start row fill-height slot="activator">
          <infra-icon v-model="row.kind" content-class="mr-2"></infra-icon>
          <div>{{ row.region }}</div>
        </v-layout>
        <span>{{ row.kind }} [{{ row.region }}]</span>
      </v-tooltip>
    </td>
    <td class="nowrap" v-if="this.headerVisible['seed']">
      <router-link v-if="canLinkToSeed" class="cyan--text text--darken-2" :to="{ name: 'ShootItem', params: { name: row.seed, namespace:'garden' } }">
        <span>{{row.seed}}</span>
      </router-link>
      <template v-else>
        <span>{{row.seed}}</span>
      </template>
    </td>
    <td class="nowrap" v-if="this.headerVisible['technicalId']">
      <v-layout align-center justify-start row fill-height slot="activator">
        <span>{{row.technicalId}}</span>
        <copy-btn :clipboard-text="row.technicalId"></copy-btn>
      </v-layout>
    </td>
    <td class="nowrap" v-if="this.headerVisible['createdBy']">
      <account-avatar :account-name="row.createdBy"></account-avatar>
    </td>
    <td class="nowrap" v-if="this.headerVisible['createdAt']">
      <v-tooltip top>
        <div slot="activator">
          <time-string :date-time="row.creationTimestamp" :pointInTime="-1"></time-string>
        </div>
        {{ createdAt }}
      </v-tooltip>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['purpose']">
      <purpose-tag :purpose="row.purpose"></purpose-tag>
    </td>
    <td class="text-xs-left nowrap" v-if="this.headerVisible['lastOperation']">
      <div>
        <shoot-status
         :operation="row.lastOperation"
         :lastError="row.lastError"
         :popperKey="`${row.namespace}/${row.name}`"
         :isHibernated="row.isHibernated"
         :reconciliationDeactivated="reconciliationDeactivated"
         :shootDeleted="isTypeDelete">
        </shoot-status>
        <retry-operation :shootItem="shootItem"></retry-operation>
      </div>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['k8sVersion']">
      <shoot-version :shoot-item="shootItem"></shoot-version>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['readiness']">
      <status-tags :conditions="row.conditions"></status-tags>
    </td>
    <td class="nowrap" v-if="this.headerVisible['journal']">
      <v-tooltip top>
        <div slot="activator">
          <router-link class="cyan--text text--darken-2" :to="{ name: 'ShootItem', params: { name: row.name, namespace:row.namespace } }">
            <time-string :date-time="row.lastUpdatedJournalTimestamp" :pointInTime="-1"></time-string>
          </router-link>
        </div>
        {{ lastUpdatedJournal }}
      </v-tooltip>
    </td>
    <td v-if="this.headerVisible['journalLabels']">
      <template v-if="row.lastUpdatedJournalTimestamp && !row.journalsLabels.length">
        None
      </template>
      <template v-else>
        <journal-labels :labels="row.journalsLabels"></journal-labels>
      </template>
    </td>
    <td class="action-button-group text-xs-right nowrap" v-if="this.headerVisible['actions']">
      <v-layout align-center justify-end row fill-height>
        <v-tooltip top>
          <v-btn small icon class="cyan--text text--darken-2" slot="activator" :disabled="isClusterAccessDialogDisabled" @click="showDialog('access')">
            <v-icon size="22">mdi-key</v-icon>
          </v-btn>
          <span>{{showClusterAccessActionTitle}}</span>
        </v-tooltip>
        <delete-cluster :shootItem="shootItem" small content-class="red--text"></delete-cluster>
      </v-layout>
    </td>
  </tr>
</template>

<script>
import { mapGetters } from 'vuex'
import AccountAvatar from '@/components/AccountAvatar'
import InfraIcon from '@/components/VendorIcon'
import ShootStatus from '@/components/ShootStatus'
import StatusTags from '@/components/StatusTags'
import PurposeTag from '@/components/PurposeTag'
import TimeString from '@/components/TimeString'
import ShootVersion from '@/components/ShootVersion'
import RetryOperation from '@/components/RetryOperation'
import JournalLabels from '@/components/JournalLabels'
import CopyBtn from '@/components/CopyBtn'
import SelfTerminationWarning from '@/components/SelfTerminationWarning'
import HibernationScheduleWarning from '@/components/HibernationScheduleWarning'
import DeleteCluster from '@/components/DeleteCluster'
import forEach from 'lodash/forEach'
import get from 'lodash/get'
import includes from 'lodash/includes'
import {
  getTimestampFormatted,
  getCloudProviderKind,
  getCreatedBy,
  isHibernated,
  isReconciliationDeactivated,
  isShootMarkedForDeletion,
  isTypeDelete,
  getProjectName,
  isShootHasNoHibernationScheduleWarning,
  canLinkToSeed
} from '@/utils'

export default {
  components: {
    InfraIcon,
    StatusTags,
    PurposeTag,
    ShootStatus,
    TimeString,
    ShootVersion,
    JournalLabels,
    RetryOperation,
    SelfTerminationWarning,
    HibernationScheduleWarning,
    AccountAvatar,
    DeleteCluster,
    CopyBtn
  },
  props: {
    shootItem: {
      type: Object,
      required: true
    },
    visibleHeaders: {
      type: Array,
      required: true
    }
  },
  computed: {
    ...mapGetters([
      'lastUpdatedJournalByNameAndNamespace',
      'journalsLabels'
    ]),
    row () {
      const spec = this.shootItem.spec
      const metadata = this.shootItem.metadata
      const status = this.shootItem.status
      const info = this.shootItem.info
      const kind = getCloudProviderKind(spec.cloud)
      return {
        name: metadata.name,
        namespace: metadata.namespace,
        projectName: getProjectName(metadata),
        createdBy: getCreatedBy(metadata),
        creationTimestamp: metadata.creationTimestamp,
        expirationTimestamp: get(metadata, ['annotations', 'shoot.garden.sapcloud.io/expirationTimestamp']),
        annotations: get(metadata, 'annotations', {}),
        deletionTimestamp: metadata.deletionTimestamp,
        lastOperation: get(status, 'lastOperation', {}),
        lastError: get(status, 'lastError'),
        conditions: get(status, 'conditions', []),
        kind,
        region: get(spec, 'cloud.region'),
        isHibernated: isHibernated(spec),
        info,
        purpose: get(metadata, ['annotations', 'garden.sapcloud.io/purpose']),
        lastUpdatedJournalTimestamp: this.lastUpdatedJournalByNameAndNamespace(this.shootItem.metadata),
        journalsLabels: this.journalsLabels(this.shootItem.metadata),
        // setting the retry annotation internally will increment "metadata.generation". If the values differ, a reconcile will be scheduled
        reconcileScheduled: get(metadata, 'generation') !== get(status, 'observedGeneration'),
        seed: get(spec, 'cloud.seed'),
        technicalId: get(status, 'technicalID')
      }
    },
    headerVisible () {
      const headerVisible = {}
      forEach(this.visibleHeaders, (header) => {
        headerVisible[header.value] = true
      })
      return headerVisible
    },
    createdAt () {
      return getTimestampFormatted(this.row.creationTimestamp)
    },
    lastUpdatedJournal () {
      return getTimestampFormatted(this.row.lastUpdatedJournalTimestamp)
    },
    isInfoAvailable () {
      // operator not yet updated shoot resource
      if (this.row.lastOperation.type === undefined || this.row.lastOperation.state === undefined) {
        return false
      }
      return !this.isCreateOrDeleteInProcess
    },
    reconciliationDeactivated () {
      const metadata = { annotations: this.row.annotations }
      return isReconciliationDeactivated(metadata)
    },
    isCreateOrDeleteInProcess () {
      // create or delete in process
      if (includes(['Create', 'Delete'], this.row.lastOperation.type) && this.row.lastOperation.state === 'Processing') {
        return true
      }
      return false
    },
    isShootMarkedForDeletion () {
      const metadata = { deletionTimestamp: this.row.deletionTimestamp, annotations: this.row.annotations }
      return isShootMarkedForDeletion(metadata)
    },
    isTypeDelete () {
      return isTypeDelete(this.row.lastOperation)
    },
    isClusterAccessDialogDisabled () {
      const itemInfo = this.row.info || {}

      if (itemInfo.dashboardUrl) {
        return false
      }
      if (itemInfo.kubeconfig) {
        return false
      }

      // disabled if info is NOT available
      return !this.isInfoAvailable
    },
    showClusterAccessActionTitle () {
      return this.isClusterAccessDialogDisabled
        ? 'Cluster Access'
        : 'Show Cluster Access'
    },
    isShootHasNoHibernationScheduleWarning () {
      return isShootHasNoHibernationScheduleWarning(this.shootItem)
    },
    canLinkToSeed () {
      return canLinkToSeed({ shootNamespace: this.row.namespace })
    }
  },
  methods: {
    showDialog: function (action) {
      const shootItem = this.shootItem
      this.$emit('showDialog', { action, shootItem })
    }
  }
}
</script>
<style lang="styl" scoped>
  .action-button-group {
    white-space: nowrap;

    button[type=button] {
      margin: 0 4px;
    }
  }

  .nowrap {
    white-space: nowrap;
  }
</style>
