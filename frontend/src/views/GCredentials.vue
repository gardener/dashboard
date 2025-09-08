<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container
    ref="container"
    fluid
    class="container-size"
    @click="highlightedUid = null"
  >
    <v-card class="ma-3">
      <g-toolbar
        prepend-icon="mdi-key"
        :height="64"
      >
        <div class="text-h6">
          Infrastructure Credentials
        </div>
        <template #append>
          <v-text-field
            v-if="infrastructureBindingList.length > 3"
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
              <v-btn
                v-tooltip:top="'Create Infrastructure Secret'"
                v-bind="menuProps"
                icon="mdi-plus"
              />
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
      <v-card-text v-else-if="!infrastructureBindingList.length">
        <div class="text-h6 text-grey-darken-1 my-4">
          Add Infrastructure Credentials to your project
        </div>
        <p class="text-body-1">
          Before you can provision and access a Kubernetes cluster, you need to add infrastructure account credentials. The Gardener needs the credentials to provision and operate the infrastructure for your Kubernetes cluster.
        </p>
      </v-card-text>
      <v-data-table-virtual
        v-else
        ref="infraCredentialTableRef"
        v-model:sort-by="infraCredentialSortBy"
        :headers="visibleInfraCredentialTableHeaders"
        :items="infrastructureCredentialSortedItems"
        :item-key="getItemKey"
        :custom-key-sort="disableCustomKeySort(visibleInfraCredentialTableHeaders)"
        must-sort
        hover
        :custom-filter="customFilter"
        :search="infraCredentialFilter"
        density="compact"
        class="g-table"
        :style="infraCredentialTableStyles"
        fixed-header
      >
        <template #item="{ item, itemRef }">
          <g-credential-row-infra
            :ref="itemRef"
            :item="item"
            :highlighted="isHighlighted(item.binding)"
            :headers="infraCredentialTableHeaders"
            @delete="onRemoveCredential"
            @update="onUpdateCredential"
          />
        </template>
        <template #bottom>
          <g-data-table-footer
            :items-length="infrastructureBindingList.length"
            items-label="Infrastructure Credentials"
          />
        </template>
      </v-data-table-virtual>
    </v-card>

    <v-card
      v-if="dnsProviderTypes.length"
      class="ma-3 mt-6"
    >
      <g-toolbar
        prepend-icon="mdi-key"
        :height="64"
      >
        <div class="text-h6">
          DNS Credentials
        </div>

        <template #append>
          <v-text-field
            v-if="dnsCredentialList.length > 3"
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
              <v-btn
                v-tooltip:top="'Create DNS Credential'"
                v-bind="menuProps"
                icon="mdi-plus"
              />
            </template>
            <v-list density="compact">
              <v-list-subheader>
                Create DNS Credential
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

      <v-card-text v-if="!dnsCredentialList.length">
        <div class="text-h6 text-grey-darken-1 my-4">
          Add DNS Credentials to your project
        </div>
        <p class="text-body-1">
          Before you can use your DNS Provider account for your cluster, you need to configure the credentials here.
        </p>
      </v-card-text>
      <v-data-table-virtual
        v-else
        ref="dnsCredentialTableRef"
        v-model:sort-by="dnsCredentialSortBy"
        :headers="visibleDnsCredentialTableHeaders"
        :items="dnsCredentialSortedItems"
        :item-key="getItemKey"
        :custom-key-sort="disableCustomKeySort(visibleDnsCredentialTableHeaders)"
        must-sort
        hover
        :custom-filter="customFilter"
        :search="dnsCredentialFilter"
        density="compact"
        class="g-table"
        :style="dnsCredentialTableStyles"
        fixed-header
      >
        <template #item="{ item, itemRef }">
          <g-credential-row-dns
            :ref="itemRef"
            :item="item"
            :highlighted="isHighlighted(item.credential)"
            :headers="dnsCredentialTableHeaders"
            @delete="onRemoveCredential"
            @update="onUpdateCredential"
          />
        </template>
        <template #bottom>
          <g-data-table-footer
            :items-length="dnsCredentialList.length"
            items-label="DNS Credentials"
          />
        </template>
      </v-data-table-virtual>
    </v-card>

    <g-secret-dialog-wrapper
      :visible-dialog="visibleCredentialDialog"
      :selected-credential-entity="selectedCredential"
      @dialog-closed="onDialogClosed"
    />
  </v-container>
