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
          Infrastructure Secrets
        </div>
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
                v-for="infrastructure in sortedProviderTypeList"
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

      <v-card-text v-if="!sortedProviderTypeList.length">
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
      <v-data-table-virtual
        v-else
        ref="infraSecretTableRef"
        v-model:sort-by="infraSecretSortBy"
        :headers="visibleInfraSecretTableHeaders"
        :items="infrastructureSecretSortedItems"
        :custom-key-sort="disableCustomKeySort(visibleInfraSecretTableHeaders)"
        must-sort
        hover
        :search="infraSecretFilter"
        density="compact"
        class="g-table"
        :item-height="itemHeight"
        :style="infraSecretTableStyles"
        fixed-header
      >
        <template #item="{ item }">
          <g-secret-row-infra
            :key="`${item.secretNamespace}/${item.secretName}`"
            :item="item"
            :headers="infraSecretTableHeaders"
            @delete="onRemoveSecret"
            @update="onUpdateSecret"
          />
        </template>
        <template #bottom>
          <g-data-table-footer
            :items-length="infrastructureSecretItems.length"
            items-label="Infrastructure Secrets"
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
          DNS Secrets
        </div>

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
      <v-data-table-virtual
        v-else
        ref="dnsSecretTableRef"
        v-model:sort-by="dnsSecretSortBy"
        :headers="visibleDnsSecretTableHeaders"
        :items="dnsSecretSortedItems"
        :custom-key-sort="disableCustomKeySort(visibleDnsSecretTableHeaders)"
        must-sort
        hover
        :search="dnsSecretFilter"
        density="compact"
        class="g-table"
        :item-height="itemHeight"
        :style="dnsSecretTableStyles"
        fixed-header
      >
        <template #item="{ item }">
          <g-secret-row-dns
            :key="`${item.secretNamespace}/${item.secretName}`"
            :item="item"
            :headers="dnsSecretTableHeaders"
            @delete="onRemoveSecret"
            @update="onUpdateSecret"
          />
        </template>
        <template #bottom>
          <g-data-table-footer
            :items-length="dnsSecretItems.length"
            items-label="DNS Secrets"
          />
        </template>
      </v-data-table-virtual>
    </v-card>

    <g-secret-dialog-wrapper
      :visible-dialog="visibleSecretDialog"
      :selected-secret-binding="selectedSecretBinding"
      @dialog-closed="onDialogClosed"
    />
  </v-container>
</template>

<script>
import {
  mapState,
  mapWritableState,
  mapActions,
  storeToRefs,
} from 'pinia'
import { useUrlSearchParams } from '@vueuse/core'
import {
  toRef,
  computed,
} from 'vue'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCredentialStore } from '@/store/credential'
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

import { useTwoTableLayout } from '@/composables/useTwoTableLayout'

import {
  hasOwnSecret,
  mapTableHeader,
} from '@/utils'

