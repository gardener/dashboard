<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-card class="ma-3">
      <v-toolbar flat height="72" color="toolbar-background">
        <icon-base width="44" height="60" view-box="0 0 298 403" class="mr-2" icon-color="toolbar-title">
          <certified-kubernetes></certified-kubernetes>
        </icon-base>
        <v-toolbar-title class="text-white">
          <div class="text-h5 toolbar-title--text">Kubernetes Clusters</div>
          <div class="text-subtitle-1 toolbar-title--text">{{headlineSubtitle}}</div>
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-tooltip location="bottom">
          <template v-slot:activator="{ props }">
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
                  <template v-slot:label>
                    <span class="text-subtitle-1 toolbar-title--text">Focus</span>
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
            <span class="font-weight-bold">{{numberOfNewItemsSinceFreeze}}</span> new clusters were added to the list since you enabled focus mode.
          </template>
        </v-tooltip>
        <v-tooltip location="top" v-if="shootSearch || items.length > 3">
          <template v-slot:activator="{ props }">
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
        <!--<v-tooltip location="top" v-if="canCreateShoots && projectScope">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon :to="{ name: 'NewShoot', params: {  namespace } }">
              <v-icon color="toolbar-title">mdi-plus</v-icon>
            </v-btn>
          </template>
          <span>Create Cluster</span>
        </v-tooltip>-->
        <table-column-selection
          :headers="selectableHeaders"
          :filters="selectableFilters"
          :filterTooltip="filterTooltip"
          @set-selected-header="setSelectedHeader"
          @reset="resetTableSettings"
          @toggle-filter="toggleFilter"
        ></table-column-selection>
      </v-toolbar>
      <!-- <v-data-table
        :headers="visibleHeaders"
        :items="items"
        v-model:options="options"
        v-model:sort-by="sortByInternal"
        v-model:sort-desc="sortDescInternal"
        :loading="loading || !connected"
        :footer-props="{ 'items-per-page-options': [5,10,20] }"
        :search="shootSearch"
        :custom-filter="searchItems"
        must-sort
        :custom-sort="sortItems"
      >
        <template v-slot:progress>
          <shoot-list-progress></shoot-list-progress>
        </template>
        <template v-slot:item="{ item }">
          <shoot-list-row
            :shoot-item="item"
            :visible-headers="visibleHeaders"
            @show-dialog="showDialog"
            :key="item.metadata.uid"
          ></shoot-list-row>
        </template>
      </v-data-table> -->

      <!-- <v-dialog v-model="clusterAccessDialog" max-width="850">
        <v-card>
          <v-card-title class="toolbar-background toolbar-title--text">
            <div class="text-h5">Cluster Access <code class="bg-toolbar-background bg-toolbar-background-lighten-1 text-toolbar-title">{{currentName}}</code></div>
            <v-spacer></v-spacer>
            <v-btn icon class="text-grey-lighten-4" @click="hideDialog">
              <v-icon color="toolbar-title">mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <shoot-access-card ref="clusterAccess" :shoot-item="shootItem" :hide-terminal-shortcuts="true"></shoot-access-card>
        </v-card>
      </v-dialog> -->
    </v-card>
  </v-container>
</template>

<script>
import { mapGetters, mapActions, mapMutations, mapState } from 'vuex'
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
import ShootListRow from '@/components/ShootListRow.vue'
import ShootListProgress from '@/components/ShootListProgress.vue'
import IconBase from '@/components/icons/IconBase.vue'
import CertifiedKubernetes from '@/components/icons/CertifiedKubernetes.vue'
import TableColumnSelection from '@/components/TableColumnSelection.vue'
import { mapTableHeader } from '@/utils'
const ShootAccessCard = () => import('@/components/ShootDetails/ShootAccessCard.vue')

