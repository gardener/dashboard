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
        <v-text-field v-if="shootSearch || items.length > 3"
          prepend-inner-icon="mdi-magnify"
          color="cyan darken-2"
          label="Search"
          clearable
          hide-details
          flat
          solo
          v-model="shootSearch"
          @keyup.esc="shootSearch=''"
          class="search_textfield"
        ></v-text-field>
        <table-column-selection
          :headers="selectableHeaders"
          :filters="selectableFilters"
          @setSelectedHeader="setSelectedHeader"
          @reset="resetTableSettings"
          @toggleFilter="toggleFilter"
        ></table-column-selection>
      </v-toolbar>
      <v-data-table
        class="shootListTable"
        :headers="visibleHeaders"
        :items="items"
        :options.sync="options"
        :loading="shootsLoading"
        :footer-props="{ 'items-per-page-options': [5,10,20] }"
        :search="shootSearch"
        :custom-filter="searchShoots"
        must-sort
        :custom-sort="sortShoots"
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
import split from 'lodash/split'
import includes from 'lodash/includes'
import some from 'lodash/some'
import padStart from 'lodash/padStart'
import head from 'lodash/head'
import orderBy from 'lodash/orderBy'
import toLower from 'lodash/toLower'
import ShootListRow from '@/components/ShootListRow'
import semver from 'semver'
import TableColumnSelection from '@/components/TableColumnSelection.vue'
import {
  mapTableHeader,
  getCreatedBy,
  getProjectName,
  isShootStatusHibernated,
  isReconciliationDeactivated
} from '@/utils'
import { isUserError, errorCodesFromArray } from '@/utils/errorCodes'
const ShootAccessCard = () => import('@/components/ShootDetails/ShootAccessCard')

