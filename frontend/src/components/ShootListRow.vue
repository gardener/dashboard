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
  <tr>
    <td class="nowrap" v-if="this.headerVisible['project']">
      <router-link class="cyan--text text--darken-2" :to="{ name: 'ShootList', params: { namespace:row.namespace } }">
        {{ projectName }}
      </router-link>
    </td>
    <td class="nowrap" v-if="this.headerVisible['name']">
      <router-link class="cyan--text text--darken-2" :to="{ name: 'ShootItem', params: { name: row.name, namespace:row.namespace } }">
        {{ row.name }}
      </router-link>
      <self-termination-warning :expirationTimestamp="row.expirationTimestamp"></self-termination-warning>
    </td>
    <td class="nowrap" v-if="this.headerVisible['infrastructure']">
      <v-tooltip top>
        <div slot="activator">
          <infra-icon v-model="row.kind"></infra-icon>
          {{ row.region }}
        </div>
        <span>{{ row.kind }} [{{ row.region }}]</span>
      </v-tooltip>
    </td>
    <td class="nowrap" v-if="this.headerVisible['createdBy']">
      {{ row.createdBy }}
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
      <shoot-version :k8sVersion="row.k8sVersion" :shootName="row.name" :shootNamespace="row.namespace" :availableK8sUpdates="row.availableK8sUpdates"></shoot-version>
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
    <td class="action-button-group text-xs-right" v-if="this.headerVisible['actions']">
      <div class="hidden-md-and-down">
        <v-tooltip top>
          <v-btn small icon class="green--text" slot="activator" :disabled="isDashboardDialogDisabled" @click="showDialog('dashboard')">
            <v-icon>dashboard</v-icon>
          </v-btn>
          <span>{{showDashboardActionTitle}}</span>
        </v-tooltip>
        <v-tooltip top>
          <v-btn small icon class="blue--text" slot="activator" :disabled="isKubeconfigDialogDisabled" @click="showDialog('kubeconfig')">
            <v-icon>settings</v-icon>
          </v-btn>
          <span>{{showKubeconfigActionTitle}}</span>
        </v-tooltip>
        <v-tooltip top>
          <v-btn small icon class="red--text" slot="activator" :disabled="isShootMarkedForDeletion" @click="showDialog('delete')">
            <v-icon>delete</v-icon>
          </v-btn>
          <span>{{deleteClusterActionTitle}}</span>
        </v-tooltip>
      </div>
      <div class="hidden-lg-and-up">
        <v-menu left origin="center center" transition="scale-transition">
          <v-btn icon slot="activator">
            <v-icon>more_vert</v-icon>
          </v-btn>
          <v-list>
            <v-list-tile :disabled="isDashboardDialogDisabled" @click="showDialog('dashboard', isDashboardDialogDisabled)">
              <v-list-tile-action>
                <v-icon class="green--text">dashboard</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>{{showDashboardActionTitle}}</v-list-tile-title>
            </v-list-tile>
            <v-list-tile :disabled="isKubeconfigDialogDisabled" @click="showDialog('kubeconfig', isKubeconfigDialogDisabled)">
              <v-list-tile-action>
                <v-icon class="blue--text">settings</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>{{showKubeconfigActionTitle}}</v-list-tile-title>
            </v-list-tile>
            <v-list-tile :disabled="isShootMarkedForDeletion" @click="showDialog('delete', isShootMarkedForDeletion)">
              <v-list-tile-action>
                <v-icon class="red--text">delete</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>{{deleteClusterActionTitle}}</v-list-tile-title>
            </v-list-tile>
          </v-list>
        </v-menu>
      </div>
    </td>
  </tr>
</template>

<script>
import { mapGetters } from 'vuex'
import InfraIcon from '@/components/InfrastructureIcon'
import ShootStatus from '@/components/ShootStatus'
import StatusTags from '@/components/StatusTags'
import PurposeTag from '@/components/PurposeTag'
import TimeString from '@/components/TimeString'
import ShootVersion from '@/components/ShootVersion'
import RetryOperation from '@/components/RetryOperation'
import JournalLabels from '@/components/JournalLabels'
import SelfTerminationWarning from '@/components/SelfTerminationWarning'
import forEach from 'lodash/forEach'
import replace from 'lodash/replace'
import get from 'lodash/get'
import includes from 'lodash/includes'
import { getTimestampFormatted,
  getCloudProviderKind,
  availableK8sUpdatesForShoot,
  getCreatedBy,
  isHibernated,
  isReconciliationDeactivated,
  isShootMarkedForDeletion,
  isTypeDelete } from '@/utils'

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
    SelfTerminationWarning
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
        createdBy: getCreatedBy(metadata),
        creationTimestamp: metadata.creationTimestamp,
        // eslint-disable-next-line lodash/path-style
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
        availableK8sUpdates: availableK8sUpdatesForShoot(spec),
        k8sVersion: get(spec, 'kubernetes.version'),
        // eslint-disable-next-line lodash/path-style
        purpose: get(metadata, ['annotations', 'garden.sapcloud.io/purpose']),
        lastUpdatedJournalTimestamp: this.lastUpdatedJournalByNameAndNamespace(this.shootItem.metadata),
        journalsLabels: this.journalsLabels(this.shootItem.metadata),
        // setting the retry annotation internally will increment "metadata.generation". If the values differ, a reconcile will be scheduled
        reconcileScheduled: get(metadata, 'generation') !== get(status, 'observedGeneration')
      }
    },
    headerVisible () {
      const headerVisible = {}
      forEach(this.visibleHeaders, (header) => {
        headerVisible[header.value] = true
      })
      return headerVisible
    },
    projectName () {
      return replace(this.row.namespace, /^garden-/, '')
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
    isDashboardDialogDisabled () {
      const itemInfo = this.row.info || {}

      if (itemInfo.dashboardUrl) {
        return false
      }

      // disabled if info is NOT available
      return !this.isInfoAvailable
    },
    isKubeconfigDialogDisabled () {
      const itemInfo = this.row.info || {}

      if (itemInfo.kubeconfig) {
        return false
      }

      // disabled if info is NOT available
      return !this.isInfoAvailable
    },
    showDashboardActionTitle () {
      return this.isDashboardDialogDisabled
        ? 'Dashboard not avialable'
        : 'Show Dashboard'
    },
    showKubeconfigActionTitle () {
      return this.isKubeconfigDialogDisabled
        ? 'Kubeconfig not available'
        : 'Show Kubeconfig'
    },
    deleteClusterActionTitle () {
      return this.isShootMarkedForDeletion
        ? 'Cluster already marked for deletion'
        : 'Delete Cluster'
    }
  },
  methods: {
    showDialog: function (action, disabled = false) {
      if (disabled !== true) {
        // disabled check required as v-list-tile disabled=true does not prevent click action
        const shootItem = this.shootItem
        this.$emit('showDialog', { action, shootItem })
      }
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
