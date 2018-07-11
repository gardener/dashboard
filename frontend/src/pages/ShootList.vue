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
  <v-container fluid class="shootlist">
    <v-card class="mr-extra">
      <v-toolbar card height="70" color="cyan darken-2">
        <img src="../assets/certified_kubernetes_white.svg" height="60" class="pl-1">
        <v-toolbar-title class="white--text">
          <div class="headline">Kubernetes Clusters</div>
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="search || items.length > 3"
          prepend-icon="search"
          color="cyan darken-2"
          label="Search"
          clearable
          solo
          v-model="search"
          @keyup.esc="search=''"
        ></v-text-field>
        <v-menu :nudge-bottom="20" :nudge-right="20" left v-model="tableMenu" absolute full-width>
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
            <v-list-tile v-for="item in headers" :key="item.text" @click.native.stop @click="setColumnChecked(item)">
              <v-list-tile-action>
                <v-checkbox v-model="item.checked" color="cyan darken-2" readonly @click.native.stop @click="setColumnChecked(item)"></v-checkbox>
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
            <v-subheader v-if="!projectScope">Filter Table</v-subheader>
            <v-list-tile v-if="!projectScope" @click.native.stop @click="showOnlyShootsWithIssues=!showOnlyShootsWithIssues">
              <v-list-tile-action>
                <v-checkbox v-model="showOnlyShootsWithIssues" color="cyan darken-2" readonly @click.native.stop @click="showOnlyShootsWithIssues=!showOnlyShootsWithIssues"></v-checkbox>
              </v-list-tile-action>
              <v-list-tile-sub-title color="red">Show only clusters with issues</v-list-tile-sub-title>
            </v-list-tile>
            <v-list-tile v-if="!projectScope && isAdmin" @click.native.stop @click="toggleHideUserIssues" :class="hideUserIssuesAndHideDeactivatedReconciliationClass">
              <v-list-tile-action>
                <v-checkbox
                  :disabled="isHideUserIssuesAndHideDeactedReconciliationDisabled"
                  v-model="hideUserIssues"
                  color="cyan darken-2"
                  readonly @click.native.stop
                  @click="toggleHideUserIssues"></v-checkbox>
              </v-list-tile-action>
              <v-list-tile-sub-title :disabled="!showOnlyShootsWithIssues">Hide user issues</v-list-tile-sub-title>
            </v-list-tile>
            <v-list-tile v-if="!projectScope && isAdmin" @click.native.stop @click="toggleHideDeactivatedReconciliation" :class="hideUserIssuesAndHideDeactivatedReconciliationClass">
              <v-list-tile-action>
                <v-checkbox
                :disabled="isHideUserIssuesAndHideDeactedReconciliationDisabled"
                v-model="hideDeactivatedReconciliation"
                color="cyan darken-2"
                readonly
                @click.native.stop
                @click="toggleHideDeactivatedReconciliation"></v-checkbox>
              </v-list-tile-action>
              <v-list-tile-sub-title :disabled="!showOnlyShootsWithIssues">Hide clusters with deactivated reconciliation</v-list-tile-sub-title>
            </v-list-tile>
          </v-list>
        </v-menu>
      </v-toolbar>
      <v-alert type="info" :value="!projectScope && showOnlyShootsWithIssues" outline>
        <span>Currently only showing clusters with issues</span><span v-if="isHideUserIssues">. User errors are excluded</span><span v-if="isHideDeactivatedReconciliation">. Clusters with deactivated reconciliation are excluded</span>
      </v-alert>
      <v-data-table class="shootListTable" :headers="visibleHeaders" :items="items" :search="search" :pagination.sync="pagination" :total-items="items.length" hide-actions must-sort :loading="shootsLoading">
        <template slot="items" slot-scope="props">
          <shoot-list-row :shootItem="props.item" :visibleHeaders="visibleHeaders" @showDialog="showDialog" :key="props.item.metadata.uid"></shoot-list-row>
        </template>
      </v-data-table>
      <v-dialog v-model="kubeconfigDialog" persistent max-width="67%">
        <v-card>
          <v-card-title class="teal darken-1 grey--text text--lighten-4">
            <div class="headline">Kubeconfig <code class="cluster_name">{{currentName}}</code></div>
            <v-spacer></v-spacer>
            <v-btn icon class="grey--text text--lighten-4" @click.native="hideDialog">
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
            <v-btn icon class="grey--text text--lighten-4" @click.native="hideDialog">
              <v-icon>close</v-icon>
            </v-btn>
          </v-card-title>
          <cluster-access ref="clusterAccess" :info="currentInfo"></cluster-access>
        </v-card>
      </v-dialog>
      <confirm-dialog
        :confirm="currentName"
        v-model="deleteDialog"
        :cancel="hideDialog"
        :ok="deletionConfirmed"
        :errorMessage.sync="deleteErrorMessage"
        :detailedErrorMessage.sync="deleteDetailedErrorMessage"
        >
        <template slot="caption">Delete Cluster</template>
        <template slot="affectedObjectName">{{currentName}}</template>
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
          Type <b>{{currentName}}</b> below and confirm the deletion of the cluster and all of its content.
          <br/>
          <i class="red--text text--darken-2">This action cannot be undone.</i>
        </template>
      </confirm-dialog>
      <create-cluster v-if="projectScope" v-model="createDialog" @close="hideDialog"></create-cluster>
    </v-card>
    <v-fab-transition>
      <v-btn v-if="projectScope" class="cyan darken-2" dark fab fixed bottom right v-show="floatingButton" @click.native.stop="showDialog({action: 'create'})">
        <v-icon dark ref="add">add</v-icon>
      </v-btn>
    </v-fab-transition>
  </v-container>