export default {
  name: 'shoot-list',
  components: {
    ShootListRow,
    ShootAccessCard,
    TableColumnSelection
  },
  data () {
    return {
      floatingButton: false,
      shootSearch: '',
      dialog: null,
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
    }
  },
  methods: {
    ...mapActions({
      setSelectedShootInternal: 'setSelectedShoot',
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
    setSelectedHeader (header) {
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
    async toggleFilter ({ value }) {
      const key = value
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
    },
    searchShoots (value, search, item) {
      const searchableCustomFields = filter(this.shootCustomFieldList, ['searchable', true])

      const searchValue = split(search, ' ')
      return some(searchValue, value => {
        if (includes(this.getRawVal(item, 'name'), value)) {
          return true
        }
        if (includes(this.getRawVal(item, 'infrastructure'), value)) {
          return true
        }
        if (includes(this.getRawVal(item, 'seed'), value)) {
          return true
        }
        if (includes(this.getRawVal(item, 'project'), value)) {
          return true
        }
        if (includes(this.getRawVal(item, 'createdBy'), value)) {
          return true
        }
        if (includes(this.getRawVal(item, 'purpose'), value)) {
          return true
        }
        if (includes(this.getRawVal(item, 'k8sVersion'), value)) {
          return true
        }
        if (includes(this.getRawVal(item, 'ticketLabels'), value)) {
          return true
        }

        return some(searchableCustomFields, ({ key }) => includes(this.getRawVal(item, key), value))
      })
    },
    sortShoots (items, sortByArr, sortDescArr) {
      const sortBy = head(sortByArr)
      const sortOrder = head(sortDescArr) ? 'desc' : 'asc'
      if (sortBy) {
        const sortbyNameAsc = (a, b) => {
          if (this.getRawVal(a, 'name') > this.getRawVal(b, 'name')) {
            return 1
          } else if (this.getRawVal(a, 'name') < this.getRawVal(b, 'name')) {
            return -1
          }
          return 0
        }
        const inverse = sortOrder === 'desc' ? -1 : 1
        switch (sortBy) {
          case 'k8sVersion': {
            items.sort((a, b) => {
              const versionA = this.getRawVal(a, sortBy)
              const versionB = this.getRawVal(b, sortBy)

              if (semver.gt(versionA, versionB)) {
                return 1 * inverse
              } else if (semver.lt(versionA, versionB)) {
                return -1 * inverse
              } else {
                return sortbyNameAsc(a, b)
              }
            })
            break
          }
          case 'readiness': {
            items.sort((a, b) => {
              const readinessA = this.getSortVal(a, sortBy)
              const readinessB = this.getSortVal(b, sortBy)

              if (readinessA === readinessB) {
                return sortbyNameAsc(a, b)
              } else if (!readinessA) {
                return 1
              } else if (!readinessB) {
                return -1
              } else if (readinessA > readinessB) {
                return 1 * inverse
              } else {
                return -1 * inverse
              }
            })
            break
          }
          default: {
            items = orderBy(items, [item => this.getSortVal(item, sortBy), 'metadata.name'], [sortOrder, 'asc'])
          }
        }
      }
      return items
    },
    getRawVal (item, column) {
      const metadata = item.metadata
      const spec = item.spec
      switch (column) {
        case 'purpose':
          return get(spec, 'purpose')
        case 'lastOperation':
          return get(item, 'status.lastOperation')
        case 'createdAt':
          return metadata.creationTimestamp
        case 'createdBy':
          return getCreatedBy(metadata)
        case 'project':
          return getProjectName(metadata)
        case 'k8sVersion':
          return get(spec, 'kubernetes.version')
        case 'infrastructure':
          return `${get(spec, 'provider.type')} ${get(spec, 'region')}`
        case 'seed':
          return get(item, 'spec.seedName')
        case 'ticketLabels': {
          const labels = this.ticketsLabels(metadata)
          return join(map(labels, 'name'), ' ')
        }
        default: {
          if (startsWith(column, 'Z_')) {
            const path = get(this.shootCustomFields, [column, 'path'])
            return get(item, path)
          }
          return metadata[column]
        }
      }
    },
    getSortVal (item, sortBy) {
      const value = this.getRawVal(item, sortBy)
      const status = item.status
      switch (sortBy) {
        case 'purpose':
          switch (value) {
            case 'infrastructure':
              return 0
            case 'production':
              return 1
            case 'development':
              return 2
            case 'evaluation':
              return 3
            default:
              return 4
          }
        case 'lastOperation': {
          const operation = value || {}
          const inProgress = operation.progress !== 100 && operation.state !== 'Failed' && !!operation.progress
          const lastErrors = get(item, 'status.lastErrors', [])
          const isError = operation.state === 'Failed' || lastErrors.length
          const allErrorCodes = errorCodesFromArray(lastErrors)
          const userError = isUserError(allErrorCodes)
          const ignoredFromReconciliation = isReconciliationDeactivated(get(item, 'metadata', {}))

          if (ignoredFromReconciliation) {
            if (isError) {
              return 400
            } else {
              return 450
            }
          } else if (userError && !inProgress) {
            return 200
          } else if (userError && inProgress) {
            const progress = padStart(operation.progress, 2, '0')
            return `3${progress}`
          } else if (isError && !inProgress) {
            return 0
          } else if (isError && inProgress) {
            const progress = padStart(operation.progress, 2, '0')
            return `1${progress}`
          } else if (inProgress) {
            const progress = padStart(operation.progress, 2, '0')
            return `6${progress}`
          } else if (isShootStatusHibernated(status)) {
            return 500
          }
          return 700
        }
        case 'readiness': {
          const errorConditions = filter(get(status, 'conditions'), condition => get(condition, 'status') !== 'True')
          const lastErrorTransitionTime = head(orderBy(map(errorConditions, 'lastTransitionTime')))
          return lastErrorTransitionTime
        }
        case 'ticket': {
          const { namespace, name } = item.metadata
          return this.latestUpdatedTicketByNameAndNamespace({ namespace, name })
        }
        default:
          return toLower(value)
      }
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
      shootCustomFieldList: 'shootCustomFieldList',
      shootCustomFields: 'shootCustomFields',
      ticketsLabels: 'ticketsLabels',
      latestUpdatedTicketByNameAndNamespace: 'latestUpdatedTicketByNameAndNamespace'
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
      return mapTableHeader(this.standardHeaders, 'selected')
    },
    currentCustomSelectedColumns () {
      return mapTableHeader(this.customHeaders, 'selected')
    },
    defaultStandardSelectedColumns () {
      return mapTableHeader(this.standardHeaders, 'defaultSelected')
    },
    defaultCustomSelectedColumns () {
      return mapTableHeader(this.customHeaders, 'defaultSelected')
    },
    standardHeaders () {
      const headers = [
        {
          text: 'PROJECT',
          value: 'project',
          class: 'nowrap',
          align: 'left',
          defaultSelected: true,
          hidden: !!this.projectScope
        },
        {
          text: 'NAME',
          value: 'name',
          class: 'nowrap',
          align: 'left',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'INFRASTRUCTURE',
          value: 'infrastructure',
          class: 'nowrap',
          align: 'left',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'SEED',
          value: 'seed',
          align: 'left',
          class: 'nowrap',
          defaultSelected: false,
          hidden: false
        },
        {
          text: 'TECHNICAL ID',
          value: 'technicalId',
          class: 'nowrap',
          align: 'left',
          defaultSelected: false,
          hidden: !this.isAdmin
        },
        {
          text: 'CREATED BY',
          value: 'createdBy',
          class: 'nowrap',
          align: 'left',
          defaultSelected: false,
          hidden: false
        },
        {
          text: 'CREATED AT',
          value: 'createdAt',
          class: 'nowrap',
          align: 'left',
          defaultSelected: false,
          hidden: false
        },
        {
          text: 'PURPOSE',
          value: 'purpose',
          class: 'nowrap text-center',
          align: 'center',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'STATUS',
          value: 'lastOperation',
          class: 'nowrap text-left',
          align: 'left',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'VERSION',
          value: 'k8sVersion',
          class: 'nowrap text-center',
          align: 'center',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'READINESS',
          value: 'readiness',
          class: 'nowrap text-center',
          sortable: true,
          align: 'center',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'ACCESS RESTRICTIONS',
          value: 'accessRestrictions',
          sortable: false,
          align: 'left',
          defaultSelected: false,
          hidden: !this.cfg.accessRestriction || !this.isAdmin
        },
        {
          text: 'TICKET',
          value: 'ticket',
          class: 'nowrap',
          sortable: true,
          align: 'left',
          defaultSelected: false,
          hidden: !this.gitHubRepoUrl || !this.isAdmin
        },
        {
          text: 'TICKET LABELS',
          value: 'ticketLabels',
          sortable: false,
          align: 'left',
          defaultSelected: true,
          hidden: !this.gitHubRepoUrl || !this.isAdmin
        },
        {
          text: 'ACTIONS',
          value: 'actions',
          class: 'nowrap text-right action-button-group',
          sortable: false,
          align: 'right',
          defaultSelected: true,
          hidden: !(this.canDeleteShoots || this.canGetSecrets)
        }
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
    selectableHeaders () {
      return filter(this.allHeaders, ['hidden', false])
    },
    visibleHeaders () {
      return filter(this.selectableHeaders, ['selected', true])
    },
    allFilters () {
      return [
        {
          text: 'Show only clusters with issues',
          value: 'onlyShootsWithIssues',
          selected: this.onlyShootsWithIssues,
          hidden: this.projectScope
        },
        {
          text: 'Hide progressing clusters',
          value: 'progressing',
          selected: this.isFilterActive('progressing'),
          hidden: this.projectScope || !this.isAdmin,
          disabled: this.filtersDisabled
        },
        {
          text: 'Hide user issues',
          value: 'userIssues',
          selected: this.isFilterActive('userIssues'),
          hidden: this.projectScope || !this.isAdmin,
          disabled: this.filtersDisabled
        },
        {
          text: 'Hide clusters with deactivated reconciliation',
          value: 'deactivatedReconciliation',
          selected: this.isFilterActive('deactivatedReconciliation'),
          hidden: this.projectScope || !this.isAdmin,
          disabled: this.filtersDisabled
        },
        {
          text: 'Hide clusters with configured ticket labels',
          value: 'hideTicketsWithLabel',
          selected: this.isFilterActive('hideTicketsWithLabel'),
          hidden: this.projectScope || !this.isAdmin || !this.gitHubRepoUrl || !this.hideClustersWithLabels.length,
          helpTooltip: this.hideTicketsWithLabelTooltip,
          disabled: this.filtersDisabled
        }
      ]
    },
    selectableFilters () {
      return filter(this.allFilters, ['hidden', false])
    },
    hideTicketsWithLabelTooltip () {
      const labels = map(this.hideClustersWithLabels, label => (`- ${label}`))
      return ['Configured Labels', ...labels]
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
    this.shootSearch = null
    this.updateTableSettings()
    next()
  },
  beforeRouteLeave (to, from, next) {
    this.cachedItems = this.mappedItems.slice(0)
    this.shootSearch = null
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

  .search_textfield {
    min-width: 125px;
  }

  .v-input__slot {
    margin: 0px;
  }

</style>
