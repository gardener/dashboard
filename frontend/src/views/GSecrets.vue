<!-- eslint-disable vuetify/no-deprecated-components -->
<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-card class="ma-3">
      <g-toolbar
        prepend-icon="mdi-key"
        title="Infrastructure Secrets"
        :height="64"
      >
        <template #append>
          <v-text-field
            v-if="infrastructureSecretItems.length > 3"
            v-model="infraSecretFilter"
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
            @keyup.esc="infraSecretFilter = ''"
          />
          <v-menu
            v-if="canCreateSecrets"
            v-model="createInfraSecretMenu"
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
                v-for="infrastructure in sortedProviderTypesList"
                :key="infrastructure"
                @click="openSecretAddDialog(infrastructure)"
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
            :headers="infraSecretTableHeaders"
            @set-selected-header="setSelectedInfraHeader"
            @reset="resetInfraTableSettings"
          />
        </template>
      </g-toolbar>

      <v-card-text v-if="!sortedProviderTypesList.length">
        <v-alert
          class="ma-3"
          type="warning"
        >
          No supported cloud profile found.
          There must be at least one cloud profile supported by the dashboard as well as a seed that matches its seed selector.
        </v-alert>
      </v-card-text>
      <v-card-text v-else-if="!infrastructureSecretItems.length">
        <div class="text-h6 text-grey-darken-1 my-4">
          Add Infrastructure Secrets to your project
        </div>
        <p class="text-body-1">
          Before you can provision and access a Kubernetes cluster, you need to add infrastructure account credentials. The Gardener needs the credentials to provision and operate the infrastructure for your Kubernetes cluster.
        </p>
      </v-card-text>
      <v-data-table
        v-else
        v-model:sort-by="infraSecretSortBy"
        v-model:page="infraSecretPage"
        v-model:items-per-page="infraSecretItemsPerPage"
        :headers="visibleInfraSecretTableHeaders"
        :items="infrastructureSecretSortedItems"
        :items-per-page-options="itemsPerPageOptions"
        :custom-key-sort="disableCustomKeySort(visibleInfraSecretTableHeaders)"
        must-sort
        :search="infraSecretFilter"
        density="compact"
        class="g-table"
      >
        <template #item="{ item }">
          <g-secret-row-infra
            :key="`${item.cloudProfileName}/${item.name}`"
            :item="item"
            :headers="infraSecretTableHeaders"
            @delete="onRemoveSecret"
            @update="onUpdateSecret"
          />
        </template>
        <template #bottom="{ pageCount }">
          <g-data-table-footer
            v-model:page="infraSecretPage"
            v-model:items-per-page="infraSecretItemsPerPage"
            :items-length="infrastructureSecretItems.length"
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
        title="DNS Secrets"
        :height="64"
      >
        <template #append>
          <v-text-field
            v-if="dnsSecretItems.length > 3"
            v-model="dnsSecretFilter"
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
            @keyup.esc="dnsSecretFilter = ''"
          />
          <v-menu
            v-if="canCreateSecrets"
            v-model="createDnsSecretMenu"
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
                Create DNS Secret
              </v-tooltip>
            </template>
            <v-list density="compact">
              <v-list-subheader>
                Create DNS Secret
              </v-list-subheader>
              <v-list-item
                v-for="dnsProvider in dnsProviderTypes"
                :key="dnsProvider"
                @click="openSecretAddDialog(dnsProvider)"
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
            :headers="dnsSecretTableHeaders"
            @set-selected-header="setSelectedDnsHeader"
            @reset="resetDnsTableSettings"
          />
        </template>
      </g-toolbar>

      <v-card-text v-if="!dnsSecretItems.length">
        <div class="text-h6 text-grey-darken-1 my-4">
          Add DNS Secrets to your project
        </div>
        <p class="text-body-1">
          Before you can use your DNS Provider account for your cluster, you need to configure the credentials here.
        </p>
      </v-card-text>
      <v-data-table
        v-else
        v-model:page="dnsSecretPage"
        v-model:sort-by="dnsSecretSortBy"
        v-model:items-per-page="dnsSecretItemsPerPage"
        :headers="visibleDnsSecretTableHeaders"
        :items="dnsSecretSortedItems"
        :items-per-page-options="itemsPerPageOptions"
        :custom-key-sort="disableCustomKeySort(visibleDnsSecretTableHeaders)"
        must-sort
        :search="dnsSecretFilter"
        density="compact"
        class="g-table"
      >
        <template #item="{ item }">
          <g-secret-row-dns
            :key="`${item.cloudProfileName}/${item.name}`"
            :item="item"
            :headers="dnsSecretTableHeaders"
            @delete="onRemoveSecret"
            @update="onUpdateSecret"
          />
        </template>
        <template #bottom="{ pageCount }">
          <g-data-table-footer
            v-model:page="dnsSecretPage"
            v-model:items-per-page="dnsSecretItemsPerPage"
            :items-length="dnsSecretItems.length"
            :items-per-page-options="itemsPerPageOptions"
            :page-count="pageCount"
          />
        </template>
      </v-data-table>
    </v-card>

    <g-secret-dialog-wrapper
      :visible-dialog="visibleSecretDialog"
      :selected-secret="selectedSecret"
      @dialog-closed="onDialogClosed"
    />
  </v-container>