</template>

<script>
  import { mapGetters, mapActions, mapState } from 'vuex'
  import find from 'lodash/find'
  import zipObject from 'lodash/zipObject'
  import map from 'lodash/map'
  import get from 'lodash/get'
  import CodeBlock from '@/components/CodeBlock'
  import GPopper from '@/components/GPopper'
  import ShootListRow from '@/components/ShootListRow'
  import CreateCluster from '@/dialogs/CreateCluster'
  import ConfirmDialog from '@/dialogs/ConfirmDialog'
  import ClusterAccess from '@/components/ClusterAccess'
  import { getCreatedBy } from '@/utils'

  export default {
    name: 'shoot-list',
    components: {
      CodeBlock,
      CreateCluster,
      GPopper,
      ShootListRow,
      ConfirmDialog,
      ClusterAccess
    },
    data () {
      return {
        floatingButton: false,
        search: '',
        allHeaders: [
          { text: 'PROJECT', value: 'project', align: 'left', checked: false, defaultChecked: true, hidden: false },
          { text: 'NAME', value: 'name', align: 'left', checked: false, defaultChecked: true, hidden: false },
          { text: 'INFRASTRUCTURE', value: 'infrastructure', align: 'left', checked: false, defaultChecked: true, hidden: false },
          { text: 'CREATED BY', value: 'createdBy', align: 'left', checked: false, defaultChecked: false, hidden: false },
          { text: 'CREATED AT', value: 'createdAt', align: 'left', checked: false, defaultChecked: false, hidden: false },
          { text: 'PURPOSE', value: 'purpose', align: 'center', checked: false, defaultChecked: false, hidden: false },
          { text: 'STATUS', value: 'lastOperation', align: 'left', checked: false, defaultChecked: true, hidden: false },
          { text: 'VERSION', value: 'k8sVersion', align: 'center', checked: false, defaultChecked: false, hidden: false },
          { text: 'READINESS', value: 'readiness', sortable: false, align: 'center', checked: false, defaultChecked: true, hidden: false },
          { text: 'JOURNAL', value: 'journal', sortable: false, align: 'left', checked: false, defaultChecked: false, hidden: false, adminOnly: true },
          { text: 'JOURNAL LABELS', value: 'journalLabels', sortable: false, align: 'left', checked: false, defaultChecked: true, hidden: false, adminOnly: true },
          { text: 'ACTIONS', value: 'actions', sortable: false, align: 'right', checked: false, defaultChecked: true, hidden: false }
        ],
        dialog: null,
        tableMenu: false,
        pagination: this.$localStorage.getObject('dataTable_sortBy') || { rowsPerPage: Number.MAX_SAFE_INTEGER },
        deleteErrorMessage: null,
        deleteDetailedErrorMessage: null,
        cachedItems: null
      }
    },
    watch: {
      pagination (value) {
        if (value) {
          this.$localStorage.setObject('dataTable_sortBy', {sortBy: value.sortBy, descending: value.descending, rowsPerPage: Number.MAX_SAFE_INTEGER})
          this.setShootListSortParams(value)
        }
      },
      search (value) {
        this.setShootListSearchValue(value)
      }
    },
    methods: {
      ...mapActions([
        'deleteShoot',
        'setSelectedShoot',
        'setShootListSortParams',
        'setShootListSearchValue',
        'setOnlyShootsWithIssues',
        'setHideUserIssues',
        'setHideDeactivatedReconciliation'
      ]),
      deletionConfirmed () {
        this.deleteShoot({name: this.currentName, namespace: this.currentNamespace})
          .then(() => this.hideDialog())
          .catch((err) => {
            this.deleteErrorMessage = 'Delete shoot failed'
            this.deleteDetailedErrorMessage = err.message
            console.error('Delete shoot failed with error:', err)
          })
      },
      showDialog (args) {
        switch (args.action) {
          case 'kubeconfig':
          case 'dashboard':
          case 'delete':
            this.setSelectedShoot(args.shootItem.metadata)
              .then(() => {
                this.dialog = args.action
              })
            break
          case 'create':
            this.dialog = args.action
        }
      },
      hideDialog () {
        switch (this.dialog) {
          case 'dashboard':
            this.$refs.clusterAccess.reset()
            break
          case 'delete':
            this.deleteErrorMessage = null
            this.deleteDetailedErrorMessage = null
        }
        this.dialog = null
        this.setSelectedShoot(null)
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
          header.checked = header.defaultChecked
        }
        this.saveColumnsChecked()

        this.pagination.sortBy = 'name'
        this.pagination.descending = false
      },
      loadColumnsChecked () {
        const checkedColumns = this.$localStorage.getObject('dataTable_checkedColumns') || {}
        for (const header of this.allHeaders) {
          header.checked = get(checkedColumns, header.value, header.defaultChecked)

          if (get(header, 'adminOnly', false)) {
            header.hidden = !this.isAdmin
          }
        }
      },
      toggleHideUserIssues () {
        if (this.showOnlyShootsWithIssues) {
          this.hideUserIssues = !this.hideUserIssues
        }
      },
      toggleHideDeactivatedReconciliation () {
        if (this.showOnlyShootsWithIssues) {
          this.hideDeactivatedReconciliation = !this.hideDeactivatedReconciliation
        }
      }
    },
    computed: {
      ...mapGetters({
        mappedItems: 'shootList',
        item: 'shootByNamespaceAndName',
        selectedItem: 'selectedShoot',
        isAdmin: 'isAdmin',
        isHideUserIssues: 'isHideUserIssues',
        isHideDeactivatedReconciliation: 'isHideDeactivatedReconciliation'
      }),
      ...mapState([
        'shootsLoading',
        'onlyShootsWithIssues'
      ]),
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
      currentMetadata () {
        return get(this.selectedItem, 'metadata')
      },
      currentStatus () {
        return get(this.selectedItem, 'status')
      },
      currentName () {
        return get(this.selectedItem, 'metadata.name')
      },
      currentNamespace () {
        return get(this.selectedItem, 'metadata.namespace')
      },
      currentCreatedBy () {
        return getCreatedBy(this.currentMetadata)
      },
      currentInfo () {
        return get(this.selectedItem, 'info', {})
      },
      currentKubeconfig () {
        return get(this.selectedItem, 'info.kubeconfig')
      },
      currentLog () {
        return get(this.selectedItem, 'spec.status.lastOperation.description')
      },
      headers () {
        return this.allHeaders.filter(e => e.hidden === false)
      },
      visibleHeaders () {
        return this.headers.filter(e => e.checked === true)
      },
      projectScope () {
        return this.$route.params.namespace !== '_all'
      },
      showOnlyShootsWithIssues: {
        get () {
          return this.onlyShootsWithIssues
        },
        set (value) {
          this.setOnlyShootsWithIssues(value)
        }
      },
      items () {
        return this.cachedItems || this.mappedItems
      },
      isHideUserIssuesAndHideDeactedReconciliationDisabled () {
        return !this.showOnlyShootsWithIssues
      },
      hideUserIssues: {
        get () {
          if (this.isHideUserIssuesAndHideDeactedReconciliationDisabled) {
            return false
          }
          return this.isHideUserIssues
        },
        set (value) {
          this.setHideUserIssues(value)
        }
      },
      hideDeactivatedReconciliation: {
        get () {
          if (this.isHideUserIssuesAndHideDeactedReconciliationDisabled) {
            return false
          }
          return this.isHideDeactivatedReconciliation
        },
        set (value) {
          this.setHideDeactivatedReconciliation(value)
        }
      },
      hideUserIssuesAndHideDeactivatedReconciliationClass () {
        return this.isHideUserIssuesAndHideDeactedReconciliationDisabled ? 'disabled_filter' : ''
      }
    },
    mounted () {
      this.floatingButton = true
      if (this.hideUserIssues === undefined) {
        this.hideUserIssues = this.isAdmin
      }
      if (this.hideDeactivatedReconciliation === undefined) {
        this.hideDeactivatedReconciliation = this.isAdmin
      }
      this.loadColumnsChecked()
    },
    beforeUpdate () {
      const predicate = item => item.value === 'project'
      const projectHeader = find(this.allHeaders, predicate)
      projectHeader.hidden = this.projectScope
    },
    beforeRouteEnter (to, from, next) {
      next(vm => {
        vm.cachedItems = null
      })
    },
    beforeRouteUpdate (to, from, next) {
      this.search = null
      next()
    },
    beforeRouteLeave (to, from, next) {
      this.cachedItems = this.mappedItems.slice(0)
      this.search = null
      next()
    }
  }
</script>
<style lang="styl" scoped >
  @import '../stylus/main'

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

  .disabled_filter {
    opacity: 0.5;
  }
</style>
