<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-card class="ma-3">
      <g-toolbar
        prepend-icon="mdi-hexagon-multiple"
        :height="64"
      >
        <div class="text-h6">
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
                @keyup.esc="setShootSearch(null)"
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
      <v-data-table-virtual
        v-model:sort-by="sortByInternal"
        :headers="visibleHeaders"
        :items="sortedAndFilteredItems"
        :loading="loading || !connected"
        :custom-key-sort="customKeySort"
        density="compact"
        hover
        item-height="37"
        :item-key="getItemKey"
        must-sort
        fixed-header
        class="g-table"
        style="max-height: calc(100vh - 180px)"
      >
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
          />
        </template>
        <template #bottom>
          <g-data-table-footer
            :items-length="sortedAndFilteredItems.length"
            items-label="Clusters"
          />
        </template>
      </v-data-table-virtual>
    </v-card>
    <g-shoot-list-actions />
  </v-container>
</template>

<script>
import {
  ref,
  reactive,
  provide,
  toRef,
  watch,
} from 'vue'
import {
  mapState,
  mapWritableState,
  mapActions,
} from 'pinia'
import { useUrlSearchParams } from '@vueuse/core'

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
import GDataTableFooter from '@/components/GDataTableFooter.vue'
import GShootListActions from '@/components/GShootListActions.vue'

import { useProjectShootCustomFields } from '@/composables/useProjectShootCustomFields'
import { isCustomField } from '@/composables/useProjectShootCustomFields/helper'
import { useProvideShootAction } from '@/composables/useShootAction'

import { mapTableHeader } from '@/utils'

import upperCase from 'lodash/upperCase'
import sortBy from 'lodash/sortBy'
import some from 'lodash/some'
import map from 'lodash/map'
import join from 'lodash/join'
import isEmpty from 'lodash/isEmpty'
import unset from 'lodash/unset'
import get from 'lodash/get'
import filter from 'lodash/filter'
import debounce from 'lodash/debounce'

export default {
  components: {
    GToolbar,
    GShootListRow,
    GShootListProgress,
    GTableColumnSelection,
    GDataTableFooter,
    GShootListActions,
  },
  inject: ['logger'],
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.updateTableSettings()
    })
  },
  beforeRouteUpdate (to, from, next) {
    if (to.path !== from.path) {
      this.setShootSearch(null)
    }
    this.updateTableSettings()
    this.focusModeInternal = false

    // Reset expanded state in case project changes
    this.resetState(this.expandedWorkerGroups, { default: false })
    this.resetState(this.expandedAccessRestrictions, { default: false })

    next()
  },
  beforeRouteLeave (to, from, next) {
    this.setShootSearch(null)
    this.focusModeInternal = false

    next()
  },
  setup () {
    const projectStore = useProjectStore()
    const shootStore = useShootStore()

    useProvideShootAction({ shootStore })

    const activePopoverKey = ref('')
    const expandedWorkerGroups = reactive({ default: false })
    const expandedAccessRestrictions = reactive({ default: false })
    provide('activePopoverKey', activePopoverKey)
    provide('expandedWorkerGroups', expandedWorkerGroups)
    provide('expandedAccessRestrictions', expandedAccessRestrictions)

    const projectItem = toRef(projectStore, 'project')
    const {
      shootCustomFields,
    } = useProjectShootCustomFields(projectItem)

    const params = useUrlSearchParams('hash-params')
    const shootSearch = ref(params.q)
    const debouncedShootSearch = ref(shootSearch.value)

    function setShootSearch (value) {
      debouncedShootSearch.value = shootSearch.value = value
    }

    const setDebouncedShootSearch = debounce(() => {
      debouncedShootSearch.value = shootSearch.value
    }, 300)

    watch(() => params.q, value => {
      if (shootSearch.value !== value) {
        setShootSearch(value)
      }
    })

    watch(debouncedShootSearch, value => {
      if (!value) {
        params.q = null
      } else if (params.q !== value) {
        params.q = value
      }
    })

    function onUpdateShootSearch (value) {
      shootSearch.value = value
      setDebouncedShootSearch()
    }

    return {
      activePopoverKey,
      expandedWorkerGroups,
      expandedAccessRestrictions,
      shootCustomFields,
      shootSearch,
      debouncedShootSearch,
      setShootSearch,
      onUpdateShootSearch,
    }
  },
  data () {
    return {
      dialog: null,
      selectedColumns: undefined,
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
      'canGetCloudProviderCredentials',
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
      'shootSortBy',
      'shootCustomSelectedColumns',
      'shootCustomSortBy',
      'allProjectsShootFilter',
      'operatorFeatures',
    ]),
    defaultSortBy () {
      return [{ key: 'name', order: 'asc' }]
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
      return get(this.selectedShoot, ['metadata', 'name'])
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
          align: 'center',
          defaultSelected: false,
          hidden: false,
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
          title: 'SEED',
          key: 'seed',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: false,
          hidden: false,
        },
        {
          title: 'SEED READINESS',
          key: 'seedReadiness',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: true,
          hidden: !this.isAdmin,
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
        },
        {
          title: 'ACTIONS',
          key: 'actions',
          sortable: false,
          align: 'end',
          defaultSelected: true,
          hidden: !(this.canDeleteShoots || this.canGetCloudProviderCredentials),
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
      return get(this.ticketConfig, ['gitHubRepoUrl'])
    },
    hideClustersWithLabels () {
      return get(this.ticketConfig, ['hideClustersWithLabels'], [])
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
      'toogleShootListFilter',
      'subscribeShoots',
      'sortItems',
      'searchItems',
      'setFocusMode',
      'setSortBy',
    ]),
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
      return get(filters, [key], false)
    },
    resetState (reactiveObject, defaultState) {
      for (const key in reactiveObject) {
        unset(reactiveObject, [key])
      }
      Object.assign(reactiveObject, defaultState)
    },
    getItemKey (item, fallback) {
      return get(item, ['raw', 'metadata', 'uid'], fallback)
    },
  },
}
</script>
