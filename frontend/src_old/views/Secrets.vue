<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-card class="ma-3">
      <v-toolbar flat color="toolbar-background toolbar-title--text">
        <v-icon class="pr-2" color="toolbar-title">mdi-key</v-icon>
        <v-toolbar-title class="text-subtitle-1">
          Infrastructure Secrets
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="infrastructureSecretItems.length > 3"
          class="mr-3"
          prepend-inner-icon="mdi-magnify"
          color="primary"
          label="Search"
          hide-details
          flat
          variant="solo"
          clearable
          v-model="infraSecretFilter"
          @keyup.esc="infraSecretFilter=''"
        ></v-text-field>
        <v-menu v-if="canCreateSecrets" :nudge-bottom="20" :nudge-right="20" location="left" v-model="createInfraSecretMenu" absolute>
          <template v-slot:activator="{ on: menu }">
            <v-tooltip location="top">
              <template v-slot:activator="{ on: tooltip }">
                <v-btn v-on="{ ...menu, ...tooltip}" icon>
                  <v-icon color="toolbar-title">mdi-plus</v-icon>
                </v-btn>
              </template>
              Create Infrastructure Secret
            </v-tooltip>
          </template>
          <v-list subheader dense>
            <v-subheader>Create Infrastructure Secret</v-subheader>
            <v-list-item v-for="infrastructure in sortedCloudProviderKindList" :key="infrastructure" @click="openSecretAddDialog(infrastructure)">
              <v-list-item-action>
                <infra-icon :value="infrastructure" :size="24"></infra-icon>
              </v-list-item-action>
              <v-list-item-content class="text-primary">
                <v-list-item-title>
                  {{infrastructure}}
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
        <table-column-selection
          :headers="infraSecretTableHeaders"
          @set-selected-header="setSelectedInfraHeader"
          @reset="resetInfraTableSettings"
        ></table-column-selection>
      </v-toolbar>

      <v-card-text v-if="!sortedCloudProviderKindList.length">
        <v-alert class="ma-3" type="warning">
          No supported cloud profile found.
          There must be at least one cloud profile supported by the dashboard as well as a seed that matches it's seed selector.
        </v-alert>
      </v-card-text>
      <v-card-text v-else-if="!infrastructureSecretItems.length">
        <div class="text-h6 grey--text text--darken-1 my-4">Add Infrastructure Secrets to your project</div>
        <p class="text-body-1">
          Before you can provision and access a Kubernetes cluster, you need to add infrastructure account credentials. The Gardener needs the credentials to provision and operate the infrastructure for your Kubernetes cluster.
        </p>
      </v-card-text>
      <v-data-table
        v-else
        :headers="visibleInfraSecretTableHeaders"
        :items="infrastructureSecretItems"
        :footer-props="{ 'items-per-page-options': [5,10,20] }"
        v-model:options="infraSecretTableOptions"
        must-sort
        :search="infraSecretFilter"
      >
        <template #item="{ item }">
          <secret-row-infra
            :item="item"
            :headers="infraSecretTableHeaders"
            :key="`${item.cloudProfileName}/${item.name}`"
            @delete="onRemoveSecret"
            @update="onUpdateSecret"
          />
        </template>
      </v-data-table>
    </v-card>

    <v-card class="ma-3 mt-6" v-if="dnsProviderTypes.length">
      <v-toolbar flat color="toolbar-background toolbar-title--text">
        <v-icon class="pr-2" color="toolbar-title">mdi-key</v-icon>
        <v-toolbar-title class="text-subtitle-1">
          DNS Secrets
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="dnsSecretItems.length > 3"
          class="mr-3"
          prepend-inner-icon="mdi-magnify"
          color="primary"
          label="Search"
          hide-details
          flat
          variant="solo"
          clearable
          v-model="dnsSecretFilter"
          @keyup.esc="dnsSecretFilter=''"
        ></v-text-field>
        <v-menu v-if="canCreateSecrets" :nudge-bottom="20" :nudge-right="20" location="left" v-model="createDnsSecretMenu" absolute>
          <template v-slot:activator="{ on: menu }">
            <v-tooltip location="top">
              <template v-slot:activator="{ on: tooltip }">
                <v-btn v-on="{ ...menu, ...tooltip}" icon>
                  <v-icon color="toolbar-title">mdi-plus</v-icon>
                </v-btn>
              </template>
              Create DNS Secret
            </v-tooltip>
          </template>
          <v-list subheader dense>
            <v-subheader>Create DNS Secret</v-subheader>
            <v-list-item v-for="dnsProvider in dnsProviderTypes" :key="dnsProvider" @click="openSecretAddDialog(dnsProvider)">
              <v-list-item-action>
                 <infra-icon :value="dnsProvider" :size="24"></infra-icon>
              </v-list-item-action>
              <v-list-item-content class="text-primary">
                <v-list-item-title>
                    {{dnsProvider}}
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
        <table-column-selection
          :headers="dnsSecretTableHeaders"
          @set-selected-header="setSelectedDnsHeader"
          @reset="resetDnsTableSettings"
        ></table-column-selection>
      </v-toolbar>

      <v-card-text v-if="!dnsSecretItems.length">
        <div class="text-h6 text-grey-darken-1 my-4">Add DNS Secrets to your project</div>
        <p class="text-body-1">
          Before you can use your DNS Provider account for your cluster, you need to configure the credentials here.
        </p>
      </v-card-text>
      <v-data-table
        v-else
        :headers="visibleDnsSecretTableHeaders"
        :items="dnsSecretItems"
        :footer-props="{ 'items-per-page-options': [5,10,20] }"
        v-model:options="dnsSecretTableOptions"
        must-sort
        :search="dnsSecretFilter"
      >
        <template v-slot:item="{ item }">
          <secret-row-dns
            :item="item"
            :headers="dnsSecretTableHeaders"
            :key="`${item.cloudProfileName}/${item.name}`"
            @delete="onRemoveSecret"
            @update="onUpdateSecret"
          ></secret-row-dns>
        </template>
      </v-data-table>
    </v-card>

    <secret-dialog-wrapper
      :visible-dialog="visibleSecretDialog" :selected-secret="selectedSecret"
      @dialog-closed="onDialogClosed"
    ></secret-dialog-wrapper>
  </v-container>
