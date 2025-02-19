<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container
    fluid
    @click="highlightedUid = null"
  >
    <v-card class="ma-3">
      <g-toolbar
        prepend-icon="mdi-key"
        title="Infrastructure Credentials"
        :height="64"
      >
        <template #append>
          <v-text-field
            v-if="infrastructureCredentialsItems.length > 3"
            v-model="infraCredentialFilter"
            prepend-inner-icon="mdi-magnify"
            color="primary"
            label="Search"
            single-line
            hide-details
            variant="solo"
            clearable
            clear-icon="mdi-close"
            density="compact"
            flat
            class="g-table-search-field mr-3"
            @keyup.esc="infraCredentialFilter = ''"
          />
          <v-menu
            v-if="canCreateCredentials"
            v-model="createInfraCredentialMenu"
            location="left"
            absolute
          >
            <template #activator="{ props: menuProps }">
              <v-tooltip location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="mergeProps(menuProps, tooltipProps)"
                    icon="mdi-plus"
                  />
                </template>
                Create Infrastructure Secret
              </v-tooltip>
            </template>
            <v-list>
              <v-list-subheader>
                Create Infrastructure Secret
              </v-list-subheader>
              <v-list-item
                v-for="infrastructure in sortedProviderTypeList"
                :key="infrastructure"
                @click="openCredentialAddDialog(infrastructure)"
              >
                <template #prepend>
                  <g-vendor-icon
                    :icon="infrastructure"
                    :size="24"
                  />
                </template>
                <v-list-item-title>
                  {{ infrastructure }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <g-table-column-selection
            :headers="infraCredentialTableHeaders"
            @set-selected-header="setSelectedInfraHeader"
            @reset="resetInfraTableSettings"
          />
        </template>
      </g-toolbar>

      <v-card-text v-if="!sortedProviderTypeList.length">
        <v-alert
          class="ma-3"
          type="warning"
        >
          No supported cloud profile found.
          There must be at least one cloud profile supported by the dashboard as well as a seed that matches its seed selector.
        </v-alert>
      </v-card-text>
      <v-card-text v-else-if="!infrastructureCredentialsItems.length">
        <div class="text-h6 text-grey-darken-1 my-4">
          Add Infrastructure Credentials to your project
        </div>
        <p class="text-body-1">
          Before you can provision and access a Kubernetes cluster, you need to add infrastructure account credentials. The Gardener needs the credentials to provision and operate the infrastructure for your Kubernetes cluster.
        </p>
      </v-card-text>
      <v-data-table
        v-else
        v-model:sort-by="infraCredentialSortBy"
        v-model:page="infraCredentialPage"
        v-model:items-per-page="infraCredentialItemsPerPage"
        :headers="visibleInfraCredentialTableHeaders"
        :items="infrastructureCredentialSortedItems"
        :items-per-page-options="itemsPerPageOptions"
        :custom-key-sort="disableCustomKeySort(visibleInfraCredentialTableHeaders)"
        must-sort
        :search="infraCredentialFilter"
        density="compact"
        class="g-table"
      >
        <template #item="{ item }">
          <g-credential-row-infra
            :key="`${item.credentialNamespace}/${item.credentialName}`"
            :item="item"
            :headers="infraCredentialTableHeaders"
            @delete="onRemoveCredential"
            @update="onUpdateCredential"
          />
        </template>
        <template #bottom="{ pageCount }">
          <g-data-table-footer
            v-model:page="infraCredentialPage"
            v-model:items-per-page="infraCredentialItemsPerPage"
            :items-length="infrastructureCredentialsItems.length"
            :items-per-page-options="itemsPerPageOptions"
            :page-count="pageCount"
          />
        </template>
      </v-data-table>
    </v-card>

    <v-card
      v-if="dnsProviderTypes.length"
      class="ma-3 mt-6"
    >
      <g-toolbar
        prepend-icon="mdi-key"
        title="DNS Credentials"
        :height="64"
      >
        <template #append>
          <v-text-field
            v-if="dnsCredentialItems.length > 3"
            v-model="dnsCredentialFilter"
            prepend-inner-icon="mdi-magnify"
            color="primary"
            label="Search"
            single-line
            hide-details
            variant="solo"
            clearable
            clear-icon="mdi-close"
            density="compact"
            flat
            class="g-table-search-field mr-3"
            @keyup.esc="dnsCredentialFilter = ''"
          />
          <v-menu
            v-if="canCreateCredentials"
            v-model="createDnsCredentialMenu"
            location="left"
            absolute
          >
            <template #activator="{ props: menuProps }">
              <v-tooltip location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="mergeProps(menuProps, tooltipProps)"
                    icon="mdi-plus"
                  />
                </template>
                Create Secret Credential
              </v-tooltip>
            </template>
            <v-list density="compact">
              <v-list-subheader>
                Create Secret Credential
              </v-list-subheader>
              <v-list-item
                v-for="dnsProvider in dnsProviderTypes"
                :key="dnsProvider"
                @click="openCredentialAddDialog(dnsProvider)"
              >
                <template #prepend>
                  <g-vendor-icon
                    :icon="dnsProvider"
                    :size="24"
                  />
                </template>
                <v-list-item-title>
                  {{ dnsProvider }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <g-table-column-selection
            :headers="dnsCredentialTableHeaders"
            @set-selected-header="setSelectedDnsHeader"
            @reset="resetDnsTableSettings"
          />
        </template>
      </g-toolbar>

      <v-card-text v-if="!dnsCredentialItems.length">
        <div class="text-h6 text-grey-darken-1 my-4">
          Add DNS Credentials to your project
        </div>
        <p class="text-body-1">
          Before you can use your DNS Provider account for your cluster, you need to configure the credentials here.
        </p>
      </v-card-text>
      <v-data-table
        v-else
        v-model:page="dnsCredentialPage"
        v-model:sort-by="dnsCredentialSortBy"
        v-model:items-per-page="dnsCredentialtemsPerPage"
        :headers="visibleDnsCredentialTableHeaders"
        :items="dnsCredentialSortedItems"
        :items-per-page-options="itemsPerPageOptions"
        :custom-key-sort="disableCustomKeySort(visibleDnsCredentialTableHeaders)"
        must-sort
        :search="dnsCredentialFilter"
        density="compact"
        class="g-table"
      >
        <template #item="{ item }">
          <g-credential-row-dns
            :key="`${item.credentialNamespace}/${item.credentialName}`"
            :item="item"
            :headers="dnsCredentialTableHeaders"
            @delete="onRemoveCredential"
            @update="onUpdateCredential"
          />
        </template>
        <template #bottom="{ pageCount }">
          <g-data-table-footer
            v-model:page="dnsCredentialPage"
            v-model:items-per-page="dnsCredentialtemsPerPage"
            :items-length="dnsCredentialItems.length"
            :items-per-page-options="itemsPerPageOptions"
            :page-count="pageCount"
          />
        </template>
      </v-data-table>
    </v-card>

    <g-secret-dialog-wrapper
      :visible-dialog="visibleCredentialDialog"
      :selected-binding="selectedBinding"
      @dialog-closed="onDialogClosed"
    />
  </v-container>
</template>

<script>
import {
  mapState,
  mapWritableState,
} from 'pinia'
import { useUrlSearchParams } from '@vueuse/core'
import { toRef } from 'vue'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCredentialStore } from '@/store/credential'
import { useAuthzStore } from '@/store/authz'
import { useShootStore } from '@/store/shoot'
import { useLocalStorageStore } from '@/store/localStorage'

import GSecretDialogWrapper from '@/components/Credentials/GSecretDialogWrapper'
import GTableColumnSelection from '@/components/GTableColumnSelection.vue'
import GCredentialRowInfra from '@/components/Credentials/GCredentialRowInfra.vue'
import GCredentialRowDns from '@/components/Credentials/GCredentialRowDns.vue'
import GVendorIcon from '@/components/GVendorIcon'
import GToolbar from '@/components/GToolbar'
import GDataTableFooter from '@/components/GDataTableFooter.vue'

import {
  hasOwnCredential,
  mapTableHeader,
  calcRelatedShootCount,
} from '@/utils'

import orderBy from 'lodash/orderBy'
import mapValues from 'lodash/mapValues'
import mapKeys from 'lodash/mapKeys'
import map from 'lodash/map'
import head from 'lodash/head'
import filter from 'lodash/filter'
import get from 'lodash/get'
import findIndex from 'lodash/findIndex'

export default {
  components: {
    GSecretDialogWrapper,
    GTableColumnSelection,
    GCredentialRowInfra,
    GCredentialRowDns,
    GVendorIcon,
    GToolbar,
    GDataTableFooter,
  },
  inject: ['mergeProps'],
  setup () {
    const hashParams = useUrlSearchParams('hash-params')
    const highlightedUid = toRef(hashParams, 'credential-uid')
    return {
      highlightedUid,
    }
  },
  data () {
    return {
      selectedBinding: {},
      infraCredentialPage: 1,
      dnsCredentialPage: 1,
      infraCredentialFilter: '',
      createInfraCredentialMenu: false,
      dnsCredentialFilter: '',
      createDnsCredentialMenu: false,
      visibleCredentialDialog: undefined,
      itemsPerPageOptions: [
        { value: 5, title: '5' },
        { value: 10, title: '10' },
        { value: 20, title: '20' },
      ],
    }
  },
  computed: {
    ...mapState(useCloudProfileStore, ['sortedProviderTypeList']),
    ...mapState(useGardenerExtensionStore, ['dnsProviderTypes']),
    ...mapState(useCredentialStore, [
      'infrastructureBindingList',
      'dnsBindingList',
    ]),
    ...mapState(useAuthzStore, [
      'namespace',
      'canCreateCredentials',
    ]),
    ...mapState(useShootStore, ['shootList']),
    ...mapWritableState(useLocalStorageStore, [
      'infraCredentialSelectedColumns',
      'infraCredentialItemsPerPage',
      'infraCredentialSortBy',
      'dnsCredentialSelectedColumns',
      'dnsCredentialtemsPerPage',
      'dnsCredentialSortBy',
    ]),
    infraCredentialTableHeaders () {
      const headers = [
        {
          title: 'NAME',
          align: 'start',
          key: 'name',
          sortable: true,
          defaultSelected: true,
        },
        {
          title: 'KIND',
          align: 'start',
          key: 'kind',
          sortable: true,
          defaultSelected: true,
        },
        {
          title: 'CREDENTIAL',
          align: 'start',
          key: 'credential',
          sortable: true,
          defaultSelected: true,
        },
        {
          title: 'INFRASTRUCTURE',
          align: 'start',
          key: 'infrastructure',
          sortable: true,
          defaultSelected: true,
        },
        {
          title: 'DETAILS',
          align: 'start',
          key: 'details',
          sortable: false,
          defaultSelected: true,
        },
        {
          title: 'USED BY',
          align: 'start',
          key: 'relatedShootCount',
          defaultSelected: true,
        },
        {
          title: 'ACTIONS',
          align: 'end',
          key: 'actions',
          sortable: false,
          defaultSelected: true,
        },
      ]
      return map(headers, header => ({
        ...header,
        class: 'nowrap',
        selected: get(this.infraCredentialSelectedColumns, header.key, header.defaultSelected),
      }))
    },
    visibleInfraCredentialTableHeaders () {
      return filter(this.infraCredentialTableHeaders, ['selected', true])
    },
    infrastructureCredentialSortedItems () {
      const secondSortCriteria = 'name'
      return this.sortItems(this.infrastructureCredentialsItems, this.infraCredentialSortBy, secondSortCriteria)
    },
    infrastructureCredentialsItems () {
      return map(this.infrastructureBindingList, this.computeItem)
    },
    dnsCredentialTableHeaders () {
      const headers = [
        {
          title: 'NAME',
          align: 'start',
          key: 'name',
          sortable: true,
          defaultSelected: true,
        },
        {
          title: 'KIND',
          align: 'start',
          key: 'kind',
          sortable: true,
          defaultSelected: true,
        },
        {
          title: 'CREDENTIAL',
          align: 'start',
          key: 'credential',
          sortable: true,
          defaultSelected: true,
        },
        {
          title: 'DNS PROVIDER',
          align: 'start',
          key: 'dnsProvider',
          sortable: true,
          defaultSelected: true,
        },
        {
          title: 'DETAILS',
          align: 'start',
          key: 'details',
          sortable: false,
          defaultSelected: true,
        },
        {
          title: 'USED BY',
          align: 'start',
          key: 'relatedShootCount',
          defaultSelected: true,
        },
        {
          title: 'ACTIONS',
          align: 'end',
          key: 'actions',
          sortable: false,
          defaultSelected: true,
        },
      ]
      return map(headers, header => ({
        ...header,
        class: 'nowrap',
        selected: get(this.dnsCredentialSelectedColumns, header.key, header.defaultSelected),
      }))
    },
    visibleDnsCredentialTableHeaders () {
      return filter(this.dnsCredentialTableHeaders, ['selected', true])
    },
    dnsCredentialSortedItems () {
      const secondSortCriteria = 'name'
      return this.sortItems(this.dnsCredentialItems, this.dnsCredentialSortBy, secondSortCriteria)
    },
    dnsCredentialItems () {
      return map(this.dnsBindingList, this.computeItem)
    },
  },
  watch: {
    namespace () {
      this.reset()
    },
    highlightedUid: {
      handler (value) {
        const infraIndex = findIndex(this.infrastructureCredentialSortedItems, ['binding.metadata.uid', value])
        if (infraIndex !== -1) {
          this.infraCredentialPage = Math.floor(infraIndex / this.infraCredentialItemsPerPage) + 1
        }

        const dnsIndex = findIndex(this.dnsCredentialSortedItems, ['binding.metadata.uid', value])
        if (dnsIndex !== -1) {
          this.dnsCredentialPage = Math.floor(dnsIndex / this.dnsCredentialtemsPerPage) + 1
        }
      },
      immediate: true,
    },
  },
  methods: {
    openCredentialAddDialog (providerType) {
      this.selectedBinding = undefined
      this.visibleCredentialDialog = providerType
    },
    onUpdateCredential (binding) {
      const providerType = binding.provider.type
      this.selectedBinding = binding
      this.visibleCredentialDialog = providerType
    },
    onRemoveCredential (binding) {
      this.selectedBinding = binding
      this.visibleCredentialDialog = 'delete'
    },
    relatedShootCountLabel (count) {
      if (count === 0) {
        return 'currently unused'
      } else {
        return `${count} ${count > 1 ? 'clusters' : 'cluster'}`
      }
    },
    setSelectedInfraHeader (header) {
      this.infraCredentialSelectedColumns[header.key] = !header.selected
    },
    reset () {
      this.infraCredentialFilter = ''
      this.dnsCredentialFilter = ''
      this.infraCredentialPage = 1
      this.dnsCredentialPage = 1
    },
    resetInfraTableSettings () {
      this.infraCredentialSelectedColumns = mapTableHeader(this.infraCredentialTableHeaders, 'defaultSelected')
      this.infraCredentialItemsPerPage = 10
      this.infraCredentialSortBy = [{ key: 'name', order: 'asc' }]
    },
    setSelectedDnsHeader (header) {
      this.dnsCredentialSelectedColumns[header.key] = !header.selected
    },
    resetDnsTableSettings () {
      this.dnsCredentialSelectedColumns = mapTableHeader(this.dnsCredentialTableHeaders, 'defaultSelected')
      this.dnsCredentialtemsPerPage = 10
      this.dnsCredentialSortBy = [{ key: 'name', order: 'asc' }]
    },
    onDialogClosed () {
      // This forces re-rendering of credential dialogs when re-opened so we don't need to reset them manually
      this.visibleCredentialDialog = undefined
    },
    sortItems (items, sortByArr, secondSortCriteria) {
      const sortByObj = head(sortByArr)
      if (!sortByObj || !sortByObj.key) {
        return items
      }

      const sortBy = sortByObj.key
      const sortOrder = sortByObj.order
      return orderBy(items, [item => this.getRawVal(item, sortBy), secondSortCriteria], [sortOrder, 'asc'])
    },
    getRawVal (item, column) {
      switch (column) {
        case 'credential':
          return `${item.credentialNamespace} ${item.credentialName}`
        case 'infrastructure':
          return item.infrastructureName
        default:
          return get(item, [column])
      }
    },
    disableCustomKeySort (tableHeaders) {
      const sortableTableHeaders = filter(tableHeaders, ['sortable', true])
      const tableKeys = mapKeys(sortableTableHeaders, ({ key }) => key)
      return mapValues(tableKeys, () => () => 0)
    },
    computeItem (binding) {
      let kind = {
        icon: 'mdi-help-circle',
        tooltip: 'Unknown',
      }
      let credentialNamespace = ''
      let credentialName = ''
      if (binding._isSecretBinding) {
        kind.tooltip = 'Secret (SecretBinding)'
        kind.icon = 'mdi-account-key-outline'
        credentialNamespace = binding.secretRef.namespace
        credentialName = binding.secretRef.name
      }
      if (binding._isCredentialsBinding) {
        if (binding.credentialsRef.kind === 'Secret') {
          kind.tooltip = 'Secret (CredentialsBinding)'
          kind.icon = 'mdi-account-key'
        }
        if (binding.credentialsRef.kind === 'WorkloadIdentity') {
          kind = 'WorkloadIdentity'
          kind.icon = 'mdi-account-card'
        }
        credentialNamespace = binding.credentialsRef.namespace
        credentialName = binding.credentialsRef.name
      }
      const relatedShootCount = calcRelatedShootCount(this.shootList, binding)

      return {
        name: binding.metadata.name,
        kind,
        hasOwnCredential: hasOwnCredential(binding),
        hasOwnSecret: binding._secret !== undefined,
        credentialNamespace,
        credentialName,
        providerType: binding.provider.type,
        relatedShootCount,
        relatedShootCountLabel: this.relatedShootCountLabel(relatedShootCount),
        binding,
        highlighted: this.highlightedUid && this.highlightedUid === binding.metadata.uid,
        isMarkedForDeletion: !!binding.metadata.deletionTimestamp,
      }
    },
  },
}
</script>
