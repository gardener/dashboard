<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-card class="ma-3">
      <v-toolbar flat height="72" color="toolbar-background">
        <g-icon-base width="44" height="60" view-box="0 0 298 403" class="mr-2" icon-color="toolbar-title">
          <g-certified-kubernetes/>
        </g-icon-base>
        <v-toolbar-title class="text-white">
          <div class="text-h5 text-toolbar-title">Kubernetes Clusters</div>
          <div class="text-subtitle-1 text-toolbar-title">{{headlineSubtitle}}</div>
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-tooltip location="bottom">
          <template #activator="{ props }">
            <div v-bind="props">
              <v-badge
                class="mr-5"
                bordered
                color="primary-lighten-3"
                :content="numberOfNewItemsSinceFreeze"
                :value="numberOfNewItemsSinceFreeze > 0"
              >
                <v-switch
                  v-model="focusModeInternal"
                  v-if="!projectScope && isAdmin"
                  class="mr-3"
                  color="primary-lighten-3"
                  hide-details>
                  <template #label>
                    <span class="text-subtitle-1 text-toolbar-title">Focus</span>
                  </template>
                </v-switch>
              </v-badge>
            </div>
          </template>
          <span class="font-weight-bold">Focus Mode</span>
          <ul>
            <li>Cluster list sorting is freezed</li>
            <li>Items in the list will still be updated</li>
            <li>New clusters will not be added to the list until you disable focus mode</li>
            <li>Removed items will be shown as stale (greyed out)</li>
          </ul>
          <template v-if="numberOfNewItemsSinceFreeze > 0">
            <v-divider color="white"></v-divider>
            <span class="font-weight-bold">{{numberOfNewItemsSinceFreeze}}</span>
            new clusters were added to the list since you enabled focus mode.
          </template>
        </v-tooltip>
        <v-tooltip location="top" v-if="shootSearch || items.length > 3">
          <template #activator="{ props }">
            <v-text-field
              v-bind="props"
              prepend-inner-icon="mdi-magnify"
              color="primary"
              label="Search"
              clearable
              hide-details
              variant="solo"
              @update:model-value="onInputSearch"
              @keyup.esc="shootSearch=''"
              class="mr-3"
            ></v-text-field>
          </template>
          Search terms are <span class="font-weight-bold">ANDed</span>.<br />
          <span class="font-weight-bold">Use quotes</span> for exact words or phrases: <v-chip label color="primary" small>"my-shoot"</v-chip> <v-chip label color="primary" small>"John Doe"</v-chip><br />
          <span class="font-weight-bold">Use minus sign</span> to exclude words that you don't want: <v-chip label color="primary" small>-myproject</v-chip> <v-chip label color="primary" small>-"Jane Doe"</v-chip><br />
        </v-tooltip>
        <v-tooltip location="top" v-if="canCreateShoots && projectScope">
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
          :filterTooltip="filterTooltip"
          @set-selected-header="setSelectedHeader"
          @reset="resetTableSettings"
          @toggle-filter="toggleFilter"
        ></g-table-column-selection>
      </v-toolbar>
      <v-data-table
        :headers="visibleHeaders"
        :items="items"
        hover
        v-model:options="options"
        v-model:sort-by="sortByInternal"
        v-model:sort-desc="sortDescInternal"
        :loading="loading || !connected"
        :items-per-page-options="itemsPerPageOptions"
        :search="shootSearch"
        :custom-filter="searchItems"
        must-sort
        :custom-sort="sortItems"
        class="g-table"
      >
        <template #progress>
          <g-shoot-list-progress/>
        </template>
        <template #item="{ item }">
          <g-shoot-list-row
            :key="item.raw.metadata.uid"
            :shoot-item="item.raw"
            :visible-headers="visibleHeaders"
            @show-dialog="showDialog"
          />
        </template>
      </v-data-table>
      <v-dialog
        v-model="clusterAccessDialog"
        max-width="850"
      >
        <v-card>
          <g-toolbar
            density="default"
          >
            Cluster Access
            <code class="text-toolbar-title">
              {{ currentName }}
            </code>
            <template v-slot:append>
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
            :shoot-item="shootItem"
            :hide-terminal-shortcuts="true"
          />
        </v-card>
      </v-dialog>
    </v-card>
  </v-container>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { mapState, mapActions } from 'pinia'
import {
  useAuthnStore,
  useAuthzStore,
  useShootStore,
  useSocketStore,
  useProjectStore,
  useConfigStore,
} from '@/store'

import GToolbar from '@/components/GToolbar.vue'
import GShootListRow from '@/components/GShootListRow.vue'
import GShootListProgress from '@/components/GShootListProgress.vue'
import GTableColumnSelection from '@/components/GTableColumnSelection.vue'
import GIconBase from '@/components/icons/GIconBase.vue'
import GCertifiedKubernetes from '@/components/icons/GCertifiedKubernetes.vue'
import { mapTableHeader } from '@/utils'

import filter from 'lodash/filter'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import join from 'lodash/join'
import map from 'lodash/map'
import pick from 'lodash/pick'
import sortBy from 'lodash/sortBy'
import startsWith from 'lodash/startsWith'
import upperCase from 'lodash/upperCase'
import debounce from 'lodash/debounce'

