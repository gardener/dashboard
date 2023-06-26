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
      >
        <template #append>
          <v-text-field v-if="infrastructureSecretItems.length > 3"
            class="mr-3"
            prepend-inner-icon="mdi-magnify"
            color="primary"
            label="Search"
            hide-details
            variant="solo"
            clearable
            density="compact"
            v-model="infraSecretFilter"
            @keyup.esc="infraSecretFilter = ''"
          ></v-text-field>
          <v-menu
            v-if="canCreateSecrets"
            location="left"
            v-model="createInfraSecretMenu"
            absolute>
            <template #activator="{ props: menuProps }">
              <v-tooltip location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn v-bind="mergeProps(menuProps, tooltipProps)" icon="mdi-plus" />
                </template>
                Create Infrastructure Secret
              </v-tooltip>
            </template>
            <v-list>
              <v-list-item-title class="ma-2 justify-center">
                Create Infrastructure Secret
              </v-list-item-title>
              <v-list-item v-for="infrastructure in sortedInfrastructureKindList" :key="infrastructure" @click="openSecretAddDialog(infrastructure)">
                <template #prepend>
                  <g-vendor-icon :icon="infrastructure" :size="24"/>
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
          ></g-table-column-selection>
        </template>
      </g-toolbar>

      <v-card-text v-if="!sortedInfrastructureKindList.length">
        <v-alert class="ma-3" type="warning">
          No supported cloud profile found.
          There must be at least one cloud profile supported by the dashboard as well as a seed that matches it's seed selector.
        </v-alert>
      </v-card-text>
      <v-card-text v-else-if="!infrastructureSecretItems.length">
        <div class="text-h6 text-grey-darken-1 my-4">Add Infrastructure Secrets to your project</div>
        <p class="text-body-1">
          Before you can provision and access a Kubernetes cluster, you need to add infrastructure account credentials. The Gardener needs the credentials to provision and operate the infrastructure for your Kubernetes cluster.
        </p>
      </v-card-text>
      <!--- TODO v-data-table
        - sort currently not working (custom-sort has been removed)
        - options property has been removed (need to set options individually)
      --->
      <v-data-table v-else
        :headers="visibleInfraSecretTableHeaders"
        :items="infrastructureSecretItems"
        :items-per-page-options="itemsPerPageOptions"
        v-model:options="infraSecretTableOptions"
        must-sort
        :search="infraSecretFilter"
        density="compact"
        class="g-table"
      >
        <template #item="{ item }">
          <g-secret-row-infra
            :item="item.raw"
            :headers="infraSecretTableHeaders"
            :key="`${item.raw.cloudProfileName}/${item.raw.name}`"
            @delete="onRemoveSecret"
            @update="onUpdateSecret"
          ></g-secret-row-infra>
        </template>
      </v-data-table>
    </v-card>

    <v-card class="ma-3 mt-6" v-if="dnsProviderTypes.length">
      <g-toolbar
        prepend-icon="mdi-key"
        title="DNS Secrets"
      >
        <template #append>
          <v-text-field v-if="dnsSecretItems.length > 3"
            class="mr-3"
            prepend-inner-icon="mdi-magnify"
            color="primary"
            label="Search"
            hide-details
            variant="solo"
            clearable
            density="compact"
            v-model="dnsSecretFilter"
            @keyup.esc="dnsSecretFilter = ''"
          ></v-text-field>
          <v-menu
            v-if="canCreateSecrets"
            location="left"
            v-model="createDnsSecretMenu"
            absolute>
            <template #activator="{ props: menuProps }">
              <v-tooltip location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn v-bind="mergeProps(menuProps, tooltipProps)" icon="mdi-plus" />
                </template>
                Create DNS Secret
              </v-tooltip>
            </template>
            <v-list density="compact">
              <v-list-item-title class="ma-2 justify-center">
                Create DNS Secret
              </v-list-item-title>
              <v-list-item v-for="dnsProvider in dnsProviderTypes" :key="dnsProvider" @click="openSecretAddDialog(dnsProvider)">
                <template #prepend>
                  <g-vendor-icon :icon="dnsProvider" :size="24"/>
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
          ></g-table-column-selection>
        </template>
      </g-toolbar>

      <v-card-text v-if="!dnsSecretItems.length">
        <div class="text-h6 text-grey-darken-1 my-4">Add DNS Secrets to your project</div>
        <p class="text-body-1">
          Before you can use your DNS Provider account for your cluster, you need to configure the credentials here.
        </p>
      </v-card-text>
      <!--- TODO v-data-table
        - sort currently not working (custom-sort has been removed)
        - options property has been removed (need to set options individually)
      --->
      <v-data-table v-else
        :headers="visibleDnsSecretTableHeaders"
        :items="dnsSecretItems"
        :items-per-page-options="itemsPerPageOptions"
        v-model:options="dnsSecretTableOptions"
        must-sort
        :search="dnsSecretFilter"
        density="compact"
        class="g-table"
      >
        <template #item="{ item }">
          <g-secret-row-dns
            :item="item.raw"
            :headers="dnsSecretTableHeaders"
            :key="`${item.raw.cloudProfileName}/${item.raw.name}`"
            @delete="onRemoveSecret"
            @update="onUpdateSecret"
          ></g-secret-row-dns>
        </template>
      </v-data-table>
    </v-card>

    <g-secret-dialog-wrapper
      :visible-dialog="visibleSecretDialog" :selected-secret="selectedSecret"
      @dialog-closed="onDialogClosed"
    ></g-secret-dialog-wrapper>
  </v-container>
