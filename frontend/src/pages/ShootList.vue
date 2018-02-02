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
  <v-container fluid class="shootlist">
    <v-card class="mr-extra">
      <v-toolbar card height="70" color="cyan darken-2">
        <img src="../assets/certified_kubernetes_white.svg" height="60" class="pl-1">
        <v-toolbar-title class="white--text">
          <div class="headline">Kubernetes Clusters</div>
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="rows.length > 3"
          prepend-icon="search"
          color="cyan darken-2"
          label="Search"
          clearable
          solo
          v-model="search"
          @keyup.esc="search=''"
        ></v-text-field>
        <v-menu :nudge-bottom="20" :nudge-right="20" left v-model="tableSortMenu" absolute full-width>
          <div slot="activator">
            <v-tooltip open-delay="500" top>
              <v-btn slot="activator" icon>
                <v-icon class="cursor-pointer" color="white">more_vert</v-icon>
              </v-btn>
              Table Options
            </v-tooltip>
          </div>
          <v-list dense>
            <v-subheader>Column Selection</v-subheader>
            <v-list-tile v-for="item in allHeaders" :key="item.text" @click.native.stop @click="setColumnChecked(item)">
              <v-list-tile-action>
                <v-checkbox v-model="item.checked" color="cyan darken-2" @click></v-checkbox>
              </v-list-tile-action>
              <v-list-tile-sub-title>{{ item.text }}</v-list-tile-sub-title>
            </v-list-tile>
            <v-tooltip top>
              <v-list-tile-action slot="activator">
                <v-btn block flat class="text-xs-center cyan--text text--darken-2" @click.native.stop @click="resetColumnsChecked">
                  Reset
                </v-btn>
              </v-list-tile-action>
              <span>Reset to Defaults</span>
            </v-tooltip>
          </v-list>
        </v-menu>
      </v-toolbar>
      <v-data-table class="shootListTable" :headers="headers" :items="rows" :search="search" :custom-sort="sortTable" :pagination.sync="pagination" hide-actions must-sort>
        <template slot="items" slot-scope="props">
          <td class="nowrap" v-show="columnVisible('name')">
            <router-link class="cyan--text text--darken-2 subheading" :to="{ name: 'ShootItem', params: { name: props.item.name, namespace:props.item.namespace } }">
              {{ props.item.name }}
            </router-link>
          </td>
          <td class="nowrap" v-show="columnVisible('infrastructure')">
            <v-tooltip top>
              <div slot="activator">
                <infra-icon v-model="props.item.kind"></infra-icon>
                {{ props.item.infrastructureRegion }}
              </div>
              <span>{{ props.item.infrastructure }} [{{ props.item.infrastructureRegion }}]</span>
            </v-tooltip>
          </td>
          <td class="nowrap" v-show="columnVisible('createdBy')">
            {{ props.item.createdBy }}
          </td>
          <td class="nowrap" v-show="columnVisible('createdAt')">
            <v-tooltip top>
              <div slot="activator">
                {{ createdAt(props.item) }}
              </div>
              {{ createdTimeAgo(props.item) }}
            </v-tooltip>
          </td>
          <td class="nowrap text-xs-center" v-show="columnVisible('purpose')">
            <purpose-tag :purpose="getPurpose(props.item)"></purpose-tag>
          </td>
          <td class="nowrap text-xs-center" v-show="columnVisible('lastOperation')">
            <shoot-status :operation="props.item.lastOperation" :lastError="props.item.lastError" :popperKey="props.item.name"></shoot-status>
          </td>
          <td class="nowrap text-xs-center" v-show="columnVisible('readiness')">
            <template v-for="tag in props.item.tags">
              <status-tag :tag="tag" :popper-key="`${props.item.name}_${tag.text}`"></status-tag>
            </template>
          </td>
          <td class="action-button-group text-xs-right" v-show="columnVisible('actions')">
            <div class="hidden-md-and-down">
              <v-tooltip top>
                <v-btn small icon class="green--text" slot="activator" :disabled="isDashboardDialogDisabled(props.item)" @click.native.stop="showDashboardDialog(props.item)">
                  <v-icon>dashboard</v-icon>
                </v-btn>
                <span>Open Dashboard</span>
              </v-tooltip>
              <v-tooltip top>
                <v-btn small icon class="blue--text" slot="activator" :disabled="isKubeconfigDialogDisabled(props.item)" @click.native.stop="showKubeconfigDialog(props.item)">
                  <v-icon>settings</v-icon>
                </v-btn>
                <span>Show Kubeconfig</span>
              </v-tooltip>
              <v-tooltip top>
                <v-btn small icon class="red--text" slot="activator" :disabled="isDeleteDialogDisabled(props.item)" @click.native.stop="showDeleteDialog(props.item)">
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
                  <v-list-tile :disabled="isDashboardDialogDisabled(props.item)" @click.native="showDashboardDialog(props.item)">
                    <v-list-tile-action>
                      <v-icon class="green--text">dashboard</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-title>
                      <v-list-tile-content>Open Dashboard</v-list-tile-content>
                    </v-list-tile-title>
                  </v-list-tile>
                  <v-list-tile @click.native="showKubeconfigDialog(props.item)">
                    <v-list-tile-action>
                      <v-icon class="blue--text">settings</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-title>
                      <v-list-tile-content>Show Kubeconfig</v-list-tile-content>
                    </v-list-tile-title>
                  </v-list-tile>
                  <v-list-tile :disabled="isDeleteDialogDisabled(props.item)" @click.native="showDeleteDialog(props.item)">
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
        </template>
      </v-data-table>
      <v-dialog v-model="kubeconfigDialog" persistent max-width="67%">
        <v-card>
          <v-card-title class="teal darken-1 grey--text text--lighten-4">
            <div class="headline">Kubeconfig <code class="cluster_name">{{currentName}}</code></div>
            <v-spacer></v-spacer>
            <v-btn icon class="grey--text text--lighten-4" @click.native="hideDialog()">
              <v-icon>close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <code-block lang="yaml" :content="currentKubeconfig"></code-block>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog v-model="dashboardDialog" max-width="600">
        <v-card>
          <v-card-title class="teal darken-1 grey--text text--lighten-4">
            <div class="headline">Kube-Cluster Access <code class="cluster_name">{{currentName}}</code></div>
            <v-spacer></v-spacer>
            <v-btn icon class="grey--text text--lighten-4" @click.native="hideDialog()">
              <v-icon>close</v-icon>
            </v-btn>
          </v-card-title>
          <cluster-access :info="currentInfo"></cluster-access>
        </v-card>
      </v-dialog>
      <confirm-input-dialog :confirm="currentName" v-model="deleteDialog" :cancel="hideDialog" :ok="deletionConfirmed">
        <template slot="caption">Delete Cluster <code>{{currentName}}</code></template>
        <template slot="message">
          <v-list>
            <v-list-tile-content>
              <v-list-tile-sub-title>
                Created By
              </v-list-tile-sub-title>
              <v-list-tile-title>
                {{currentCreatedBy}}
              </v-list-tile-title>
            </v-list-tile-content>
          </v-list>
          <br />
          Type <b>{{currentName}}</b> below and confirm the deletion of the cluster and all of its content?
          <br/>
          <i class="red--text text--darken-2">This action cannot be undone.</i>
        </template>
      </confirm-input-dialog>
      <create-cluster v-model="createDialog" @close="hideDialog"></create-cluster>
    </v-card>
    <v-fab-transition>
      <v-btn class="cyan darken-2" dark fab fixed bottom right v-show="floatingButton" @click.native.stop="showCreateDialog()">
        <v-icon dark ref="add">add</v-icon>
      </v-btn>
    </v-fab-transition>
  </v-container>
