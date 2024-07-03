<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-card class="ma-3">
      <g-toolbar
        :height="72"
      >
        <template #prepend>
          <g-icon-base
            width="44"
            height="60"
            view-box="0 0 298 403"
            class="ml-2"
            icon-color="toolbar-title"
          >
            <g-certified-kubernetes />
          </g-icon-base>
        </template>
        <div class="text-h5">
          Kubernetes Clusters
        </div>
        <div class="text-caption">
          {{ headlineSubtitle }}
        </div>
        <template #append>
          <v-tooltip location="bottom">
            <template #activator="{ props }">
              <div v-bind="props">
                <v-badge
                  v-if="issueSinceColumnVisible"
                  class="mr-5"
                  bordered
                  color="primary-lighten-3"
                  :content="numberOfNewItemsSinceFreeze"
                  :model-value="numberOfNewItemsSinceFreeze > 0"
                >
                  <v-switch
                    v-model="focusModeInternal"
                    class="mr-3"
                    density="compact"
                    color="primary-lighten-3"
                    hide-details
                  >
                    <template #label>
                      <span class="text-subtitle-1 text-toolbar-title">Focus</span>
                    </template>
                  </v-switch>
                </v-badge>
              </div>
            </template>
            <span class="font-weight-bold">Focus Mode</span>
            <ul class="ml-3">
              <li>Cluster list sorting is freezed</li>
              <li>Items in the list will still be updated</li>
              <li>New clusters will not be added to the list until you disable focus mode</li>
              <li>Removed items will be shown as stale (greyed out)</li>
            </ul>
            <template v-if="numberOfNewItemsSinceFreeze > 0">
              <v-divider color="white" />
              <span class="font-weight-bold">{{ numberOfNewItemsSinceFreeze }}</span>
              new clusters were added to the list since you enabled focus mode.
            </template>
          </v-tooltip>
          <v-tooltip
            v-if="shootSearch || items.length > 3"
            location="top"
          >
            <template #activator="{ props }">
              <v-text-field
                v-bind="props"
                :model-value="shootSearch"
                prepend-inner-icon="mdi-magnify"
                color="primary"
                label="Search"
                single-line
                hide-details
                variant="solo"
                flat
                clearable
                clear-icon="mdi-close"
                density="compact"
                class="g-table-search-field mr-3"
                @update:model-value="onUpdateShootSearch"
                @keyup.esc="resetShootSearch"
              />
            </template>
            Search terms are <span class="font-weight-bold">ANDed</span>.<br>
            <span class="font-weight-bold">Use quotes</span> for exact words or phrases:
            <v-chip
              label
              color="primary"
              variant="flat"
              size="small"
              class="mr-1"
            >
              "my-shoot"
            </v-chip>
            <v-chip
              label
              color="primary"
              variant="flat"
              size="small"
            >
              "John Doe"
            </v-chip>
            <br>
            <span class="font-weight-bold">Use minus sign</span>
            to exclude words that you don't want:
            <v-chip
              label
              color="primary"
              variant="flat"
              size="small"
              class="mr-1"
            >
              -myproject
            </v-chip>
            <v-chip
              label
              color="primary"
              variant="flat"
              size="small"
            >
              -"Jane Doe"
            </v-chip>
            <br>
          </v-tooltip>
          <v-tooltip
            v-if="canCreateShoots && projectScope"
            location="top"
          >
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon="mdi-plus"
                color="toolbar-title"
                :to="{ name: 'NewShoot', params: { namespace } }"
              />
            </template>
            <span>Create Cluster</span>
          </v-tooltip>
          <g-table-column-selection
            :headers="selectableHeaders"
            :filters="selectableFilters"
            :filter-tooltip="filterTooltip"
            @set-selected-header="setSelectedHeader"
            @reset="resetTableSettings"
            @toggle-filter="toggleFilter"
          />
        </template>
      </g-toolbar>
      <v-data-table
        v-model:page="page"
        v-model:sort-by="sortByInternal"
        v-model:items-per-page="shootItemsPerPage"
        :headers="visibleHeaders"
        :items="sortedAndFilteredItems"
        hover
        :loading="loading || !connected"
        :items-per-page-options="itemsPerPageOptions"
        :custom-key-sort="customKeySort"
        must-sort
        class="g-table"
      >
        <template #headers="headers">
          <g-data-table-header
            v-bind="{...headers, sortBy }"
          />
        </template>
        <template #progress>
          <g-shoot-list-progress />
        </template>
        <template #loading>
          Loading clusters ...
        </template>
        <template #no-data>
          No clusters to show
        </template>
        <template #item="{ item }">
          <g-shoot-list-row
            :model-value="item"
            :visible-headers="visibleHeaders"
            @show-dialog="showDialog"
          />
        </template>
        <template #bottom="{ pageCount }">
          <g-data-table-footer
            v-model:page="page"
            v-model:items-per-page="shootItemsPerPage"
            :items-length="sortedAndFilteredItems.length"
            :items-per-page-options="itemsPerPageOptions"
            :page-count="pageCount"
          />
        </template>
      </v-data-table>
      <v-dialog
        v-if="!isShootItemEmpty"
        v-model="clusterAccessDialog"
        persistent
        max-width="850"
      >
        <v-card>
          <g-toolbar>
            Cluster Access
            <code class="text-toolbar-title">
              {{ currentName }}
            </code>
            <template #append>
              <v-btn
                variant="text"
                density="comfortable"
                icon="mdi-close"
                color="toolbar-title"
                @click.stop="hideDialog"
              />
            </template>
          </g-toolbar>
          <g-shoot-access-card
            ref="clusterAccess"
            :selected-shoot="shootItem"
            :hide-terminal-shortcuts="true"
          />
        </v-card>
      </v-dialog>
    </v-card>
  </v-container>
