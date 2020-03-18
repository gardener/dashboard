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
      <router-link class="cyan--text text--darken-2" :to="{ name: 'ShootList', params: { namespace: shootNamespace } }">
        {{ shootProjectName }}
      </router-link>
    </td>
    <td class="nowrap" v-if="this.headerVisible['name']">
      <v-layout align-center row fill-height class="pa-0 ma-0">
        <v-flex grow>
          <router-link class="cyan--text text--darken-2" :to="{ name: 'ShootItem', params: { name: shootName, namespace: shootNamespace } }">
            {{ shootName }}
          </router-link>
        </v-flex>
        <v-flex shrink>
          <self-termination-warning :expirationTimestamp="shootExpirationTimestamp"></self-termination-warning>
          <hibernation-schedule-warning
            v-if="isShootHasNoHibernationScheduleWarning"
            :name="shootName"
            :namespace="shootNamespace"
            :purpose="shootPurpose">
          </hibernation-schedule-warning>
        </v-flex>
      </v-layout>
    </td>
    <td class="nowrap" v-if="this.headerVisible['infrastructure']">
      <v-tooltip top>
        <v-layout align-center justify-start row fill-height slot="activator">
          <infra-icon v-model="shootCloudProviderKind" content-class="mr-2"></infra-icon>
          <div>{{ shootRegion }}</div>
        </v-layout>
        <span>{{ shootCloudProviderKind }} [{{ shootRegion }}]</span>
      </v-tooltip>
    </td>
    <td class="nowrap" v-if="this.headerVisible['seed']">
      <shoot-seed-name :shootItem="shootItem" />
    </td>
    <td class="nowrap" v-if="this.headerVisible['technicalId']">
      <v-layout align-center justify-start row fill-height slot="activator">
        <span>{{shootTechnicalId}}</span>
        <copy-btn :clipboard-text="shootTechnicalId"></copy-btn>
      </v-layout>
    </td>
    <td class="nowrap" v-if="this.headerVisible['createdBy']">
      <account-avatar :account-name="shootCreatedBy"></account-avatar>
    </td>
    <td class="nowrap" v-if="this.headerVisible['createdAt']">
      <v-tooltip top>
        <div slot="activator">
          <time-string :date-time="shootCreationTimestamp" :pointInTime="-1"></time-string>
        </div>
        {{ shootCreatedAt }}
      </v-tooltip>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['purpose']">
      <purpose-tag :purpose="shootPurpose"></purpose-tag>
    </td>
    <td class="text-xs-left nowrap" v-if="this.headerVisible['lastOperation']">
      <div>
        <shoot-status
         :operation="shootLastOperation"
         :lastErrors="shootLastErrors"
         :popperKey="`${shootNamespace}/${shootName}`"
         :isStatusHibernated="isShootStatusHibernated"
         :isHibernationProgressing="isShootStatusHibernationProgressing"
         :reconciliationDeactivated="isShootReconciliationDeactivated"
         :shootDeleted="isTypeDelete">
        </shoot-status>
        <retry-operation :shootItem="shootItem"></retry-operation>
      </div>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['k8sVersion']">
      <shoot-version :shoot-item="shootItem"></shoot-version>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['readiness']">
      <status-tags :conditions="shootConditions"></status-tags>
    </td>
    <td class="nowrap" v-if="this.headerVisible['journal']">
      <v-tooltip top>
        <div slot="activator">
          <router-link class="cyan--text text--darken-2" :to="{ name: 'ShootItem', params: { name: shootName, namespace: shootNamespace } }">
            <time-string :date-time="shootLastUpdatedJournalTimestamp" :pointInTime="-1"></time-string>
          </router-link>
        </div>
        {{ shootLastUpdatedJournal }}
      </v-tooltip>
    </td>
    <td v-if="this.headerVisible['journalLabels']">
      <template v-if="shootLastUpdatedJournalTimestamp && !shootJournalsLabels.length">
        None
      </template>
      <template v-else>
        <journal-labels :labels="shootJournalsLabels"></journal-labels>
      </template>
    </td>
    <td class="action-button-group text-xs-right nowrap" v-if="this.headerVisible['actions']">
      <v-layout align-center justify-end row fill-height>
        <v-tooltip top v-if="canGetSecrets">
          <v-btn small icon class="cyan--text text--darken-2" slot="activator" :disabled="isClusterAccessDialogDisabled" @click="showDialog('access')">
            <v-icon size="22">mdi-key</v-icon>
          </v-btn>
          <span>{{showClusterAccessActionTitle}}</span>
        </v-tooltip>
        <delete-cluster v-if="canDeleteShoots" :shootItem="shootItem" small content-class="red--text"></delete-cluster>
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
import ShootVersion from '@/components/ShootVersion/ShootVersion'
import RetryOperation from '@/components/RetryOperation'
import JournalLabels from '@/components/ShootJournals/JournalLabels'
import CopyBtn from '@/components/CopyBtn'
import SelfTerminationWarning from '@/components/SelfTerminationWarning'
import HibernationScheduleWarning from '@/components/ShootHibernation/HibernationScheduleWarning'
import DeleteCluster from '@/components/DeleteCluster'
import ShootSeedName from '@/components/ShootSeedName'
import forEach from 'lodash/forEach'
import includes from 'lodash/includes'
import {
  isTypeDelete,
  isShootHasNoHibernationScheduleWarning,
  getTimestampFormatted
} from '@/utils'
import { shootItem } from '@/mixins/shootItem'

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
    CopyBtn,
    ShootSeedName
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
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'lastUpdatedJournalByNameAndNamespace',
      'journalsLabels',
      'canGetSecrets',
      'canDeleteShoots'
    ]),
    headerVisible () {
      const headerVisible = {}
      forEach(this.visibleHeaders, (header) => {
        headerVisible[header.value] = true
      })
      return headerVisible
    },
    isInfoAvailable () {
      // operator not yet updated shoot resource
      if (this.shootLastOperation.type === undefined || this.shootLastOperation.state === undefined) {
        return false
      }
      return !this.isCreateOrDeleteInProcess
    },
    isCreateOrDeleteInProcess () {
      // create or delete in process
      if (includes(['Create', 'Delete'], this.shootLastOperation.type) && this.shootLastOperation.state === 'Processing') {
        return true
      }
      return false
    },
    isTypeDelete () {
      return isTypeDelete(this.shootLastOperation)
    },
    isClusterAccessDialogDisabled () {
      if (this.shootInfo.dashboardUrl) {
        return false
      }
      if (this.shootInfo.kubeconfig) {
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
    shootLastUpdatedJournalTimestamp () {
      return this.lastUpdatedJournalByNameAndNamespace(this.shootMetadata)
    },
    shootLastUpdatedJournal () {
      return getTimestampFormatted(this.shootLastUpdatedJournalTimestamp)
    },
    shootJournalsLabels () {
      return this.journalsLabels(this.shootMetadata)
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
