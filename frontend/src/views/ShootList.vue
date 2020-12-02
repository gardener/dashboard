<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid class="shootlist">
    <v-card class="mr-extra">
      <v-toolbar flat height="72" color="cyan darken-2">
        <img src="../assets/certified_kubernetes_white.svg" height="60" class="ml-1 mr-3">
        <v-toolbar-title class="white--text">
          <div class="headline">Kubernetes Clusters</div>
          <div class="subtitle-1">{{headlineSubtitle}}</div>
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="search || items.length > 3"
          prepend-inner-icon="mdi-magnify"
          color="cyan darken-2"
          label="Search"
          clearable
          hide-details
          flat
          solo
          v-model="search"
          @keyup.esc="search=''"
          class="search_textfield"
        ></v-text-field>
        <v-menu :nudge-bottom="20" :nudge-right="20" left v-model="tableMenu" absolute>
          <template v-slot:activator="{ on: menu }">
            <v-tooltip open-delay="500" top>
              <template v-slot:activator="{ on: tooltip }">
                <v-btn v-on="{ ...menu, ...tooltip}" icon>
                  <v-icon class="cursor-pointer" color="white">mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              Table Options
            </v-tooltip>
          </template>
          <v-list subheader dense>
            <v-subheader>Column Selection</v-subheader>
            <v-list-item v-for="header in headers" :key="header.text" @click.stop="setSelectedColumn(header)">
              <v-list-item-action>
                <v-icon :color="checkboxColor(header.selected)" v-text="checkboxIcon(header.selected)"/>
              </v-list-item-action>
              <v-list-item-content class="grey--text text--darken-2">
                <v-list-item-title>
                  <v-tooltip v-if="header.customField" top open-delay="500">
                    <template v-slot:activator="{ on: tooltip }">
                      <div v-on="tooltip">
                        <v-badge
                          inline
                          icon="mdi-playlist-star"
                          color="cyan darken-2"
                          class="mt-0"
                        >
                          <span>{{ header.text }}</span>
                        </v-badge>
                      </div>
                    </template>
                    Custom Field
                  </v-tooltip>
                  <template v-else>{{ header.text }}</template>
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-list-item>
              <v-list-item-content>
                <v-tooltip top style="width: 100%">
                  <template v-slot:activator="{ on }">
                    <v-btn v-on="on" block text class="text-center cyan--text text--darken-2" @click.stop="resetTableSettings">
                      Reset
                    </v-btn>
                  </template>
                  <span>Reset to Defaults</span>
                </v-tooltip>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          <v-list subheader dense v-if="!projectScope">
            <v-subheader>Filter Table</v-subheader>
            <v-list-item @click.stop="showOnlyShootsWithIssues = !showOnlyShootsWithIssues">
              <v-list-item-action>
                <v-icon :color="checkboxColor(showOnlyShootsWithIssues)" v-text="checkboxIcon(showOnlyShootsWithIssues)"/>
              </v-list-item-action>
              <v-list-item-content class="grey--text text--darken-2">
                <v-list-item-title>Show only clusters with issues</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <template v-if="isAdmin">
              <v-list-item
                @click.stop="toggleFilter('progressing')"
                :disabled="filtersDisabled"
                :class="disabledFilterClass">
                <v-list-item-action>
                  <v-icon :color="checkboxColor(isFilterActive('progressing'))" v-text="checkboxIcon(isFilterActive('progressing'))"/>
                </v-list-item-action>
                <v-list-item-content class="grey--text text--darken-2">
                  <v-list-item-title>Hide progressing clusters</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
              <v-list-item
                @click.stop="toggleFilter('userIssues')"
                :disabled="filtersDisabled"
                :class="disabledFilterClass">
                <v-list-item-action>
                  <v-icon :color="checkboxColor(isFilterActive('userIssues'))" v-text="checkboxIcon(isFilterActive('userIssues'))"/>
                </v-list-item-action>
                <v-list-item-content class="grey--text text--darken-2">
                  <v-list-item-title>Hide user issues</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
              <v-list-item
                @click.stop="toggleFilter('deactivatedReconciliation')"
                :disabled="filtersDisabled"
                :class="disabledFilterClass">
                <v-list-item-action>
                  <v-icon :color="checkboxColor(isFilterActive('deactivatedReconciliation'))" v-text="checkboxIcon(isFilterActive('deactivatedReconciliation'))"/>
                </v-list-item-action>
                <v-list-item-content class="grey--text text--darken-2">
                  <v-list-item-title>Hide clusters with deactivated reconciliation</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
              <v-list-item
                @click.stop="toggleFilter('hideTicketsWithLabel')"
                :disabled="filtersDisabled"
                :class="disabledFilterClass"
                v-if="!!gitHubRepoUrl && hideClustersWithLabels.length">
                <v-list-item-action>
                  <v-icon :color="checkboxColor(isFilterActive('hideTicketsWithLabel'))" v-text="checkboxIcon(isFilterActive('hideTicketsWithLabel'))"/>
                </v-list-item-action>
                <v-list-item-content class="grey--text text--darken-2">
                  <v-list-item-title>
                    Hide clusters with
                    <v-tooltip top>
                      <template v-slot:activator="{ on }">
                        <span v-on="on"><tt>configured</tt><v-icon small>mdi-help-circle-outline</v-icon></span>
                      </template>
                      <div v-for="label in hideClustersWithLabels" :key="label">- {{label}}</div>
                    </v-tooltip>
                    ticket labels
                  </v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </template>
          </v-list>
        </v-menu>
      </v-toolbar>
      <v-data-table
        class="shootListTable"
        :headers="visibleHeaders"
        :items="items"
        :options.sync="options"
        must-sort
        :loading="shootsLoading"
        :footer-props="{ 'items-per-page-options': [5,10,20] }"
      >
        <template v-slot:item="{ item }">
          <shoot-list-row
            :shootItem="item"
            :visibleHeaders="visibleHeaders"
            @showDialog="showDialog"
            :key="item.metadata.uid"
          ></shoot-list-row>
        </template>
      </v-data-table>

      <v-dialog v-model="clusterAccessDialog" max-width="600">
        <v-card>
          <v-card-title class="teal darken-1 grey--text text--lighten-4">
            <div class="headline">Cluster Access <code class="cluster_name">{{currentName}}</code></div>
            <v-spacer></v-spacer>
            <v-btn icon class="grey--text text--lighten-4" @click.native="hideDialog">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <shoot-access-card ref="clusterAccess" :shoot-item="selectedItem" :hide-terminal-shortcuts="true"></shoot-access-card>
        </v-card>
      </v-dialog>
    </v-card>
    <v-fab-transition v-if="canCreateShoots">
      <v-btn v-if="projectScope" class="cyan darken-2" dark fab fixed bottom right v-show="floatingButton" :to="{ name: 'NewShoot', params: {  namespace } }">
        <v-icon dark ref="add">mdi-plus</v-icon>
      </v-btn>
    </v-fab-transition>
  </v-container>