</template>

<script>
import {
  ref,
  reactive,
  provide,
  toRef,
} from 'vue'
import {
  mapState,
  mapWritableState,
  mapActions,
} from 'pinia'

import { useAuthnStore } from '@/store/authn'
import { useAuthzStore } from '@/store/authz'
import { useShootStore } from '@/store/shoot'
import { useSocketStore } from '@/store/socket'
import { useProjectStore } from '@/store/project'
import { useConfigStore } from '@/store/config'
import { useLocalStorageStore } from '@/store/localStorage'

import GToolbar from '@/components/GToolbar.vue'
import GShootListRow from '@/components/GShootListRow.vue'
import GShootListProgress from '@/components/GShootListProgress.vue'
import GTableColumnSelection from '@/components/GTableColumnSelection.vue'
import GIconBase from '@/components/icons/GIconBase.vue'
import GCertifiedKubernetes from '@/components/icons/GCertifiedKubernetes.vue'
import GDataTableFooter from '@/components/GDataTableFooter.vue'
import GDataTableHeader from '@/components/GDataTableHeader.vue'
import GShootAccessCard from '@/components/ShootDetails/GShootAccessCard.vue'

import { useProjectShootCustomFields } from '@/composables/useProjectShootCustomFields'
import { isCustomField } from '@/composables/useProjectShootCustomFields/helper'

import { mapTableHeader } from '@/utils'

import {
  debounce,
  filter,
  get,
  isEmpty,
  join,
  map,
  some,
  sortBy,
  upperCase,
} from '@/lodash'