import some from 'lodash/some'
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
    GSecretRowInfra,
    GSecretRowDns,
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
      infrastructureSecretBindingsList,
      dnsSecretBindingsList,
    } = storeToRefs(credentialStore)

    const itemHeight = 58
    const firstTableItemCount = computed(() => infrastructureSecretBindingsList.value.length)
    const secondTableItemCount = computed(() => dnsSecretBindingsList.value.length)

    const {
      firstTableStyles: infraSecretTableStyles,
      secondTableStyles: dnsSecretTableStyles,
    } = useTwoTableLayout({
      firstTableItemCount,
      secondTableItemCount,
      itemHeight,
    })

    return {
      highlightedUid,
      infrastructureSecretBindingsList,
      dnsSecretBindingsList,
      itemHeight,
      infraSecretTableStyles,
      dnsSecretTableStyles,
    }
  },
  data () {
    return {
      selectedSecretBinding: {},
      infraSecretFilter: '',
      createInfraSecretMenu: false,
      dnsSecretFilter: '',
      createDnsSecretMenu: false,
      visibleSecretDialog: undefined,
    }
  },
  computed: {
    ...mapState(useCloudProfileStore, ['sortedProviderTypeList']),
    ...mapState(useGardenerExtensionStore, ['dnsProviderTypes']),
    ...mapState(useAuthzStore, [
      'namespace',
      'canCreateSecrets',
    ]),
    ...mapState(useShootStore, ['shootList']),
    ...mapWritableState(useLocalStorageStore, [
      'infraSecretSelectedColumns',
      'infraSecretSortBy',
      'dnsSecretSelectedColumns',
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
      return map(this.infrastructureSecretBindingsList, secretBinding => {
        const relatedShootCount = this.relatedShootCountInfra(secretBinding)
        return this.computeItem(secretBinding, relatedShootCount)
      })
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
      return map(this.dnsSecretBindingsList, secretBinding => {
        const relatedShootCount = this.relatedShootCountDns(secretBinding)
        return this.computeItem(secretBinding, relatedShootCount)
      })
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
            const itemIndex = findIndex(items, ['secretBinding.metadata.uid', value])
            if (itemIndex !== -1) {
              tableRef.$el.querySelector('.v-table__wrapper').scrollTo({
                top: itemIndex * this.itemHeight,
                left: 0,
                behavior: 'smooth',
              })
            }
          }

          scrollToItem(this.infrastructureSecretSortedItems, this.$refs.infraSecretTableRef)
          scrollToItem(this.dnsSecretSortedItems, this.$refs.dnsSecretTableRef)
        }, 100)
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions(useCredentialStore, [
      'getSecretBinding',
    ]),
    openSecretAddDialog (providerType) {
      this.selectedSecretBinding = undefined
      this.visibleSecretDialog = providerType
    },
    onUpdateSecret (secretBinding) {
      const providerType = secretBinding.provider.type
      this.selectedSecretBinding = secretBinding
      this.visibleSecretDialog = providerType
    },
    onRemoveSecret (secretBinding) {
      this.selectedSecretBinding = secretBinding
      this.visibleSecretDialog = 'delete'
    },
    relatedShootCountInfra (secret) {
      const name = secret.metadata.name
      const shootsByInfrastructureSecret = filter(this.shootList, ['spec.secretBindingName', name])
      return shootsByInfrastructureSecret.length
    },
    relatedShootCountDns (secret) {
      const secretName = secret.metadata.name

      const someDnsProviderHasSecretRef = providers => some(providers, ['secretName', secretName])
      const someResourceHasSecretRef = resources => some(resources, { resourceRef: { kind: 'Secret', name: secretName } })

      let count = 0
      for (const shoot of this.shootList) {
        const dnsProviders = shoot.spec.dns?.providers
        const resources = shoot.spec.resources
        if (someDnsProviderHasSecretRef(dnsProviders) || someResourceHasSecretRef(resources)) {
          count++
        }
      }
      return count
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
    },
    resetInfraTableSettings () {
      this.infraSecretSelectedColumns = mapTableHeader(this.infraSecretTableHeaders, 'defaultSelected')
      this.infraSecretSortBy = [{ key: 'name', order: 'asc' }]
    },
    setSelectedDnsHeader (header) {
      this.dnsSecretSelectedColumns[header.key] = !header.selected
    },
    resetDnsTableSettings () {
      this.dnsSecretSelectedColumns = mapTableHeader(this.dnsSecretTableHeaders, 'defaultSelected')
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
          return `${get(item, ['secret', 'metadata', 'namespace'])} ${get(item, ['secret', 'metadata', 'name'])}`
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
    computeItem (secretBinding, relatedShootCount) {
      return {
        name: secretBinding.metadata.name,
        hasOwnSecret: hasOwnSecret(secretBinding),
        secretNamespace: secretBinding.secretRef.namespace,
        secretName: secretBinding.secretRef.name,
        providerType: secretBinding.provider.type,
        relatedShootCount,
        relatedShootCountLabel: this.relatedShootCountLabel(relatedShootCount),
        secretBinding,
        highlighted: this.highlightedUid === secretBinding.metadata.uid,
        isMarkedForDeletion: !!secretBinding.metadata.deletionTimestamp,
      }
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