export default {
  components: {
    GToolbar,
    GShootListRow,
    GShootListProgress,
    GShootAccessCard: defineAsyncComponent(() => import('@/components/ShootDetails/GShootAccessCard.vue')),
    GIconBase,
    GCertifiedKubernetes,
    GTableColumnSelection,
  },
  data () {
    return {
      shootSearch: '',
      dialog: null,
      options: undefined,
      cachedItems: null,
      selectedColumns: undefined,
      itemsPerPageOptions: [
        { value: 5, title: '5' },
        { value: 10, title: '10' },
        { value: 20, title: '20' },
      ],
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
        this.setLocalStorageObject(`project/${this.projectName}/shoot-list/options`, { sortBy, sortDesc })

        const currentTableOptions = this.getLocalStorageObject('projects/shoot-list/options')
        const tableOptions = {
          ...this.defaultTableOptions,
          ...currentTableOptions,
          itemsPerPage,
        }
        this.setLocalStorageObject('projects/shoot-list/options', tableOptions)
      } else {
        this.setLocalStorageObject(`project/${this.projectName}/shoot-list/options`) // clear project specific options
        this.setLocalStorageObject('projects/shoot-list/options', { sortBy, sortDesc, itemsPerPage })
      }
    },
  },
  methods: {
    ...mapActions(useShootStore, [
      'setSelection',
      'setShootListFilter',
      'subscribe',
      'sortItems',
      'searchItems',
      'setFocusMode',
      'setSortBy',
      'setSortDesc',
    ]),
    setLocalStorageObject (key, value) {
      useLocalStorage(key).value = value
    },
    getLocalStorageObject (key) {
      return useLocalStorage(key).value
    },
    async showDialog (args) {
      switch (args.action) {
        case 'access':
          try {
            await this.setSelection(args.shootItem.metadata)
            this.dialog = args.action
          } catch (error) {
            // Currently not handled
          }
      }
    },
    hideDialog () {
      this.dialog = null
      this.setSelection(null)
    },
    setSelectedHeader (header) {
      this.selectedColumns[header.value] = !header.selected
      this.saveSelectedColumns()
    },
    saveSelectedColumns () {
      this.setLocalStorageObject('projects/shoot-list/selected-columns', this.currentStandardSelectedColumns)
      if (isEmpty(this.currentCustomSelectedColumns)) {
        this.setLocalStorageObject(`project/${this.projectName}/shoot-list/selected-columns`)
      } else {
        this.setLocalStorageObject(`project/${this.projectName}/shoot-list/selected-columns`, this.currentCustomSelectedColumns)
      }
    },
    resetTableSettings () {
      this.selectedColumns = {
        ...this.defaultStandardSelectedColumns,
        ...this.defaultCustomSelectedColumns,
      }
      this.saveSelectedColumns()
      this.options = this.defaultTableOptions
    },
    updateTableSettings () {
      const selectedColumns = this.getLocalStorageObject('projects/shoot-list/selected-columns')
      const projectSpecificSelectedColumns = this.getLocalStorageObject(`project/${this.projectName}/shoot-list/selected-columns`)
      this.selectedColumns = {
        ...selectedColumns,
        ...projectSpecificSelectedColumns,
      }
      const projectSpecificTableOptions = this.getLocalStorageObject(`project/${this.projectName}/shoot-list/options`)
      const tableOptions = this.getLocalStorageObject('projects/shoot-list/options')
      this.options = {
        ...this.defaultTableOptions,
        ...tableOptions,
        ...projectSpecificTableOptions,
      }
    },
    async toggleFilter ({ value }) {
      const key = value
      await this.setShootListFilter({ filter: key, value: !this.shootListFilters[key] })

      this.setLocalStorageObject('project/_all/shoot-list/filter', pick(this.shootListFilters, [
        'onlyShootsWithIssues',
        'progressing',
        'noOperatorAction',
        'deactivatedReconciliation',
        'hideTicketsWithLabel',
      ]))

      if (key === 'onlyShootsWithIssues') {
        await this.subscribe()
      }
    },
    isFilterActive (key) {
      const filters = this.shootListFilters
      return get(filters, key, false)
    },
    onInputSearch: debounce(function (value) {
      this.shootSearch = value
    }, 500),
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
      'projectFromProjectList',
      'shootCustomFieldList',
      'shootCustomFields',
    ]),
    ...mapState(useSocketStore, [
      'connected',
    ]),
    ...mapState(useShootStore, [
      'shootList',
      'shootListFilters',
      'loading',
      'selectedItem',
      'onlyShootsWithIssues',
      'numberOfNewItemsSinceFreeze',
      'focusMode',
      'sortBy',
      'sortDesc',
    ]),
    defaultTableOptions () {
      return {
        sortBy: ['name'],
        sortDesc: [false],
        itemsPerPage: 10,
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
    sortDescInternal: {
      get () {
        return this.sortDesc
      },
      set (value) {
        this.setSortDesc(value)
      },
    },
    currentName () {
      return get(this.selectedItem, 'metadata.name')
    },
    shootItem () {
      // property `shoot-item` of the mixin is required
      return this.selectedItem || {}
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
          hidden: this.projectScope || !this.isAdmin,
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
          hidden: !(this.canDeleteShoots || this.canGetSecrets),
        },
      ]
      return map(headers, (header, index) => ({
        ...header,
        class: 'nowrap',
        weight: (index + 1) * 100,
        selected: get(this.selectedColumns, header.value, header.defaultSelected),
      }))
    },
    customHeaders () {
      const isSortable = value => value && !this.focusModeInternal
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
      return this.cachedItems || this.shootList
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
    this.focusModeInternal = false
    next()
  },
  beforeRouteLeave (to, from, next) {
    this.cachedItems = this.shootList.slice(0)
    this.shootSearch = null
    this.focusModeInternal = false
    next()
  },
}
</script>