export default {
  components: {
    GToolbar,
    GShootListRow,
    GShootListProgress,
    GShootAccessCard,
    GIconBase,
    GCertifiedKubernetes,
    GTableColumnSelection,
    GDataTableFooter,
    GDataTableHeader,
  },
  inject: ['logger'],
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.updateTableSettings()
    })
  },
  beforeRouteUpdate (to, from, next) {
    this.resetShootSearch()
    this.updateTableSettings()
    this.focusModeInternal = false

    // Reset expanded state in case project changes
    this.resetState(this.expandedWorkerGroups, { default: false })
    this.resetState(this.expandedAccessRestrictions, { default: false })
    this.resetState(this.expandedTicketLabels, { default: false })
    this.resetState(this.expandedConditions, { default: false })

    next()
  },
  beforeRouteLeave (to, from, next) {
    this.resetShootSearch()
    this.focusModeInternal = false

    next()
  },
  setup () {
    const projectStore = useProjectStore()

    const activePopoverKey = ref('')
    const expandedWorkerGroups = reactive({ default: false })
    const expandedAccessRestrictions = reactive({ default: false })
    const expandedTicketLabels = reactive({ default: false })
    const expandedConditions = reactive({ default: false })
    provide('activePopoverKey', activePopoverKey)
    provide('expandedWorkerGroups', expandedWorkerGroups)
    provide('expandedAccessRestrictions', expandedAccessRestrictions)
    provide('expandedTicketLabels', expandedTicketLabels)
    provide('expandedConditions', expandedConditions)

    const projectItem = toRef(projectStore, 'project')
    const {
      shootCustomFields,
    } = useProjectShootCustomFields(projectItem)

    return {
      activePopoverKey,
      expandedWorkerGroups,
      expandedAccessRestrictions,
      expandedTicketLabels,
      expandedConditions,
      shootCustomFields,
    }
  },
  data () {
    return {
      shootSearch: '',
      debouncedShootSearch: '',
      dialog: null,
      page: 1,
      selectedColumns: undefined,
      itemsPerPageOptions: [
        { value: 5, title: '5' },
        { value: 10, title: '10' },
        { value: 20, title: '20' },
      ],
    }
  },
  computed: {
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
    ...mapState(useAuthzStore, [
      'namespace',
      'canPatchShoots',
      'canDeleteShoots',
      'canCreateShoots',
      'canGetSecrets',
    ]),
    ...mapState(useConfigStore, {
      accessRestrictionConfig: 'accessRestriction',
      ticketConfig: 'ticket',
    }),
    ...mapState(useProjectStore, [
      'projectName',
    ]),
    ...mapState(useSocketStore, [
      'connected',
    ]),
    ...mapState(useShootStore, [
      'shootList',
      'shootListFilters',
      'loading',
      'selectedShoot',
      'onlyShootsWithIssues',
      'numberOfNewItemsSinceFreeze',
      'focusMode',
      'sortBy',
    ]),
    ...mapWritableState(useLocalStorageStore, [
      'shootSelectedColumns',
      'shootItemsPerPage',
      'shootSortBy',
      'shootCustomSelectedColumns',
      'shootCustomSortBy',
      'allProjectsShootFilter',
      'operatorFeatures',
    ]),
    defaultSortBy () {
      return [{ key: 'name', order: 'asc' }]
    },
    defaultItemsPerPage () {
      return 10
    },
    clusterAccessDialog: {
      get () {
        return this.dialog === 'access'
      },
      set (value) {
        if (!value) {
          this.hideDialog()
        }
      },
    },
    focusModeInternal: {
      get () {
        return this.focusMode
      },
      set (value) {
        this.setFocusMode(value)
      },
    },
    sortByInternal: {
      get () {
        return this.sortBy
      },
      set (value) {
        this.setSortBy(value)
      },
    },
    currentName () {
      return get(this.selectedShoot, 'metadata.name')
    },
    shootItem () {
      // property `shoot-item` of the mixin is required
      return this.selectedShoot || {}
    },
    isShootItemEmpty () {
      return !this.shootItem.metadata?.uid
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
      const isSortable = value => value && !this.focusModeInternal
      const headers = [
        {
          title: 'PROJECT',
          key: 'project',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: true,
          hidden: !!this.projectScope,
          stalePointerEvents: true,
        },
        {
          title: 'NAME',
          key: 'name',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: true,
          hidden: false,
          stalePointerEvents: true,
        },
        {
          title: 'INFRASTRUCTURE',
          key: 'infrastructure',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: true,
          hidden: false,
        },
        {
          title: 'SEED',
          key: 'seed',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: false,
          hidden: false,
        },
        {
          title: 'TECHNICAL ID',
          key: 'technicalId',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: false,
          hidden: !this.isAdmin,
        },
        {
          title: 'WORKERS',
          key: 'workers',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: false,
          hidden: false,
          expandedItems: this.expandedWorkerGroups,
        },
        {
          title: 'CREATED BY',
          key: 'createdBy',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: false,
          hidden: false,
        },
        {
          title: 'CREATED AT',
          key: 'createdAt',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: false,
          hidden: false,
        },
        {
          title: 'PURPOSE',
          key: 'purpose',
          sortable: isSortable(true),
          align: 'center',
          defaultSelected: true,
          hidden: false,
        },
        {
          title: 'STATUS',
          key: 'lastOperation',
          sortable: isSortable(true),
          align: 'center',
          cellClass: 'pl-4',
          defaultSelected: true,
          hidden: false,
          stalePointerEvents: true,
        },
        {
          title: 'VERSION',
          key: 'k8sVersion',
          sortable: isSortable(true),
          align: 'center',
          defaultSelected: true,
          hidden: false,
        },
        {
          title: 'READINESS',
          key: 'readiness',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: true,
          hidden: false,
          stalePointerEvents: true,
        },
        {
          title: 'ISSUE SINCE',
          key: 'issueSince',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: true,
          hidden: !this.issueSinceColumnVisible,
        },
        {
          title: 'HIGH AVAILABILITY',
          key: 'controlPlaneHighAvailability',
          sortable: true,
          align: 'start',
          defaultSelected: false,
          hidden: false,
        },
        {
          title: 'ACCESS RESTRICTIONS',
          key: 'accessRestrictions',
          sortable: false,
          align: 'start',
          defaultSelected: false,
          hidden: !this.accessRestrictionConfig || !this.isAdmin,
          expandedItems: this.expandedAccessRestrictions,
        },
        {
          title: 'TICKET',
          key: 'ticket',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: false,
          hidden: !this.gitHubRepoUrl || !this.isAdmin,
        },
        {
          title: 'TICKET LABELS',
          key: 'ticketLabels',
          sortable: false,
          align: 'start',
          defaultSelected: true,
          hidden: !this.gitHubRepoUrl || !this.isAdmin,
          expandedItems: this.expandedTicketLabels,
        },
        {
          title: 'ACTIONS',
          key: 'actions',
          sortable: false,
          align: 'end',
          defaultSelected: true,
          hidden: !(this.canDeleteShoots || this.canGetSecrets),
        },
      ]
      return map(headers, (header, index) => ({
        ...header,
        class: 'nowrap',
        weight: (index + 1) * 100,
        selected: get(this.selectedColumns, header.key, header.defaultSelected),
      }))
    },
    customHeaders () {
      const isSortable = value => value && !this.focusModeInternal
      const customHeaders = filter(this.shootCustomFields, ['showColumn', true])

      return map(customHeaders, ({
        align = 'left',
        name,
        key,
        path,
        columnSelectedByDefault: defaultSelected,
        tooltip,
        defaultValue,
        sortable,
        weight,
      }, index) => {
        return {
          customField: true,
          title: upperCase(name),
          class: 'nowrap',
          key,
          sortable: isSortable(sortable),
          align,
          selected: get(this.selectedColumns, key, defaultSelected),
          defaultSelected,
          hidden: false,
          path,
          tooltip,
          defaultValue,
          weight: weight || index,
        }
      })
    },
    allHeaders () {
      return sortBy([
        ...this.standardHeaders,
        ...this.customHeaders,
      ], ['weight', 'text'])
    },
    selectableHeaders () {
      return filter(this.allHeaders, ['hidden', false])
    },
    visibleHeaders () {
      return filter(this.selectableHeaders, ['selected', true])
    },
    sortableHeaders () {
      return filter(this.visibleHeaders, ['sortable', true])
    },
    customKeySort () {
      const noSort = () => 0
      const value = {}
      for (const header of this.sortableHeaders) {
        value[header.key] = noSort
      }
      return value
    },
    allFilters () {
      return [
        {
          text: 'Show only clusters with issues',
          value: 'onlyShootsWithIssues',
          selected: this.onlyShootsWithIssues,
          hidden: this.projectScope,
          disabled: this.changeFiltersDisabled,
        },
        {
          text: 'Hide progressing clusters',
          value: 'progressing',
          selected: this.isFilterActive('progressing'),
          hidden: this.projectScope || !this.isAdmin || this.showAllShoots,
          disabled: this.changeFiltersDisabled,
        },
        {
          text: 'Hide no operator action required issues',
          value: 'noOperatorAction',
          selected: this.isFilterActive('noOperatorAction'),
          hidden: this.projectScope || !this.isAdmin || this.showAllShoots,
          helpTooltip: [
            'Hide clusters that do not require action by an operator',
            '- Clusters with user issues',
            '- Clusters with temporary issues that will be retried automatically',
            '- Clusters with annotation dashboard.gardener.cloud/ignore-issues',
          ],
          disabled: this.changeFiltersDisabled,
        },
        {
          text: 'Hide clusters with deactivated reconciliation',
          value: 'deactivatedReconciliation',
          selected: this.isFilterActive('deactivatedReconciliation'),
          hidden: this.projectScope || !this.isAdmin || this.showAllShoots,
          disabled: this.changeFiltersDisabled,
        },
        {
          text: 'Hide clusters with configured ticket labels',
          value: 'hideTicketsWithLabel',
          selected: this.isFilterActive('hideTicketsWithLabel'),
          hidden: this.projectScope || !this.isAdmin || !this.gitHubRepoUrl || !this.hideClustersWithLabels.length || this.showAllShoots,
          helpTooltip: this.hideTicketsWithLabelTooltip,
          disabled: this.changeFiltersDisabled,
        },
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
      },
    },
    items () {
      return this.shootList ?? []
    },
    changeFiltersDisabled () {
      return this.focusModeInternal
    },
    showAllShoots () {
      return !this.showOnlyShootsWithIssues
    },
    filterTooltip () {
      return this.focusModeInternal
        ? 'Filters cannot be changed when focus mode is active'
        : ''
    },
    headlineSubtitle () {
      const subtitle = []
      if (!this.projectScope && this.showOnlyShootsWithIssues) {
        subtitle.push('Hide: Healthy Clusters')
        if (this.isFilterActive('progressing')) {
          subtitle.push('Progressing Clusters')
        }
        if (this.isFilterActive('noOperatorAction')) {
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
      return get(this.ticketConfig, 'gitHubRepoUrl')
    },
    hideClustersWithLabels () {
      return get(this.ticketConfig, 'hideClustersWithLabels', [])
    },
    filteredItems () {
      const query = this.debouncedShootSearch
      return query
        ? filter(this.items, item => this.searchItems(query, item))
        : [...this.items]
    },
    sortedAndFilteredItems () {
      return this.sortItems(this.filteredItems, this.sortByInternal)
    },
    issueSinceColumnVisible () {
      return this.operatorFeatures || (!this.projectScope && this.isAdmin)
    },
  },
  watch: {
    sortBy (sortBy) {
      if (some(sortBy, value => isCustomField(value.key))) {
        this.shootCustomSortBy = sortBy
      } else {
        this.shootCustomSortBy = null // clear project specific options
        this.shootSortBy = sortBy
      }
    },
  },
  methods: {
    ...mapActions(useShootStore, [
      'setSelection',
      'toogleShootListFilter',
      'subscribeShoots',
      'sortItems',
      'searchItems',
      'setFocusMode',
      'setSortBy',
    ]),
    resetShootSearch () {
      this.shootSearch = null
      this.debouncedShootSearch = null
    },
    async showDialog (args) {
      switch (args.action) {
        case 'access':
          try {
            await this.setSelection(args.shootItem.metadata)
            this.dialog = args.action
          } catch (err) {
            this.logger('Failed to select shoot: %s', err.message)
          }
      }
    },
    hideDialog () {
      this.dialog = null
      this.setSelection(null)
    },
    setSelectedHeader (header) {
      this.selectedColumns[header.key] = !header.selected
      this.saveSelectedColumns()
    },
    saveSelectedColumns () {
      this.shootSelectedColumns = this.currentStandardSelectedColumns
      this.shootCustomSelectedColumns = isEmpty(this.currentCustomSelectedColumns)
        ? null
        : this.currentCustomSelectedColumns
    },
    resetTableSettings () {
      this.selectedColumns = {
        ...this.defaultStandardSelectedColumns,
        ...this.defaultCustomSelectedColumns,
      }
      this.saveSelectedColumns()
      this.shootItemsPerPage = this.defaultItemsPerPage
      this.sortByInternal = this.defaultSortBy
    },
    updateTableSettings () {
      this.selectedColumns = {
        ...this.shootSelectedColumns,
        ...this.shootCustomSelectedColumns,
      }

      if (!isEmpty(this.shootCustomSortBy)) {
        this.sortByInternal = this.shootCustomSortBy
        return
      }

      if (!isEmpty(this.shootSortBy)) {
        this.sortByInternal = this.shootSortBy
        return
      }

      this.sortByInternal = this.defaultSortBy
    },
    toggleFilter ({ value: key }) {
      this.toogleShootListFilter(key)
      if (key === 'onlyShootsWithIssues') {
        this.subscribeShoots()
      }
    },
    isFilterActive (key) {
      const filters = this.shootListFilters
      return get(filters, key, false)
    },
    onUpdateShootSearch (value) {
      this.shootSearch = value

      this.setDebouncedShootSearch()
    },
    setDebouncedShootSearch: debounce(function () {
      this.debouncedShootSearch = this.shootSearch
    }, 500),
    resetState (reactiveObject, defaultState) {
      for (const key in reactiveObject) {
        delete reactiveObject[key]
      }
      Object.assign(reactiveObject, defaultState)
    },
  },
}
</script>