</template>

<script>
  import { mapGetters, mapActions } from 'vuex'
  import replace from 'lodash/replace'
  import includes from 'lodash/includes'
  import find from 'lodash/find'
  import zipObject from 'lodash/zipObject'
  import map from 'lodash/map'
  import get from 'lodash/get'
  import InfraIcon from '@/components/InfrastructureIcon'
  import CodeBlock from '@/components/CodeBlock'
  import GPopper from '@/components/GPopper'
  import StatusTag from '@/components/StatusTag'
  import PurposeTag from '@/components/PurposeTag'
  import ShootStatus from '@/components/ShootStatus'
  import CreateCluster from '@/dialogs/CreateCluster'
  import ConfirmInputDialog from '@/dialogs/ConfirmInputDialog'
  import ClusterAccess from '@/components/ClusterAccess'
  import { getDateFormatted, getTimeAgo } from '@/utils'

  export default {
    name: 'shoot-list',
    components: {
      CodeBlock,
      CreateCluster,
      GPopper,
      StatusTag,
      PurposeTag,
      ConfirmInputDialog,
      ClusterAccess,
      InfraIcon,
      ShootStatus
    },
    data () {
      return {
        floatingButton: false,
        search: '',
        allHeaders: [
          { text: 'NAME', value: 'name', align: 'left', checked: true },
          { text: 'INFRASTRUCTURE', value: 'infrastructure', align: 'left', checked: true },
          { text: 'CREATED BY', value: 'createdBy', align: 'left', checked: false },
          { text: 'CREATED AT', value: 'createdAt', align: 'left', checked: false },
          { text: 'PURPOSE', value: 'purpose', align: 'center', checked: false },
          { text: 'STATUS', value: 'lastOperation', align: 'center', checked: true },
          { text: 'READINESS', value: 'readiness', sortable: false, align: 'center', checked: true },
          { text: 'ACTIONS', value: 'actions', sortable: false, align: 'right', checked: true }
        ],
        dialog: null,
        tableSortMenu: false,
        pagination: this.$localStorage.getObject('dataTable_sortBy') || { rowsPerPage: Number.MAX_SAFE_INTEGER }
      }
    },
    methods: {
      ...mapActions([
        'deleteShoot',
        'setSelectedShoot'
      ]),
      showKubeconfigDialog (row) {
        this.setSelectedShoot(row)
          .then(() => this.showDialog('kubeconfig'))
      },
      showDashboardDialog (row) {
        this.setSelectedShoot(row)
          .then(() => {
            this.showDialog('dashboard')
          })
      },
      isDashboardDialogDisabled (row) {
        const item = this.item(row) || {}
        const itemInfo = item.info || {}

        if (itemInfo.dashboardUrl) {
          return false
        }

        // disabled if info is NOT available
        return !this.isInfoAvailable(row)
      },
      isKubeconfigDialogDisabled (row) {
        const item = this.item(row) || {}
        const itemInfo = item.info || {}

        if (itemInfo.kubeconfig) {
          return false
        }

        // disabled if info is NOT available
        return !this.isInfoAvailable(row)
      },
      isInfoAvailable (row) {
        const lastOperation = row.lastOperation || {}
        // operator not yet updated shoot resource
        if (lastOperation.type === undefined || lastOperation.state === undefined) {
          return false
        }
        return !this.isCreateOrDeleteInProcess(row)
      },
      isCreateOrDeleteInProcess (row) {
        const lastOperation = row.lastOperation || {}
        // create or delete in process
        if (includes(['Create', 'Delete'], lastOperation.type) && lastOperation.state === 'Processing') {
          return true
        }
        return false
      },
      showDeleteDialog (row) {
        this.setSelectedShoot(row)
          .then(() => this.showDialog('delete'))
      },
      isDeleteDialogDisabled (row) {
        const annotations = row.annotations
        const confirmation = annotations['confirmation.garden.sapcloud.io/deletionTimestamp']
        return !!row.deletionTimestamp && row.deletionTimestamp === confirmation
      },
      showCreateDialog () {
        this.showDialog('create')
      },
      deletionConfirmed () {
        this.deleteShoot(this.currentName)
          .catch((err) => console.error('Delete shoot failed with error:', err))
          .then(() => this.hideDialog())
      },
      showDialog (action) {
        this.dialog = action
      },
      hideDialog () {
        this.dialog = null
        this.setSelectedShoot(null)
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
      columnVisible (headerVal) {
        const predicate = item => item.value === headerVal && item.checked === true
        return find(this.allHeaders, predicate)
      },
      getPurpose (row) {
        const annotations = row.annotations || {}
        return annotations['garden.sapcloud.io/purpose']
      },
      getCreatedBy (row) {
        const annotations = row.annotations || {}
        return annotations['garden.sapcloud.io/createdBy'] || '-unknown-'
      },
      getSortVal (row, column) {
        switch (column) {
          case 'purpose':
            switch (this.getPurpose(row)) {
              case 'production':
                return 0
              case 'development':
                return 1
              case 'evaluation':
                return 2
              default:
                return 3
            }
          case 'lastOperation':
            const operation = row.lastOperation
            const inProgress = operation.progress !== 100 && operation.state !== 'Failed' && !!operation.progress
            const isError = operation.state === 'Failed' || row.lastError
            if (isError && !inProgress) {
              return 0
            } else if (isError && inProgress) {
              return 1
            } else if (inProgress) {
              return 2
            }
            return 3
          case 'createdAt':
            return row.creationTimestamp
          default:
            return row[column]
        }
      },
      sortTable (rows, column, desc) {
        this.$localStorage.setObject('dataTable_sortBy', {sortBy: this.pagination.sortBy, descending: this.pagination.descending, rowsPerPage: Number.MAX_SAFE_INTEGER})

        return rows.sort((a, b) => {
          let comp = 0
          const sortValA = this.getSortVal(a, column)
          const sortValB = this.getSortVal(b, column)
          if (sortValA > sortValB) {
            comp = 1
          } else if (sortValB > sortValA) {
            comp = -1
          }
          return comp * (desc ? -1 : 1)
        })
      },
      createdAt (row) {
        return getDateFormatted(row.creationTimestamp)
      },
      createdTimeAgo (row) {
        return getTimeAgo(row.creationTimestamp)
      },
      setColumnChecked (header) {
        header.checked = !header.checked
        this.saveColumnsChecked()
      },
      saveColumnsChecked () {
        const keys = map(this.allHeaders, 'value')
        const checkedValues = map(this.allHeaders, 'checked')
        const checkedColumns = zipObject(keys, checkedValues)

        this.$localStorage.setObject('dataTable_checkedColumns', checkedColumns)
      },
      resetColumnsChecked () {
        for (const header of this.allHeaders) {
          header.checked = header.checkedDefault
        }
        this.saveColumnsChecked()

        this.pagination.sortBy = 'name'
        this.pagination.descending = false
      },
      loadColumnsChecked () {
        const checkedColumns = this.$localStorage.getObject('dataTable_checkedColumns') || {}
        for (const header of this.allHeaders) {
          header.checkedDefault = header.checked
          header.checked = get(checkedColumns, header.value, header.checked)
        }
      }
    },
    computed: {
      ...mapGetters({
        items: 'shootList',
        item: 'shootByNamespaceAndName',
        selectedItem: 'selectedShoot'
      }),
      createDialog: {
        get () {
          return this.dialog === 'create'
        },
        set (value) {
          if (!value) {
            this.dialog = null
          }
        }
      },
      deleteDialog: {
        get () {
          return this.dialog === 'delete'
        },
        set (value) {
          if (!value) {
            this.dialog = null
          }
        }
      },
      kubeconfigDialog: {
        get () {
          return this.dialog === 'kubeconfig'
        },
        set (value) {
          if (!value) {
            this.dialog = null
          }
        }
      },
      dashboardDialog: {
        get () {
          return this.dialog === 'dashboard'
        },
        set (value) {
          if (!value) {
            this.dialog = null
          }
        }
      },
      currentItem () {
        return this.selectedItem || {}
      },
      currentMetadata () {
        return this.currentItem.metadata || {}
      },
      currentStatus () {
        return this.currentItem.status || {}
      },
      currentOperation () {
        return this.currentStatus.lastOperation || {}
      },
      currentName () {
        return this.currentMetadata.name || ''
      },
      currentCreatedBy () {
        return this.getCreatedBy(this.currentMetadata)
      },
      currentInfo () {
        return this.currentItem.info || {}
      },
      currentKubeconfig () {
        return this.currentInfo.kubeconfig || ''
      },
      currentLog () {
        return this.currentOperation.description || ''
      },
      rows () {
        return this.items.map(({ metadata, spec, status }) => {
          status = status || {}
          return {
            name: metadata.name,
            createdBy: this.getCreatedBy(metadata),
            creationTimestamp: metadata.creationTimestamp,
            namespace: metadata.namespace,
            annotations: metadata.annotations || {},
            deletionTimestamp: metadata.deletionTimestamp,
            lastOperation: status.lastOperation || {},
            lastError: status.lastError || undefined,
            tags: this.mapConditionsToStatusTags(status.conditions),
            kind: spec.infrastructure.kind,
            infrastructure: `${spec.infrastructure.kind}`,
            infrastructureRegion: `${spec.infrastructure.region}`
          }
        })
      },
      headers () {
        return this.allHeaders.filter(e => e.checked === true)
      }
    },
    mounted () {
      this.floatingButton = true
      this.loadColumnsChecked()
    }
  }
</script>
<style lang="styl" scoped >
  @import '../stylus/main'

  .action-button-group {
    white-space: nowrap;

    button[type=button] {
      margin: 0 4px;
    }

  }

  .nowrap {
    white-space: nowrap;
  }

  .dashboard {
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .cluster_name {
    color: rgb(0, 137, 123);
  }

  .shootListTable >>> table.table {
    thead, tbody {
      th, td {
        padding: 10px;
      }
    }
  }

  .shootListTable >>> table {
    tbody, thead {
      td:first-child, th:first-child {
        padding-left: 24px;
      }
      td:last-child, th:last-child {
        padding-right: 24px;
      }
    }
  }


</style>
