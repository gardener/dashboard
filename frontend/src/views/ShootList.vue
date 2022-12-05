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
        <v-toolbar-title class="white--text">
          <div class="text-h5 toolbar-title--text">Kubernetes Clusters</div>
          <div class="text-subtitle-1 toolbar-title--text">{{headlineSubtitle}}</div>
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-tooltip top v-if="shootSearch || items.length > 3">
          <template v-slot:activator="{ on }">
            <v-text-field
              v-on="on"
              prepend-inner-icon="mdi-magnify"
              color="primary"
              label="Search"
              clearable
              hide-details
              flat
              solo
              @input="onInputSearch"
              @keyup.esc="shootSearch=''"
              class="mr-3"
            ></v-text-field>
          </template>
          Search terms are <span class="font-weight-bold">ANDed</span>.<br />
          <span class="font-weight-bold">Use quotes</span> for exact words or phrases: <v-chip label color="primary" small>"my-shoot"</v-chip> <v-chip label color="primary" small>"John Doe"</v-chip><br />
          <span class="font-weight-bold">Use minus sign</span> to exclude words that you don't want: <v-chip label color="primary" small>-myproject</v-chip> <v-chip label color="primary" small>-"Jane Doe"</v-chip><br />
        </v-tooltip>
        <v-tooltip top v-if="canCreateShoots && projectScope">
          <template v-slot:activator="{ on }">
             <v-btn v-on="on" icon :to="{ name: 'NewShoot', params: {  namespace } }">
               <v-icon color="toolbar-title">mdi-plus</v-icon>
             </v-btn>
          </template>
          <span>Create Cluster</span>
        </v-tooltip>
        <table-column-selection
          :headers="selectableHeaders"
          :filters="selectableFilters"
          @set-selected-header="setSelectedHeader"
          @reset="resetTableSettings"
          @toggle-filter="toggleFilter"
        ></table-column-selection>
      </v-toolbar>
      <v-data-table
        :headers="visibleHeaders"
        :items="items"
        :options.sync="options"
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
      </v-data-table>

      <v-dialog v-model="clusterAccessDialog" max-width="600">
        <v-card>
          <v-card-title class="toolbar-background toolbar-title--text">
            <div class="text-h5">Cluster Access <code class="toolbar-background lighten-1 toolbar-title--text">{{currentName}}</code></div>
            <v-spacer></v-spacer>
            <v-btn icon class="grey--text text--lighten-4" @click.native="hideDialog">
              <v-icon color="toolbar-title">mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <shoot-access-card ref="clusterAccess" :shoot-item="shootItem" :hide-terminal-shortcuts="true"></shoot-access-card>
        </v-card>
      </v-dialog>
    </v-card>
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
import debounce from 'lodash/debounce'
import ShootListRow from '@/components/ShootListRow'
import ShootListProgress from '@/components/ShootListProgress'
import IconBase from '@/components/icons/IconBase'
import CertifiedKubernetes from '@/components/icons/CertifiedKubernetes'
import TableColumnSelection from '@/components/TableColumnSelection.vue'
import { mapTableHeader } from '@/utils'
const ShootAccessCard = () => import('@/components/ShootDetails/ShootAccessCard')

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
      'searchItems'
    ]),
    ...mapState([
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
      const headers = [
        {
          text: 'PROJECT',
          value: 'project',
          align: 'start',
          defaultSelected: true,
          hidden: !!this.projectScope
        },
        {
          text: 'NAME',
          value: 'name',
          align: 'start',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'INFRASTRUCTURE',
          value: 'infrastructure',
          align: 'start',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'SEED',
          value: 'seed',
          align: 'start',
          defaultSelected: false,
          hidden: false
        },
        {
          text: 'TECHNICAL ID',
          value: 'technicalId',
          align: 'start',
          defaultSelected: false,
          hidden: !this.isAdmin
        },
        {
          text: 'CREATED BY',
          value: 'createdBy',
          align: 'start',
          defaultSelected: false,
          hidden: false
        },
        {
          text: 'CREATED AT',
          value: 'createdAt',
          align: 'start',
          defaultSelected: false,
          hidden: false
        },
        {
          text: 'PURPOSE',
          value: 'purpose',
          align: 'center',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'STATUS',
          value: 'lastOperation',
          align: 'center',
          cellClass: 'pl-4',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'VERSION',
          value: 'k8sVersion',
          align: 'center',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'READINESS',
          value: 'readiness',
          sortable: true,
          align: 'start',
          defaultSelected: true,
          hidden: false
        },
        {
          text: 'ControlPlane HA',
          value: 'cpha',
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
          sortable: true,
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
          text: 'Hide no operator action required issues',
          value: 'noOperatorAction',
          selected: this.isFilterActive('noOperatorAction'),
          hidden: this.projectScope || !this.isAdmin,
          helpTooltip: [
            'Hide clusters that do not require action by an operator',
            '- Clusters with user issues',
            '- Clusters with temporary issues that will be retried automatically',
            '- Clusters with annotation dashboard.gardener.cloud/ignore-issues'
          ],
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
    next()
  },
  beforeRouteLeave (to, from, next) {
    this.cachedItems = this.mappedItems.slice(0)
    this.shootSearch = null
    next()
  }
}
</script>
