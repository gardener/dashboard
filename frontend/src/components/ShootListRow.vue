<!--
Copyright 2018 by The Gardener Authors.

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
        {{ projectName }}
    </td>
    <td class="nowrap" v-if="this.headerVisible['name']">
      <router-link class="cyan--text text--darken-2 subheading" :to="{ name: 'ShootItem', params: { name: rowData.name, namespace:rowData.namespace } }">
        {{ rowData.name }}
      </router-link>
    </td>
    <td class="nowrap" v-if="this.headerVisible['infrastructure']">
      <v-tooltip top>
        <div slot="activator">
          <infra-icon v-model="rowData.kind"></infra-icon>
          {{ rowData.region }}
        </div>
        <span>{{ rowData.kind }} [{{ rowData.region }}]</span>
      </v-tooltip>
    </td>
    <td class="nowrap" v-if="this.headerVisible['createdBy']">
      {{ rowData.createdBy }}
    </td>
    <td class="nowrap" v-if="this.headerVisible['createdAt']">
      <v-tooltip top>
        <div slot="activator">
          <time-ago :date-time="rowData.creationTimestamp"></time-ago>
        </div>
        {{ createdAt }}
      </v-tooltip>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['purpose']">
      <purpose-tag :purpose="getPurpose"></purpose-tag>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['lastOperation']">
      <shoot-status :operation="rowData.lastOperation" :lastError="rowData.lastError" :popperKey="rowData.name" :isHibernated="rowData.isHibernated"></shoot-status>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['k8sVersion']">
      <v-tooltip top>
        <v-btn slot="activator" class="update_btn" small round
          :to="{ name: 'ShootItem', params: { name: rowData.name, namespace:rowData.namespace } }"
          :outline="!k8sPatchAvailable"
          :dark="k8sPatchAvailable"
          color="cyan darken-2">
            <v-icon small v-if="rowData.availableK8sUpdates">arrow_drop_up</v-icon>
            {{rowData.k8sVersion}}
        </v-btn>
        <span v-if="k8sPatchAvailable">Kubernetes patch available</span>
        <span v-else-if="rowData.availableK8sUpdates">Kubernetes update available</span>
        <span v-else>Kubernetes version up to date</span>
      </v-tooltip>
    </td>
    <td class="nowrap text-xs-center" v-if="this.headerVisible['readiness']">
      <template v-for="tag in rowData.tags">
        <status-tag :tag="tag" :popper-key="`${rowData.name}_${tag.text}`"></status-tag>
      </template>
    </td>
    <td class="action-button-group text-xs-right" v-if="this.headerVisible['actions']">
      <div class="hidden-md-and-down">
        <v-tooltip top>
          <v-btn small icon class="green--text" slot="activator" :disabled="isDashboardDialogDisabled" @click.native.stop="showDialog('dashboard')">
            <v-icon>dashboard</v-icon>
          </v-btn>
          <span>Open Dashboard</span>
        </v-tooltip>
        <v-tooltip top>
          <v-btn small icon class="blue--text" slot="activator" :disabled="isKubeconfigDialogDisabled" @click.native.stop="showDialog('kubeconfig')">
            <v-icon>settings</v-icon>
          </v-btn>
          <span>Show Kubeconfig</span>
        </v-tooltip>
        <v-tooltip top>
          <v-btn small icon class="red--text" slot="activator" :disabled="isDeleteDialogDisabled" @click.native.stop="showDialog('delete')">
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
            <v-list-tile :disabled="isDashboardDialogDisabled" @click.native="showDialog('dashboard')">
              <v-list-tile-action>
                <v-icon class="green--text">dashboard</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>
                <v-list-tile-content>Open Dashboard</v-list-tile-content>
              </v-list-tile-title>
            </v-list-tile>
            <v-list-tile :disabled="isKubeconfigDialogDisabled" @click.native="showDialog('kubeconfig')">
              <v-list-tile-action>
                <v-icon class="blue--text">settings</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>
                <v-list-tile-content>Show Kubeconfig</v-list-tile-content>
              </v-list-tile-title>
            </v-list-tile>
            <v-list-tile :disabled="isDeleteDialogDisabled" @click.native="showDialog('delete')">
              <v-list-tile-action>
                <v-icon class="red--text">delete</v-icon>
              </v-list-tile-action>
              <v-list-tile-title>
                <v-list-tile-content>Delete Cluster</v-list-tile-content>
              </v-list-tile-title>
            </v-list-tile>
          </v-list>
        </v-menu>
      </div>
    </td>
  </tr>
</template>

<script>
  import InfraIcon from '@/components/InfrastructureIcon'
  import ShootStatus from '@/components/ShootStatus'
  import StatusTag from '@/components/StatusTag'
  import PurposeTag from '@/components/PurposeTag'
  import TimeAgo from '@/components/TimeAgo'
  import forEach from 'lodash/forEach'
  import replace from 'lodash/replace'
  import get from 'lodash/get'
  import includes from 'lodash/includes'
  import { getDateFormatted } from '@/utils'

  export default {
    components: {
      InfraIcon,
      StatusTag,
      PurposeTag,
      ShootStatus,
      TimeAgo
    },
    props: {
      rowData: {
        type: Object,
        required: true
      },
      visibleHeaders: {
        type: Array,
        required: true
      }
    },
    computed: {
      headerVisible () {
        const headerVisible = {}
        forEach(this.visibleHeaders, (header) => {
          headerVisible[header.value] = true
        })
        return headerVisible
      },
      projectName () {
        return replace(this.rowData.namespace, /^garden-/, '')
      },
      createdAt () {
        return getDateFormatted(this.rowData.creationTimestamp)
      },
      getPurpose () {
        // eslint-disable-next-line
        return get(this.rowData.metadata, ['annotations', 'garden.sapcloud.io/purpose'])
      },
      k8sPatchAvailable () {
        if (get(this.row, 'availableK8sUpdates.patch')) {
          return true
        }
        return false
      },
      isInfoAvailable () {
        const lastOperation = this.rowData.lastOperation || {}
        // operator not yet updated shoot resource
        if (lastOperation.type === undefined || lastOperation.state === undefined) {
          return false
        }
        return !this.isCreateOrDeleteInProcess
      },
      isCreateOrDeleteInProcess () {
        const lastOperation = this.rowData.lastOperation || {}
        // create or delete in process
        if (includes(['Create', 'Delete'], lastOperation.type) && lastOperation.state === 'Processing') {
          return true
        }
        return false
      },
      isDeleteDialogDisabled () {
        const annotations = this.rowData.annotations
        const confirmation = annotations['confirmation.garden.sapcloud.io/deletionTimestamp']
        return !!this.rowData.deletionTimestamp && this.rowData.deletionTimestamp === confirmation
      },
      isDashboardDialogDisabled () {
        const itemInfo = this.rowData.info || {}

        if (itemInfo.dashboardUrl) {
          return false
        }

        // disabled if info is NOT available
        return !this.isInfoAvailable
      },
      isKubeconfigDialogDisabled () {
        const itemInfo = this.rowData.info || {}

        if (itemInfo.kubeconfig) {
          return false
        }

        // disabled if info is NOT available
        return !this.isInfoAvailable
      }
    },
    methods: {
      showDialog: function (action) {
        const row = this.rowData
        this.$emit('showDialog', { action, row })
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

.update_btn {
  min-width: 0px;
}

.update_btn >>> i {
  margin-left: -8px;
}
</style>