</template>

<script>
import { mapGetters, mapActions, mapState } from 'vuex'
import filter from 'lodash/filter'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import join from 'lodash/join'
import map from 'lodash/map'
import pick from 'lodash/pick'
import sortBy from 'lodash/sortBy'
import startsWith from 'lodash/startsWith'
import upperCase from 'lodash/upperCase'
import ShootListRow from '@/components/ShootListRow'
const ShootAccessCard = () => import('@/components/ShootDetails/ShootAccessCard')

function mapHeader (headers, valueKey) {
  const obj = {}
  for (const { value: key, [valueKey]: value } of headers) {
    obj[key] = value
  }
  return obj
}

export default {
  name: 'shoot-list',
  components: {
    ShootListRow,
    ShootAccessCard
  },
  data () {
    return {
      floatingButton: false,
      search: '',
      dialog: null,
      tableMenu: false,
      options: undefined,
      cachedItems: null,
      clearSelectedShootTimerID: undefined,
      selectedColumns: undefined
    }
  },
  watch: {
    options (value) {
      if (!value) {
        return
      }
      const { sortBy, sortDesc, itemsPerPage } = value
      if (!sortBy || !sortBy.length) { // initial table options
        return
      }

      if (startsWith(sortBy, 'Z_')) {
        this.$localStorage.setObject(`project/${this.projectName}/shoot-list/options`, { sortBy, sortDesc })

        const currentTableOptions = this.$localStorage.getObject('projects/shoot-list/options')
        const tableOptions = {
          ...this.defaultTableOptions,
          ...currentTableOptions,
          itemsPerPage
        }
        this.$localStorage.setObject('projects/shoot-list/options', tableOptions)
      } else {
        this.$localStorage.setObject('projects/shoot-list/options', { sortBy, sortDesc, itemsPerPage })
      }
      this.setShootListSortParams(value)
    },
    search (value) {
      this.setShootListSearchValue(value)
    }
  },
  methods: {
    ...mapActions({
      setSelectedShootInternal: 'setSelectedShoot',
      setShootListSortParams: 'setShootListSortParams',
      setShootListSearchValue: 'setShootListSearchValue',
      setShootListFilters: 'setShootListFilters',
      setShootListFilter: 'setShootListFilter',
      subscribeShoots: 'subscribeShoots'
    }),
    async showDialog (args) {
      switch (args.action) {
        case 'access':
          try {
            await this.setSelectedShoot(args.shootItem.metadata)
            this.dialog = args.action
          } catch (error) {
            // Currently not handled
          }
      }
    },
    hideDialog () {
      this.dialog = null
      // Delay resetting shoot so that the dialog does not lose context during closing animation
      this.clearSelectedShootWithDelay()
    },
    checkboxColor (selected) {
      return selected ? 'cyan darken-2' : ''
    },
    checkboxIcon (selected) {
      return selected ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline'
    },
    setSelectedColumn (header) {
      this.$set(this.selectedColumns, header.value, !header.selected)
      this.saveSelectedColumns()
    },
    saveSelectedColumns () {
      this.$localStorage.setObject('projects/shoot-list/selected-columns', this.currentStandardSelectedColumns)
      if (isEmpty(this.currentCustomSelectedColumns)) {
        this.$localStorage.removeItem(`project/${this.projectName}/shoot-list/selected-columns`)
      } else {
        this.$localStorage.setObject(`project/${this.projectName}/shoot-list/selected-columns`, this.currentCustomSelectedColumns)
      }
    },
    resetTableSettings () {
      this.selectedColumns = {
        ...this.defaultStandardSelectedColumns,
        ...this.defaultCustomSelectedColumns
      }
      this.saveSelectedColumns()
      this.options = this.defaultTableOptions
    },
    updateTableSettings () {
      const selectedColumns = this.$localStorage.getObject('projects/shoot-list/selected-columns')
      const projectSpecificSelectedColumns = this.$localStorage.getObject(`project/${this.projectName}/shoot-list/selected-columns`)
      this.selectedColumns = {
        ...selectedColumns,
        ...projectSpecificSelectedColumns
      }
      const projectSpecificTableOptions = this.$localStorage.getObject(`project/${this.projectName}/shoot-list/options`)
      const tableOptions = this.$localStorage.getObject('projects/shoot-list/options')
      this.options = {
        ...this.defaultTableOptions,
        ...tableOptions,
        ...projectSpecificTableOptions
      }
    },
    async toggleFilter (key) {
      await this.setShootListFilter({ filter: key, value: !this.getShootListFilters[key] })

      this.$localStorage.setObject('project/_all/shoot-list/filter', pick(this.getShootListFilters, ['onlyShootsWithIssues', 'progressing', 'userIssues', 'deactivatedReconciliation', 'hideTicketsWithLabel']))

      if (key === 'onlyShootsWithIssues') {
        this.subscribeShoots()
      }
    },
    isFilterActive (key) {
      const filters = this.getShootListFilters
      return get(filters, key, false)
    },
    setSelectedShoot (selectedShoot) {
      clearTimeout(this.clearSelectedShootTimerID)
      return this.setSelectedShootInternal(selectedShoot)
    },
    clearSelectedShootWithDelay () {
      this.clearSelectedShootTimerID = setTimeout(() => {
        this.setSelectedShootInternal(null)
      }, 500)
    }
  },
  computed: {
    ...mapGetters({
      mappedItems: 'shootList',
      item: 'shootByNamespaceAndName',
      selectedItem: 'selectedShoot',
      isAdmin: 'isAdmin',
      getShootListFilters: 'getShootListFilters',
      canPatchShoots: 'canPatchShoots',
      canDeleteShoots: 'canDeleteShoots',
      canCreateShoots: 'canCreateShoots',
      canGetSecrets: 'canGetSecrets',
      onlyShootsWithIssues: 'onlyShootsWithIssues',
      projectFromProjectList: 'projectFromProjectList',
      projectName: 'projectName',
      shootCustomFieldList: 'shootCustomFieldList'
    }),
    ...mapState([
      'shootsLoading',
      'cfg',
      'namespace'
    ]),
    defaultTableOptions () {
      return {
        sortBy: ['name'],
        sortDesc: [false],
        itemsPerPage: 10
      }
    },
    clusterAccessDialog: {
      get () {
        return this.dialog === 'access'
      },
      set (value) {
        if (!value) {
          this.hideDialog()
        }
      }
    },
    currentName () {
      return get(this.selectedItem, 'metadata.name')
    },
    currentStandardSelectedColumns () {
      return mapHeader(this.standardHeaders, 'selected')
    },
    currentCustomSelectedColumns () {
      return mapHeader(this.customHeaders, 'selected')
    },
    defaultStandardSelectedColumns () {
      return mapHeader(this.standardHeaders, 'defaultSelected')
    },
    defaultCustomSelectedColumns () {
      return mapHeader(this.customHeaders, 'defaultSelected')
    },
    standardHeaders () {
      const headers = [
        { text: 'PROJECT', value: 'project', class: 'nowrap', align: 'left', selected: false, defaultSelected: true, hidden: !!this.projectScope },
        { text: 'NAME', value: 'name', class: 'nowrap', align: 'left', selected: false, defaultSelected: true, hidden: false },
        { text: 'INFRASTRUCTURE', value: 'infrastructure', class: 'nowrap', align: 'left', selected: false, defaultSelected: true, hidden: false },
        { text: 'SEED', value: 'seed', align: 'left', class: 'nowrap', selected: false, defaultSelected: false, hidden: false },
        { text: 'TECHNICAL ID', value: 'technicalId', class: 'nowrap', align: 'left', selected: false, defaultSelected: false, hidden: !this.isAdmin },
        { text: 'CREATED BY', value: 'createdBy', class: 'nowrap', align: 'left', selected: false, defaultSelected: false, hidden: false },
        { text: 'CREATED AT', value: 'createdAt', class: 'nowrap', align: 'left', selected: false, defaultSelected: false, hidden: false },
        { text: 'PURPOSE', value: 'purpose', class: 'nowrap text-center', align: 'center', selected: false, defaultSelected: true, hidden: false },
        { text: 'STATUS', value: 'lastOperation', class: 'nowrap text-left', align: 'left', selected: false, defaultSelected: true, hidden: false },
        { text: 'VERSION', value: 'k8sVersion', class: 'nowrap text-center', align: 'center', selected: false, defaultSelected: true, hidden: false },
        { text: 'READINESS', value: 'readiness', class: 'nowrap text-center', sortable: true, align: 'center', selected: false, defaultSelected: true, hidden: false },
        { text: 'ACCESS RESTRICTIONS', value: 'accessRestrictions', sortable: false, align: 'left', selected: false, defaultSelected: false, hidden: !this.cfg.accessRestriction || !this.isAdmin },
        { text: 'TICKET', value: 'ticket', class: 'nowrap', sortable: true, align: 'left', selected: false, defaultSelected: false, hidden: !this.gitHubRepoUrl || !this.isAdmin },
        { text: 'TICKET LABELS', value: 'ticketLabels', sortable: false, align: 'left', selected: false, defaultSelected: true, hidden: !this.gitHubRepoUrl || !this.isAdmin },
        { text: 'ACTIONS', value: 'actions', class: 'nowrap text-right action-button-group', sortable: false, align: 'right', selected: false, defaultSelected: true, hidden: !(this.canDeleteShoots || this.canGetSecrets) }
      ]
      return map(headers, (header, index) => ({
        ...header,
        weight: (index + 1) * 100,
        selected: get(this.selectedColumns, header.value, header.defaultSelected)
      }))
    },
    customHeaders () {
      const customHeaders = filter(this.shootCustomFieldList, ['showColumn', true])

      return map(customHeaders, ({
        align = 'left',
        name,
        key,
        path,
        columnSelectedByDefault: defaultSelected,
        tooltip,
        defaultValue,
        sortable,
        weight
      }, index) => {
        return {
          customField: true,
          text: upperCase(name),
          value: key,
          sortable,
          align,
          selected: get(this.selectedColumns, key, defaultSelected),
          defaultSelected,
          hidden: false,
          path,
          tooltip,
          defaultValue,
          weight: weight || index
        }
      })
    },
    allHeaders () {
      const allHeaders = [...this.standardHeaders, ...this.customHeaders]
      return sortBy(allHeaders, ['weight', 'text'])
    },
    headers () {
      return filter(this.allHeaders, ['hidden', false])
    },
    visibleHeaders () {
      return filter(this.headers, ['selected', true])
    },
    projectScope () {
      return this.namespace !== '_all'
    },
    showOnlyShootsWithIssues: {
      get () {
        return this.onlyShootsWithIssues
      },
      set (value) {
        this.toggleFilter('onlyShootsWithIssues')
      }
    },
    items () {
      return this.cachedItems || this.mappedItems
    },
    filtersDisabled () {
      return !this.showOnlyShootsWithIssues
    },
    disabledFilterClass () {
      return this.filtersDisabled ? 'disabled_filter' : ''
    },
    headlineSubtitle () {
      const subtitle = []
      if (!this.projectScope && this.showOnlyShootsWithIssues) {
        subtitle.push('Hide: Healthy Clusters')
        if (this.isFilterActive('progressing')) {
          subtitle.push('Progressing Clusters')
        }
        if (this.isFilterActive('userIssues')) {
          subtitle.push('User Errors')
        }
        if (this.isFilterActive('deactivatedReconciliation')) {
          subtitle.push('Deactivated Reconciliation')
        }
        if (this.isFilterActive('hideTicketsWithLabel')) {
          subtitle.push('Tickets with Ignore Labels')
        }
      }
      return join(subtitle, ', ')
    },
    gitHubRepoUrl () {
      return get(this.cfg, 'ticket.gitHubRepoUrl')
    },
    hideClustersWithLabels () {
      return get(this.cfg, 'ticket.hideClustersWithLabels', [])
    }
  },
  mounted () {
    this.floatingButton = true
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.cachedItems = null
      vm.updateTableSettings()
    })
  },
  beforeRouteUpdate (to, from, next) {
    this.search = null
    this.updateTableSettings()
    next()
  },
  beforeRouteLeave (to, from, next) {
    this.cachedItems = this.mappedItems.slice(0)
    this.search = null
    next()
  }
}
</script>

<style lang="scss" scoped >

  .dashboard {
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .cluster_name {
    color: rgb(0, 137, 123);
  }

  .shootListTable table.table {
    thead, tbody {
      th, td {
        padding: 10px;
      }
    }
  }

  .shootListTable table {
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

  .search_textfield {
    min-width: 125px;
  }

  .v-input__slot {
    margin: 0px;
  }

</style>