</template>

<script>
import {
  mapState,
  mapWritableState,
  storeToRefs,
} from 'pinia'
import { useUrlSearchParams } from '@vueuse/core'
import {
  toRef,
  unref,
  computed,
} from 'vue'

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

import { useTwoTableLayout } from '@/composables/useTwoTableLayout'
import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'
import { useCredential } from '@/composables/credential/useCloudProviderCredential'
import {
  isSecretBinding,
  isCredentialsBinding,
  getProviderType,
} from '@/composables/credential/helper'

import { mapTableHeader } from '@/utils'

import orderBy from 'lodash/orderBy'
import mapValues from 'lodash/mapValues'
import mapKeys from 'lodash/mapKeys'
import map from 'lodash/map'
import head from 'lodash/head'
import filter from 'lodash/filter'
import get from 'lodash/get'
import findIndex from 'lodash/findIndex'
import toLower from 'lodash/toLower'

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

    const credentialStore = useCredentialStore()
    const {
      infrastructureBindingList,
      dnsCredentialList,
    } = storeToRefs(credentialStore)

    const itemHeight = 58
    const firstTableItemCount = computed(() => infrastructureBindingList.value.length)
    const secondTableItemCount = computed(() => dnsCredentialList.value.length)

    const {
      firstTableStyles: infraCredentialTableStyles,
      secondTableStyles: dnsCredentialTableStyles,
    } = useTwoTableLayout({
      firstTableItemCount,
      secondTableItemCount,
      itemHeight,
    })

    return {
      highlightedUid,
      infrastructureBindingList,
      dnsCredentialList,
      itemHeight,
      infraCredentialTableStyles,
      dnsCredentialTableStyles,
    }
  },
  data () {
    return {
      selectedCredential: {},
      infraCredentialFilter: '',
      createInfraCredentialMenu: false,
      dnsCredentialFilter: '',
      createDnsCredentialMenu: false,
      visibleCredentialDialog: undefined,
    }
  },
  computed: {
    ...mapState(useCloudProfileStore, ['sortedProviderTypeList']),
    ...mapState(useGardenerExtensionStore, ['dnsProviderTypes']),
    ...mapState(useAuthzStore, [
      'namespace',
      'canCreateCredentials',
    ]),
    ...mapState(useShootStore, ['shootList']),
    ...mapWritableState(useLocalStorageStore, [
      'infraCredentialSelectedColumns',
      'infraCredentialSortBy',
      'dnsCredentialSelectedColumns',
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
          key: 'credentialUsageCount',
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
    infrastructureItems () {
      return map(this.infrastructureBindingList, this.computeItem)
    },
    infrastructureCredentialSortedItems () {
      const secondSortCriteria = 'name'
      return this.sortItems(this.infrastructureItems, this.infraCredentialSortBy, secondSortCriteria)
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
          key: 'credentialUsageCount',
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
    dnsItems () {
      return map(this.dnsCredentialList, this.computeItem)
    },
    dnsCredentialSortedItems () {
      const secondSortCriteria = 'name'
      return this.sortItems(this.dnsItems, this.dnsCredentialSortBy, secondSortCriteria)
    },
  },
  watch: {
    namespace () {
      this.reset()
    },
    highlightedUid: {
      handler (value) {
        setTimeout(() => {
          // Cannot start scrolling before the table is rendered
          const scrollToItem = (items, tableRef) => {
            const itemIndex = findIndex(items, item => {
              const uid = item.binding?.metadata.uid ?? item.credential?.metadata.uid
              return uid === value
            })
            if (itemIndex !== -1) {
              tableRef.scrollToIndex(itemIndex)
            }
          }

          scrollToItem(this.infrastructureCredentialSortedItems, this.$refs.infraCredentialTableRef)
          scrollToItem(this.dnsCredentialSortedItems, this.$refs.dnsCredentialTableRef)
        }, 100)
      },
      immediate: true,
    },
  },
  methods: {
    computeItem (resource) {
      const refResource = toRef(resource)
      let composable
      if (isSecretBinding(resource) || isCredentialsBinding(resource)) {
        composable = useCloudProviderBinding(refResource)
      } else {
        composable = useCredential(refResource)
      }
      const {
        credentialUsageCount,
        isSharedCredential,
        isOrphanedBinding,
        credentialNamespace,
        credential,
        credentialDetails,
        credentialKind,
      } = composable

      return {
        binding: isSecretBinding(resource) || isCredentialsBinding(resource) ? resource : undefined,
        credential: unref(credential),
        credentialUsageCount: unref(credentialUsageCount),
        isSharedCredential: unref(isSharedCredential),
        isOrphanedBinding: unref(isOrphanedBinding),
        credentialNamespace: unref(credentialNamespace),
        credentialDetails: unref(credentialDetails),
        credentialKind,
      }
    },
    openCredentialAddDialog (providerType) {
      this.selectedCredential = undefined
      this.visibleCredentialDialog = providerType
    },
    onUpdateCredential (credential) {
      const providerType = getProviderType(credential)
      this.selectedCredential = credential
      this.visibleCredentialDialog = providerType
    },
    onRemoveCredential (credential) {
      this.selectedCredential = credential
      this.visibleCredentialDialog = 'delete'
    },
    setSelectedInfraHeader (header) {
      this.infraCredentialSelectedColumns[header.key] = !header.selected
    },
    reset () {
      this.infraCredentialFilter = ''
      this.dnsCredentialFilter = ''
    },
    resetInfraTableSettings () {
      this.infraCredentialSelectedColumns = mapTableHeader(this.infraCredentialTableHeaders, 'defaultSelected')
      this.infraCredentialSortBy = [{ key: 'name', order: 'asc' }]
    },
    setSelectedDnsHeader (header) {
      this.dnsCredentialSelectedColumns[header.key] = !header.selected
    },
    resetDnsTableSettings () {
      this.dnsCredentialSelectedColumns = mapTableHeader(this.dnsCredentialTableHeaders, 'defaultSelected')
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
      const {
        credentialKind,
        credentialUsageCount,
        credential,
        binding,
      } = item

      switch (column) {
        case 'name':
          return (binding ?? credential).metadata.name
        case 'infrastructure':
          return getProviderType(binding)
        case 'dnsProvider':
          return getProviderType(credential)
        case 'kind':
          return `${credential.kind} (${credentialKind.value})`
        case 'credentialUsageCount':
          return credentialUsageCount.value
      }
    },
    disableCustomKeySort (tableHeaders) {
      const sortableTableHeaders = filter(tableHeaders, ['sortable', true])
      const tableKeys = mapKeys(sortableTableHeaders, ({ key }) => key)
      return mapValues(tableKeys, () => () => 0)
    },
    isHighlighted (credential) {
      return this.highlightedUid && this.highlightedUid === credential.metadata.uid
    },
    customFilter (_, query, item) {
      const {
        credentialDetails,
        credential,
        binding,
      } = item.raw

      const detailValues = map(credentialDetails, 'value')

      const values = [
        (binding ?? credential).metadata.name,
        getProviderType(binding ?? credential),
        credential.kind,
        ...detailValues,
      ]

      return values.some(value => {
        if (value) {
          return toLower(value).includes(toLower(query))
        }
        return false
      })
    },
    getItemKey (item, fallback) {
      return item.raw?.binding?.metadata.uid ?? item.raw?.credential?.metadata.uid ?? fallback
    },
  },
}
</script>

<style lang="scss" scoped>

.container-size {
  height: 100%;
  min-height: 800px; //ensure readability on small devices
}

</style>