export default {
  name: 'shoot-list',
  components: {
    ShootListRow,
    ShootListProgress,
    ShootAccessCard,
    IconBase,
    CertifiedKubernetes,
    TableColumnSelection
  },
  data () {
    return {
      shootSearch: '',
      dialog: null,
      options: undefined,
      cachedItems: null,
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
        this.$localStorage.removeItem(`project/${this.projectName}/shoot-list/options`) // clear project specific options
        this.$localStorage.setObject('projects/shoot-list/options', { sortBy, sortDesc, itemsPerPage })
      }
    }
  },
  methods: {
    ...mapActions([
      'setSelectedShoot',
      'setShootListFilter'
    ]),
    ...mapActions([
      'subscribeShoots'
    ]),
    ...mapActions('shoots', [
      'setFocusMode'
    ]),
    ...mapMutations('shoots', {
      setSortBy: 'SET_SORT_BY',
      setSortDesc: 'SET_SORT_DESC'
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
      this.setSelectedShoot(null)
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

      this.$localStorage.setObject('project/_all/shoot-list/filter', pick(this.getShootListFilters, [
        'onlyShootsWithIssues',
        'progressing',
        'noOperatorAction',
        'deactivatedReconciliation',
        'hideTicketsWithLabel'
      ]))

      if (key === 'onlyShootsWithIssues') {
        await this.subscribeShoots()
      }
    },
    isFilterActive (key) {
      const filters = this.getShootListFilters
      return get(filters, key, false)
    },
    onInputSearch: debounce(function (value) {
      this.shootSearch = value
    }, 500)
  },
  computed: {
    ...mapGetters({
      mappedItems: 'shootList',
      selectedItem: 'selectedShoot'
    }),
    ...mapGetters([
      'isAdmin',
      'getShootListFilters',
      'canPatchShoots',
      'canDeleteShoots',
      'canCreateShoots',
      'canGetSecrets',
      'onlyShootsWithIssues',
      'projectFromProjectList',
      'projectName',
      'shootCustomFieldList',
      'shootCustomFields'
    ]),
    ...mapGetters('shoots', [
      'loading'
    ]),
    ...mapState('socket', [
      'connected'
    ]),
    ...mapGetters('shoots', [
      'sortItems',
      'searchItems',
      'numberOfNewItemsSinceFreeze'
    ]),
    ...mapState([
      'cfg',
      'namespace',
      'shoots/focusMode',
      'shoots/sortBy',
      'shoots/sortDesc'
    ]),
    ...mapState('shoots', [
      'focusMode',
      'sortBy',
      'sortDesc'
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
    focusModeInternal: {
      get () {
        return this.focusMode
      },
      set (value) {
        this.setFocusMode(value)
      }
    },
    sortByInternal: {
      get () {
        return this.sortBy
      },
      set (value) {
        this.setSortBy(value)
      }
    },
    sortDescInternal: {
      get () {
        return this.sortDesc
      },
      set (value) {
        this.setSortDesc(value)
      }
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
          text: 'PROJECT',
          value: 'project',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: true,
          hidden: !!this.projectScope,
          stalePointerEvents: true
        },
        {
          text: 'NAME',
          value: 'name',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: true,
          hidden: false,
          stalePointerEvents: true
        },
        {
          text: 'INFRASTRUCTURE',
          value: 'infrastructure',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'SEED',
          value: 'seed',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: false,
          hidden: false
        },
        {
          text: 'TECHNICAL ID',
          value: 'technicalId',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: false,
          hidden: !this.isAdmin
        },
        {
          text: 'CREATED BY',
          value: 'createdBy',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: false,
          hidden: false
        },
        {
          text: 'CREATED AT',
          value: 'createdAt',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: false,
          hidden: false
        },
        {
          text: 'PURPOSE',
          value: 'purpose',
          sortable: isSortable(true),
          align: 'center',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'STATUS',
          value: 'lastOperation',
          sortable: isSortable(true),
          align: 'center',
          cellClass: 'pl-4',
          defaultSelected: true,
          hidden: false,
          stalePointerEvents: true
        },
        {
          text: 'VERSION',
          value: 'k8sVersion',
          sortable: isSortable(true),
          align: 'center',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'READINESS',
          value: 'readiness',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: true,
          hidden: false,
          stalePointerEvents: true
        },
        {
          text: 'ISSUE SINCE',
          value: 'issueSince',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: true,
          hidden: this.projectScope || !this.isAdmin
        },
        {
          text: 'HIGH AVAILABILITY',
          value: 'controlPlaneHighAvailability',
          sortable: true,
          align: 'start',
          defaultSelected: false,
          hidden: false
        },
        {
          text: 'ACCESS RESTRICTIONS',
          value: 'accessRestrictions',
          sortable: false,
          align: 'start',
          defaultSelected: false,
          hidden: !this.cfg.accessRestriction || !this.isAdmin
        },
        {
          text: 'TICKET',
          value: 'ticket',
          sortable: isSortable(true),
          align: 'start',
          defaultSelected: false,
          hidden: !this.gitHubRepoUrl || !this.isAdmin
        },
        {
          text: 'TICKET LABELS',
          value: 'ticketLabels',
          sortable: false,
          align: 'start',
          defaultSelected: true,
          hidden: !this.gitHubRepoUrl || !this.isAdmin
        },
        {
          text: 'ACTIONS',
          value: 'actions',
          sortable: false,
          align: 'end',
          defaultSelected: true,
          hidden: !(this.canDeleteShoots || this.canGetSecrets)
        }
      ]
      return map(headers, (header, index) => ({
        ...header,
        class: 'nowrap',
        weight: (index + 1) * 100,
        selected: get(this.selectedColumns, header.value, header.defaultSelected)
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
        weight
      }, index) => {
        return {
          customField: true,
          text: upperCase(name),
          class: 'nowrap',
          value: key,
          sortable: isSortable(sortable),
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
          hidden: this.projectScope,
          disabled: this.changeFiltersDisabled
        },
        {
          text: 'Hide progressing clusters',
          value: 'progressing',
          selected: this.isFilterActive('progressing'),
          hidden: this.projectScope || !this.isAdmin || this.showAllShoots,
          disabled: this.changeFiltersDisabled
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
            '- Clusters with annotation dashboard.gardener.cloud/ignore-issues'
          ],
          disabled: this.changeFiltersDisabled
        },
        {
          text: 'Hide clusters with deactivated reconciliation',
          value: 'deactivatedReconciliation',
          selected: this.isFilterActive('deactivatedReconciliation'),
          hidden: this.projectScope || !this.isAdmin || this.showAllShoots,
          disabled: this.changeFiltersDisabled
        },
        {
          text: 'Hide clusters with configured ticket labels',
          value: 'hideTicketsWithLabel',
          selected: this.isFilterActive('hideTicketsWithLabel'),
          hidden: this.projectScope || !this.isAdmin || !this.gitHubRepoUrl || !this.hideClustersWithLabels.length || this.showAllShoots,
          helpTooltip: this.hideTicketsWithLabelTooltip,
          disabled: this.changeFiltersDisabled
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
      return get(this.cfg, 'ticket.gitHubRepoUrl')
    },
    hideClustersWithLabels () {
      return get(this.cfg, 'ticket.hideClustersWithLabels', [])
    }
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
    this.cachedItems = this.mappedItems.slice(0)
    this.shootSearch = null
    this.focusModeInternal = false
    next()
  }
}
</script>