</template>

<script>
import { defineComponent, mergeProps } from 'vue'

import { mapGetters, mapActions } from 'pinia'
import {
  isOwnSecret,
  mapTableHeader,
} from '@/utils'
import get from 'lodash/get'
import GSecretDialogWrapper from '@/components/Secrets/GSecretDialogWrapper'
import GTableColumnSelection from '@/components/GTableColumnSelection.vue'
import GSecretRowInfra from '@/components/Secrets/GSecretRowInfra.vue'
import GSecretRowDns from '@/components/Secrets/GSecretRowDns.vue'
import GVendorIcon from '@/components/GVendorIcon'
import GToolbar from '@/components/GToolbar'
import isEmpty from 'lodash/isEmpty'
import map from 'lodash/map'
import filter from 'lodash/filter'
import some from 'lodash/some'
import includes from 'lodash/includes'
import {
  useCloudProfileStore,
  useGardenerExtensionStore,
  useSecretStore,
  useAuthzStore,
  useShootStore,
} from '@/store'
import { useLocalStorage } from '@vueuse/core'

const defaultInfraSecretTableOptions = {
  itemsPerPage: 10,
  sortBy: ['name'],
  sortDesc: [false],
}

const defaultDnsSecretTableOptions = {
  itemsPerPage: 10,
  sortBy: ['name'],
  sortDesc: [false],
}

export default defineComponent({
  components: {
    GSecretDialogWrapper,
    GTableColumnSelection,
    GSecretRowInfra,
    GSecretRowDns,
    GVendorIcon,
    GToolbar,
  },
  data () {
    return {
      selectedSecret: {},
      infraSecretSelectedColumns: useLocalStorage('secrets/infra-secret-list/selected-columns', {}),
      infraSecretTableOptions: useLocalStorage('secrets/infra-secret-list/options', defaultInfraSecretTableOptions),
      dnsSecretSelectedColumns: useLocalStorage('secrets/dns-secret-list/selected-columns', {}),
      dnsSecretTableOptions: useLocalStorage('secrets/dns-secret-list/options', defaultDnsSecretTableOptions),
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
    ...mapGetters(useCloudProfileStore, ['sortedInfrastructureKindList']),
    ...mapGetters(useGardenerExtensionStore, ['sortedDnsProviderList']),
    ...mapGetters(useSecretStore,
      [
        'infrastructureSecretList',
        'dnsSecretList',
      ]),
    ...mapGetters(useAuthzStore, ['canCreateSecrets']),
    ...mapGetters(useShootStore, ['shootList']),
    hasCloudProfileForCloudProviderKind () {
      return (kind) => {
        return !isEmpty(this.cloudProfilesByCloudProviderKind(kind))
      }
    },
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
    infrastructureSecretItems () {
      return map(this.infrastructureSecretList, secret => ({
        name: secret.metadata.name,
        isOwnSecret: isOwnSecret(secret),
        secretNamespace: secret.metadata.secretRef.namespace,
        secretName: secret.metadata.secretRef.name,
        infrastructureName: secret.metadata.cloudProviderKind,
        cloudProfileName: secret.metadata.cloudProfileName,
        relatedShootCount: this.relatedShootCountInfra(secret),
        relatedShootCountLabel: this.relatedShootCountLabel(this.relatedShootCountInfra(secret)),
        isSupportedCloudProvider: includes(this.sortedInfrastructureKindList, secret.metadata.cloudProviderKind),
        secret,
      }))
    },
    dnsProviderTypes () {
      return map(this.sortedDnsProviderList, 'type')
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
    dnsSecretItems () {
      return map(this.dnsSecretList, secret => ({
        name: secret.metadata.name,
        isOwnSecret: isOwnSecret(secret),
        secretNamespace: secret.metadata.secretRef.namespace,
        secretName: secret.metadata.secretRef.name,
        dnsProvider: secret.metadata.dnsProviderName,
        relatedShootCount: this.relatedShootCountDns(secret),
        relatedShootCountLabel: this.relatedShootCountLabel(this.relatedShootCountDns(secret)),
        isSupportedCloudProvider: includes(this.dnsProviderTypes, secret.metadata.dnsProviderName),
        secret,
      }))
    },
  },
  methods: {
    ...mapActions(useCloudProfileStore, ['cloudProfilesByCloudProviderKind']),
    ...mapActions(useSecretStore, ['getCloudProviderSecretByName']),
    openSecretAddDialog (infrastructureKind) {
      this.selectedSecret = undefined
      this.visibleSecretDialog = infrastructureKind
    },
    onUpdateSecret (secret) {
      const kind = secret.metadata.cloudProviderKind || secret.metadata.dnsProviderName
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
          type: secret.metadata.dnsProviderName,
          secretName: secret.metadata.name,
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
    resetInfraTableSettings () {
      this.infraSecretSelectedColumns = mapTableHeader(this.infraSecretTableHeaders, 'defaultSelected')
      this.infraSecretTableOptions = this.defaultInfraSecretTableOptions
    },
    setSelectedDnsHeader (header) {
      this.dnsSecretSelectedColumns[header.key] = !header.selected
    },
    resetDnsTableSettings () {
      this.dnsSecretSelectedColumns = mapTableHeader(this.dnsSecretTableHeaders, 'defaultSelected')
      this.dnsSecretTableOptions = this.defaultDnsSecretTableOptions
    },
    onDialogClosed () {
      this.visibleSecretDialog = undefined
    },
    mergeProps,
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
})
</script>