</template>

<script>
import {
  mapState,
  mapWritableState,
  mapActions,
} from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useSecretStore } from '@/store/secret'
import { useAuthzStore } from '@/store/authz'
import { useShootStore } from '@/store/shoot'
import { useLocalStorageStore } from '@/store/localStorage'

import GSecretDialogWrapper from '@/components/Secrets/GSecretDialogWrapper'
import GTableColumnSelection from '@/components/GTableColumnSelection.vue'
import GSecretRowInfra from '@/components/Secrets/GSecretRowInfra.vue'
import GSecretRowDns from '@/components/Secrets/GSecretRowDns.vue'
import GVendorIcon from '@/components/GVendorIcon'
import GToolbar from '@/components/GToolbar'
import GDataTableFooter from '@/components/GDataTableFooter.vue'

import {
  isOwnSecret,
  mapTableHeader,
} from '@/utils'

import {
  get,
  filter,
  head,
  map,
  mapKeys,
  mapValues,
  orderBy,
  some,
} from '@/lodash'

export default {
  components: {
    GSecretDialogWrapper,
    GTableColumnSelection,
    GSecretRowInfra,
    GSecretRowDns,
    GVendorIcon,
    GToolbar,
    GDataTableFooter,
  },
  inject: ['mergeProps'],
  data () {
    return {
      selectedSecret: {},
      infraSecretPage: 1,
      dnsSecretPage: 1,
      infraSecretFilter: '',
      createInfraSecretMenu: false,
      dnsSecretFilter: '',
      createDnsSecretMenu: false,
      visibleSecretDialog: undefined,
      itemsPerPageOptions: [
        { value: 5, title: '5' },
        { value: 10, title: '10' },
        { value: 20, title: '20' },
      ],
    }
  },
  computed: {
    ...mapState(useCloudProfileStore, ['sortedProviderTypesList']),
    ...mapState(useGardenerExtensionStore, ['dnsProviderTypes']),
    ...mapState(useSecretStore, [
      'infrastructureSecretList',
      'dnsSecretList',
    ]),
    ...mapState(useAuthzStore, [
      'namespace',
      'canCreateSecrets',
    ]),
    ...mapState(useShootStore, ['shootList']),
    ...mapWritableState(useLocalStorageStore, [
      'infraSecretSelectedColumns',
      'infraSecretItemsPerPage',
      'infraSecretSortBy',
      'dnsSecretSelectedColumns',
      'dnsSecretItemsPerPage',
      'dnsSecretSortBy',
    ]),
    infraSecretTableHeaders () {
      const headers = [
        {
          title: 'NAME',
          align: 'start',
          key: 'name',
          sortable: true,
          defaultSelected: true,
        },
        {
          title: 'SECRET',
          align: 'start',
          key: 'secret',
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
        selected: get(this.infraSecretSelectedColumns, header.key, header.defaultSelected),
      }))
    },
    visibleInfraSecretTableHeaders () {
      return filter(this.infraSecretTableHeaders, ['selected', true])
    },
    infrastructureSecretSortedItems () {
      const secondSortCriteria = 'name'
      return this.sortItems(this.infrastructureSecretItems, this.infraSecretSortBy, secondSortCriteria)
    },
    infrastructureSecretItems () {
      return map(this.infrastructureSecretList, secret => ({
        name: secret.metadata.name,
        isOwnSecret: isOwnSecret(secret),
        secretNamespace: secret.metadata.secretRef.namespace,
        secretName: secret.metadata.secretRef.name,
        providerType: secret.metadata.provider.type,
        cloudProfileName: secret.metadata.cloudProfileName,
        relatedShootCount: this.relatedShootCountInfra(secret),
        relatedShootCountLabel: this.relatedShootCountLabel(this.relatedShootCountInfra(secret)),
        secret,
      }))
    },
    dnsSecretTableHeaders () {
      const headers = [
        {
          title: 'NAME',
          align: 'start',
          key: 'name',
          sortable: true,
          defaultSelected: true,
        },
        {
          title: 'Secret',
          align: 'start',
          key: 'secret',
          sortable: true,
          defaultSelected: true,
        },
        {
          title: 'DNS Provider',
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
        selected: get(this.dnsSecretSelectedColumns, header.key, header.defaultSelected),
      }))
    },
    visibleDnsSecretTableHeaders () {
      return filter(this.dnsSecretTableHeaders, ['selected', true])
    },
    dnsSecretSortedItems () {
      const secondSortCriteria = 'name'
      return this.sortItems(this.dnsSecretItems, this.dnsSecretSortBy, secondSortCriteria)
    },
    dnsSecretItems () {
      return map(this.dnsSecretList, secret => ({
        name: secret.metadata.name,
        isOwnSecret: isOwnSecret(secret),
        secretNamespace: secret.metadata.secretRef.namespace,
        secretName: secret.metadata.secretRef.name,
        providerType: secret.metadata.provider.type,
        relatedShootCount: this.relatedShootCountDns(secret),
        relatedShootCountLabel: this.relatedShootCountLabel(this.relatedShootCountDns(secret)),
        secret,
      }))
    },
  },
  watch: {
    namespace () {
      this.reset()
    },
  },
  mounted () {
    if (!get(this.$route.params, 'name')) {
      return
    }
    const secret = this.getCloudProviderSecretByName(this.$route.params)
    if (!secret || !isOwnSecret(secret)) {
      return
    }
    this.onUpdateSecret(secret)
  },
  methods: {
    ...mapActions(useSecretStore, ['getCloudProviderSecretByName']),
    openSecretAddDialog (providerType) {
      this.selectedSecret = undefined
      this.visibleSecretDialog = providerType
    },
    onUpdateSecret (secret) {
      const kind = secret.metadata.provider.type
      this.selectedSecret = secret
      this.visibleSecretDialog = kind
    },
    onRemoveSecret (secret) {
      this.selectedSecret = secret
      this.visibleSecretDialog = 'delete'
    },
    relatedShootCountInfra (secret) {
      const name = secret.metadata.name
      const shootsByInfrastructureSecret = filter(this.shootList, ['spec.secretBindingName', name])
      return shootsByInfrastructureSecret.length
    },
    relatedShootCountDns (secret) {
      const shootsByDnsSecret = filter(this.shootList, shoot => {
        return some(shoot.spec.dns?.providers, {
          secretName: secret.metadata.name,
        }) ||
        some(shoot.spec.resources, {
          resourceRef: {
            kind: 'Secret',
            name: secret.metadata.name,
          },
        })
      })
      return shootsByDnsSecret.length
    },
    relatedShootCountLabel (count) {
      if (count === 0) {
        return 'currently unused'
      } else {
        return `${count} ${count > 1 ? 'clusters' : 'cluster'}`
      }
    },
    setSelectedInfraHeader (header) {
      this.infraSecretSelectedColumns[header.key] = !header.selected
    },
    reset () {
      this.infraSecretFilter = ''
      this.dnsSecretFilter = ''
      this.infraSecretPage = 1
      this.dnsSecretPage = 1
    },
    resetInfraTableSettings () {
      this.infraSecretSelectedColumns = mapTableHeader(this.infraSecretTableHeaders, 'defaultSelected')
      this.infraSecretItemsPerPage = 10
      this.infraSecretSortBy = [{ key: 'name', order: 'asc' }]
    },
    setSelectedDnsHeader (header) {
      this.dnsSecretSelectedColumns[header.key] = !header.selected
    },
    resetDnsTableSettings () {
      this.dnsSecretSelectedColumns = mapTableHeader(this.dnsSecretTableHeaders, 'defaultSelected')
      this.dnsSecretItemsPerPage = 10
      this.dnsSecretSortBy = [{ key: 'name', order: 'asc' }]
    },
    onDialogClosed () {
      // This forces re-rendering of secret dialogs when re-opened so we don't need to reset them manually
      this.visibleSecretDialog = undefined
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
        case 'secret':
          return `${get(item, 'secret.metadata.project')} ${get(item, 'secret.metadata.name')}`
        case 'infrastructure':
          return `${item.infrastructureName} ${item.cloudProfileName}`
        default:
          return get(item, [column])
      }
    },
    disableCustomKeySort (tableHeaders) {
      const sortableTableHeaders = filter(tableHeaders, ['sortable', true])
      const tableKeys = mapKeys(sortableTableHeaders, ({ key }) => key)
      return mapValues(tableKeys, () => () => 0)
    },
  },
}
</script>
