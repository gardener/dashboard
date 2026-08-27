<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container
    fluid
    class="d-flex flex-column overflow-hidden max-h-100"
  >
    <v-card class="ma-3 d-flex flex-column flex-grow-1 overflow-hidden">
      <g-shoot-list-toolbar
        :model-value="shootSearch"
        :namespace="namespace"
        :project-scope="projectScope"
        :can-view-landscape="canViewLandscape"
        :can-create-shoots="canCreateShoots"
        :issue-since-column-visible="issueSinceColumnVisible"
        :focus-mode="focusModeInternal"
        :number-of-new-items-since-freeze="numberOfNewItemsSinceFreeze"
        :selectable-headers="selectableHeaders"
        @update:model-value="onUpdateShootSearch"
        @update:focus-mode="focusModeInternal = $event"
        @set-search="setShootSearch"
        @set-selected-header="setSelectedHeader"
        @reset="resetTableSettings"
      />
      <v-data-table-virtual
        v-model:sort-by="sortByInternal"
        :headers="visibleHeaders"
        :items="sortedAndFilteredItems"
        :loading="loading || !connected"
        :custom-key-sort="customKeySort"
        density="compact"
        hover
        :item-key="getItemKey"
        must-sort
        fixed-header
        class="g-table flex-grow-1 min-h-0px"
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
        <template #item="{ item, itemRef }">
          <g-shoot-list-row
            :ref="itemRef"
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
} from 'vue'
import {
  mapState,
  mapWritableState,
  mapActions,
} from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useShootStore } from '@/store/shoot'
import { useSocketStore } from '@/store/socket'
import { useProjectStore } from '@/store/project'
import { useConfigStore } from '@/store/config'
import { useLocalStorageStore } from '@/store/localStorage'

import GShootListToolbar from '@/components/GShootListToolbar.vue'
import GShootListRow from '@/components/GShootListRow.vue'
import GShootListProgress from '@/components/GShootListProgress.vue'
import GDataTableFooter from '@/components/GDataTableFooter.vue'
import GShootListActions from '@/components/GShootListActions.vue'

import { useProjectShootCustomFields } from '@/composables/useProjectShootCustomFields'
import { isCustomField } from '@/composables/useProjectShootCustomFields/helper'
import { useProvideShootAction } from '@/composables/useShootAction'
import { useShallowRouteSearchQuery } from '@/composables/useRouteSearchQuery'

import { mapTableHeader } from '@/utils'

import upperCase from 'lodash/upperCase'
import sortBy from 'lodash/sortBy'
import some from 'lodash/some'
import map from 'lodash/map'
import isEmpty from 'lodash/isEmpty'
import unset from 'lodash/unset'
import get from 'lodash/get'
import filter from 'lodash/filter'
import debounce from 'lodash/debounce'

export default {
  components: {
    GShootListToolbar,
    GShootListRow,
    GShootListProgress,
    GDataTableFooter,
    GShootListActions,
  },
  inject: ['logger'],
  beforeRouteUpdate (to, from) {
    this.focusModeInternal = false

    // Reset expanded state in case project changes
    this.resetState(this.expandedWorkerGroups, { default: false })
    this.resetState(this.expandedAccessRestrictions, { default: false })
  },
  beforeRouteLeave () {
    this.focusModeInternal = false
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

    const authzStore = useAuthzStore()
    const debouncedShootSearch = ref()
    const {
      searchQuery: shootSearch,
    } = useShallowRouteSearchQuery({
      onWrite (search) {
        shootStore.activateShootList({
          namespace: authzStore.namespace,
          search,
        })
      },
      onRouteCommitted (search) {
        debouncedShootSearch.value = search
      },
    })
    debouncedShootSearch.value = shootSearch.value

    function setShootSearch (value) {
      shootSearch.value = value
      debouncedShootSearch.value = shootSearch.value
    }

    const setDebouncedShootSearch = debounce(() => {
      debouncedShootSearch.value = shootSearch.value
    }, 300)

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
      selectedColumns: {},
    }
  },
  computed: {
    ...mapState(useAuthzStore, [
      'namespace',
      'canPatchShoots',
      'canDeleteShoots',
      'canCreateShoots',
      'canGetCloudProviderCredentials',
      'canViewLandscape',
    ]),
    ...mapState(useConfigStore, {
      accessRestrictionConfig: 'accessRestriction',
      ticketConfig: 'ticket',
    }),
    gitHubRepoUrl () {
      return get(this.ticketConfig, ['gitHubRepoUrl'])
    },
    ...mapState(useProjectStore, [
      'projectName',
    ]),
    ...mapState(useSocketStore, [
      'connected',
    ]),
    ...mapState(useShootStore, [
      'shootList',
      'loading',
      'selectedShoot',
      'numberOfNewItemsSinceFreeze',
      'focusMode',
      'sortBy',
    ]),
    ...mapWritableState(useLocalStorageStore, [
      'shootSelectedColumns',
      'shootSortBy',
      'shootCustomSelectedColumns',
      'shootCustomSortBy',
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
          hidden: !this.canViewLandscape,
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
          hidden: !this.canViewLandscape,
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
          hidden: !this.accessRestrictionConfig || !this.canViewLandscape,
        },
        {
          title: 'TICKET',
          key: 'ticket',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: false,
          hidden: !this.gitHubRepoUrl || !this.canViewLandscape,
        },
        {
          title: 'TICKET LABELS',
          key: 'ticketLabels',
          sortable: false,
          align: 'start',
          defaultSelected: true,
          hidden: !this.gitHubRepoUrl || !this.canViewLandscape,
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
    projectScope () {
      return this.namespace !== '_all'
    },
    items () {
      return this.shootList ?? []
    },
    filteredItems () {
      const query = this.debouncedShootSearch
      return query
        ? filter(this.items, this.searchItems(query))
        : [...this.items]
    },
    sortedAndFilteredItems () {
      return this.sortItems(this.filteredItems, this.sortByInternal)
    },
    issueSinceColumnVisible () {
      return this.operatorFeatures || (!this.projectScope && this.canViewLandscape)
    },
  },
  watch: {
    shootCustomSelectedColumns: {
      handler: 'updateTableSettings',
      deep: true,
      immediate: true,
    },
    shootCustomSortBy: {
      handler: 'updateTableSettings',
      deep: true,
      immediate: true,
    },
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