</template>

<script>
import { mapGetters } from 'vuex'
import {
  isOwnSecret,
  mapTableHeader
} from '@/utils'
import get from 'lodash/get'
import SecretDialogWrapper from '@/components/dialogs/SecretDialogWrapper.vue'
import TableColumnSelection from '@/components/TableColumnSelection.vue'
import SecretRowInfra from '@/components/SecretRowInfra.vue'
import SecretRowDns from '@/components/SecretRowDns.vue'
import InfraIcon from '@/components/VendorIcon.vue'
import isEmpty from 'lodash/isEmpty'
import map from 'lodash/map'
import filter from 'lodash/filter'
import some from 'lodash/some'
import includes from 'lodash/includes'

export default {
  name: 'secrets',
  components: {
    SecretDialogWrapper,
    TableColumnSelection,
    SecretRowInfra,
    SecretRowDns,
    InfraIcon
  },
  data () {
    return {
      selectedSecret: {},
      defaultInfraSecretTableOptions: {
        itemsPerPage: 10,
        sortBy: ['name'],
        sortDesc: [false]
      },
      infraSecretSelectedColumns: {},
      infraSecretTableOptions: undefined,
      infraSecretFilter: '',
      createInfraSecretMenu: false,
      dnsSecretSelectedColumns: {},
      dnsSecretTableOptions: undefined,
      dnsSecretFilter: '',
      createDnsSecretMenu: false,
      visibleSecretDialog: undefined
    }
  },
  computed: {
    ...mapGetters([
      'cloudProfilesByCloudProviderKind',
      'getCloudProviderSecretByName',
      'infrastructureSecretList',
      'dnsSecretList',
      'shootList',
      'canCreateSecrets',
      'sortedCloudProviderKindList'
    ]),
    ...mapGetters('gardenerExtensions', [
      'sortedDnsProviderList'
    ]),
    hasCloudProfileForCloudProviderKind () {
      return (kind) => {
        return !isEmpty(this.cloudProfilesByCloudProviderKind(kind))
      }
    },
    infraSecretTableHeaders () {
      const headers = [
        {
          text: 'NAME',
          align: 'start',
          value: 'name',
          sortable: true,
          defaultSelected: true
        },
        {
          text: 'Secret',
          align: 'start',
          value: 'secret',
          sortable: true,
          defaultSelected: true
        },
        {
          text: 'INFRASTRUCTURE',
          align: 'start',
          value: 'infrastructure',
          sortable: true,
          defaultSelected: true
        },
        {
          text: 'DETAILS',
          align: 'start',
          value: 'details',
          sortable: false,
          defaultSelected: true
        },
        {
          text: 'USED BY',
          align: 'start',
          value: 'relatedShootCount',
          defaultSelected: true
        },
        {
          text: 'ACTIONS',
          align: 'end',
          value: 'actions',
          sortable: false,
          defaultSelected: true
        }
      ]
      return map(headers, header => ({
        ...header,
        class: 'nowrap',
        selected: get(this.infraSecretSelectedColumns, header.value, header.defaultSelected)
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
        isSupportedCloudProvider: includes(this.sortedCloudProviderKindList, secret.metadata.cloudProviderKind),
        secret
      }))
    },
    dnsProviderTypes () {
      return map(this.sortedDnsProviderList, 'type')
    },
    dnsSecretTableHeaders () {
      const headers = [
        {
          text: 'NAME',
          align: 'start',
          value: 'name',
          sortable: true,
          defaultSelected: true
        },
        {
          text: 'Secret',
          align: 'start',
          value: 'secret',
          sortable: true,
          defaultSelected: true
        },
        {
          text: 'DNS Provider',
          align: 'start',
          value: 'dnsProvider',
          sortable: true,
          defaultSelected: true
        },
        {
          text: 'DETAILS',
          align: 'start',
          value: 'details',
          sortable: false,
          defaultSelected: true
        },
        {
          text: 'USED BY',
          align: 'start',
          value: 'relatedShootCount',
          defaultSelected: true
        },
        {
          text: 'ACTIONS',
          align: 'end',
          value: 'actions',
          sortable: false,
          defaultSelected: true
        }
      ]
      return map(headers, header => ({
        ...header,
        class: 'nowrap',
        selected: get(this.infraSecretSelectedColumns, header.value, header.defaultSelected)
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
        secret
      }))
    }
  },
  methods: {
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
          secretName: secret.metadata.name
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
      this.$set(this.infraSecretSelectedColumns, header.value, !header.selected)
      this.saveSelectedColumns()
    },
    resetInfraTableSettings () {
      this.infraSecretSelectedColumns = mapTableHeader(this.infraSecretTableHeaders, 'defaultSelected')
      this.tableOptions = this.defaultInfraSecretTableOptions
      this.saveSelectedColumns()
    },
    setSelectedDnsHeader (header) {
      this.$set(this.dnsSecretSelectedColumns, header.value, !header.selected)
      this.saveSelectedColumns()
    },
    resetDnsTableSettings () {
      this.dnsSecretSelectedColumns = mapTableHeader(this.dnsSecretTableHeaders, 'defaultSelected')
      this.tableOptions = this.defaultDnsSecretTableOptions
      this.saveSelectedColumns()
    },
    saveSelectedColumns () {
      this.$localStorage.setObject('secrets/secret-list/selected-columns', mapTableHeader(this.infraSecretTableHeaders, 'selected'))
    },
    updateTableSettings () {
      this.infraSecretSelectedColumns = this.$localStorage.getObject('members/secret-list/selected-columns') || {}
      const tableOptions = this.$localStorage.getObject('members/secret-list/options')
      this.infraSecretTableOptions = {
        ...this.defaultInfraSecretTableOptions,
        ...tableOptions
      }
    },
    onDialogClosed () {
      this.visibleSecretDialog = undefined
    }
  },
  watch: {
    infraSecretTableOptions (value) {
      if (!value) {
        return
      }
      const { sortBy, sortDesc, itemsPerPage } = value
      if (!sortBy || !sortBy.length) { // initial table options
        return
      }
      this.$localStorage.setObject('members/secret-list/options', { sortBy, sortDesc, itemsPerPage })
    }
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
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.updateTableSettings()
    })
  },
  beforeRouteUpdate (to, from, next) {
    this.updateTableSettings()
    next()
  }
}
</script>
