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
      <router-link class="cyan--text text--darken-2 subheading" :to="{ name: 'ShootList', params: { namespace:row.namespace } }">
        {{ projectName }}
      </router-link>
    </td>
    <td class="nowrap" v-if="this.headerVisible['name']">
      <router-link class="cyan--text text--darken-2 subheading" :to="{ name: 'ShootItem', params: { name: row.name, namespace:row.namespace } }">
        {{ row.name }}
      </router-link>
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
          <time-ago :date-time="row.creationTimestamp"></time-ago>
        </div>
        {{ createdAt }}
      </v-tooltip>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['purpose']">
      <purpose-tag :purpose="row.purpose"></purpose-tag>
    </td>
    <td class="text-xs-left" v-if="this.headerVisible['lastOperation']">
      <div>
        <shoot-status :operation="row.lastOperation" :lastError="row.lastError" :popperKey="row.name" :isHibernated="row.isHibernated" :canRetry="canRetry" :reconciliationDeactivated="reconciliationDeactivated" @retryOperation="onRetryOperation"></shoot-status>
      <template v-if="canRetry">
        <v-tooltip top>
          <v-btn small icon slot="activator" flat class="cyan--text text--darken-2 retryButton" @click="onRetryOperation">
            <v-icon>mdi-reload</v-icon>
          </v-btn>
          Retry Operation
        </v-tooltip>
      </template>
      </div>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['k8sVersion']">
      <shoot-version :k8sVersion="row.k8sVersion" :shootName="row.name" :shootNamespace="row.namespace" :availableK8sUpdates="row.availableK8sUpdates"></shoot-version>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['readiness']">
      <template v-for="tag in row.tags">
        <status-tag :tag="tag" :popper-key="`${row.name}_${tag.text}`"></status-tag>
      </template>
    </td>
    <td class="nowrap" v-if="this.headerVisible['journal']">
      <v-tooltip top>
        <div slot="activator">
          <router-link class="cyan--text text--darken-2" :to="{ name: 'ShootItem', params: { name: row.name, namespace:row.namespace } }">
            <time-ago :date-time="row.lastUpdatedJournalTimestamp"></time-ago>
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
          <span>Open Dashboard</span>
        </v-tooltip>
        <v-tooltip top>
          <v-btn small icon class="blue--text" slot="activator" :disabled="isKubeconfigDialogDisabled" @click="showDialog('kubeconfig')">
            <v-icon>settings</v-icon>
          </v-btn>
          <span>Show Kubeconfig</span>
        </v-tooltip>
        <v-tooltip top>
          <v-btn small icon class="red--text" slot="activator" :disabled="isDeleteDialogDisabled" @click="showDialog('delete')">
            <v-icon>delete</v-icon>
          </v-btn>
          <span>Delete Cluster</span>
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
              <v-list-tile-title>Open Dashboard</v-list-tile-title>
            </v-list-tile>
            <v-list-tile :disabled="isKubeconfigDialogDisabled" @click="showDialog('kubeconfig', isKubeconfigDialogDisabled)">
              <v-list-tile-action>
                <v-icon class="blue--text">settings</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>Show Kubeconfig</v-list-tile-title>
            </v-list-tile>
            <v-list-tile :disabled="isDeleteDialogDisabled" @click="showDialog('delete', isDeleteDialogDisabled)">
              <v-list-tile-action>
                <v-icon class="red--text">delete</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>Delete Cluster</v-list-tile-title>
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
  import StatusTag from '@/components/StatusTag'
  import PurposeTag from '@/components/PurposeTag'
  import TimeAgo from '@/components/TimeAgo'
  import ShootVersion from '@/components/ShootVersion'
  import JournalLabels from '@/components/JournalLabels'
  import forEach from 'lodash/forEach'
  import replace from 'lodash/replace'
  import get from 'lodash/get'
  import includes from 'lodash/includes'
  import { getTimestampFormatted, getCloudProviderKind, availableK8sUpdatesForShoot, getCreatedBy, isHibernated } from '@/utils'
  import { addAnnotation } from '@/utils/api'

  export default {
    components: {
      InfraIcon,
      StatusTag,
      PurposeTag,
      ShootStatus,
      TimeAgo,
      ShootVersion,
      JournalLabels
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
    data () {
      return {
        retryingOperation: false
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
          annotations: get(metadata, 'annotations', {}),
          deletionTimestamp: metadata.deletionTimestamp,
          lastOperation: get(status, 'lastOperation', {}),
          lastError: get(status, 'lastError'),
          tags: this.mapConditionsToStatusTags(get(status, 'conditions', {})),
          kind,
          region: get(spec, 'cloud.region'),
          isHibernated: isHibernated(spec),
          info,
          availableK8sUpdates: availableK8sUpdatesForShoot(spec),
          k8sVersion: get(spec, 'kubernetes.version'),
          // eslint-disable-next-line
          purpose:get(metadata, ['annotations', 'garden.sapcloud.io/purpose']),
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
      canRetry () {
        return this.row.lastOperation.state === 'Failed' &&
          !this.reconciliationDeactivated &&
          !this.retryingOperation &&
          !this.row.reconcileScheduled
      },
      reconciliationDeactivated () {
        // eslint-disable-next-line
        return get(this.row, ['annotations', 'shoot.garden.sapcloud.io/ignore']) === 'true'
      },
      isCreateOrDeleteInProcess () {
        // create or delete in process
        if (includes(['Create', 'Delete'], this.row.lastOperation.type) && this.row.lastOperation.state === 'Processing') {
          return true
        }
        return false
      },
      isDeleteDialogDisabled () {
        // eslint-disable-next-line
        const confirmation = get(this.row, ['annotations', 'confirmation.garden.sapcloud.io/deletionTimestamp'])
        return !!this.row.deletionTimestamp && this.row.deletionTimestamp === confirmation
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
      }
    },
    methods: {
      showDialog: function (action, disabled = false) {
        if (disabled !== true) {
          // disabled check required as v-list-tile disabled=true does not prevent click action
          const shootItem = this.shootItem
          this.$emit('showDialog', { action, shootItem })
        }
      },
      mapConditionsToStatusTags (conditions) {
        if (!conditions || !conditions.length) {
          return []
        }
        return conditions
          .filter(condition => !!condition.lastTransitionTime)
          .map(({lastTransitionTime, message, status, type}) => {
            const id = type
            let text = replace(type, /([a-z])([A-Z])/g, '$1 $2')
            switch (type) {
              case 'ControlPlaneHealthy':
                text = 'Control Plane'
                break
              case 'SystemComponentsHealthy':
                text = 'System Components'
                break
              case 'EveryNodeReady':
                text = 'Nodes'
                break
            }
            return {id, text, message, lastTransitionTime, status}
          })
      },
      onRetryOperation () {
        this.retryingOperation = true

        const user = this.$store.state.user
        const namespace = this.row.namespace
        const name = this.row.name

        const retryAnnotation = {'shoot.garden.sapcloud.io/operation': 'retry'}
        return addAnnotation({namespace, name, user, data: retryAnnotation})
        .then(() => {
          console.log('success')

          this.retryingOperation = false
        })
        .catch(err => {
          console.log('failed to retry operation', err)

          this.retryingOperation = false
          this.$store.dispatch('setError', err)
        })
      }
    }
  }
</script>
<style lang="styl" scoped>

  .retryButton {
    margin: 0px;
  }

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