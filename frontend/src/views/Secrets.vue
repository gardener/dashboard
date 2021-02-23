<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-card class="mt-6">
      <v-toolbar flat color="toolbar-background toolbar-title--text">
        <v-icon class="pr-2" color="toolbar-title">mdi-key</v-icon>
        <v-toolbar-title class="subtitle-1">
          Project Secrets
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="secretList.length > 3"
          class="mr-3"
          prepend-inner-icon="mdi-magnify"
          color="primary"
          label="Search"
          hide-details
          flat
          solo
          clearable
          v-model="secretFilter"
          @keyup.esc="secretFilter=''"
        ></v-text-field>
        <v-menu v-if="canCreateSecrets" :nudge-bottom="20" :nudge-right="20" left v-model="createSecretMenu" absolute>
          <template v-slot:activator="{ on: menu }">
            <v-tooltip top>
              <template v-slot:activator="{ on: tooltip }">
                <v-btn v-on="{ ...menu, ...tooltip}" icon>
                  <v-icon color="toolbar-title">mdi-plus</v-icon>
                </v-btn>
              </template>
              Create Secret
            </v-tooltip>
          </template>
          <v-list subheader dense>
            <v-subheader>Create Secret</v-subheader>
            <v-list-item v-for="infrastructure in sortedCloudProviderKindList" :key="infrastructure" @click="openSecretAddDialog(infrastructure)">
              <v-list-item-action>
                 <infra-icon :value="infrastructure" :size="24"></infra-icon>
              </v-list-item-action>
              <v-list-item-content class="primary--text">
                <v-list-item-title>
                    {{infrastructure}}
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
        <table-column-selection
          :headers="secretTableHeaders"
          @set-selected-header="setSelectedHeader"
          @reset="resetTableSettings"
        ></table-column-selection>
      </v-toolbar>

      <v-card-text v-if="!secretList.length">
        <div class="title grey--text text--darken-1 my-4">Add Secrets to your project.</div>
        <p class="body-1">
          Before you can provision and access a Kubernetes cluster, you need to add account credentials. The Gardener needs the credentials to provision and operate the infrastructure for your Kubernetes cluster.
        </p>
      </v-card-text>
      <v-data-table
        v-else
        :headers="visibleSecretTableHeaders"
        :items="secretList"
        :footer-props="{ 'items-per-page-options': [5,10,20] }"
        :options.sync="secretTableOptions"
        must-sort
        :search="secretFilter"
      >
        <template v-slot:item="{ item }">
          <secret-row
            :item="item"
            :headers="secretTableHeaders"
            :key="`${item.cloudProfileName}/${item.name}`"
            @delete="onRemoveSecret"
            @update="onUpdateSecret"
          ></secret-row>
        </template>
      </v-data-table>
    </v-card>

    <secret-dialog-wrapper :dialog-state="dialogState" :selected-secret="selectedSecret"></secret-dialog-wrapper>
    <delete-dialog v-if="selectedSecret" v-model="dialogState.deleteConfirm" :secret="selectedSecret"></delete-dialog>
  </v-container>
</template>

<script>
import { mapGetters } from 'vuex'
import { isOwnSecret, mapTableHeader } from '@/utils'
import get from 'lodash/get'
import DeleteDialog from '@/components/dialogs/SecretDialogDelete'
import SecretDialogWrapper from '@/components/dialogs/SecretDialogWrapper'
import TableColumnSelection from '@/components/TableColumnSelection.vue'
import SecretRow from '@/components/SecretRow.vue'
import InfraIcon from '@/components/VendorIcon'
import isEmpty from 'lodash/isEmpty'
import merge from 'lodash/merge'
import map from 'lodash/map'
import filter from 'lodash/filter'
import includes from 'lodash/includes'

export default {
  name: 'secrets',
  components: {
    DeleteDialog,
    SecretDialogWrapper,
    TableColumnSelection,
    SecretRow,
    InfraIcon
  },
  data () {
    return {
      selectedSecret: {},
      dialogState: {
        aws: {
          visible: false,
          help: false
        },
        azure: {
          visible: false,
          help: false
        },
        gcp: {
          visible: false,
          help: false
        },
        openstack: {
          visible: false,
          help: false
        },
        alicloud: {
          visible: false,
          help: false
        },
        metal: {
          visible: false,
          help: false
        },
        vsphere: {
          visible: false,
          help: false
        },
        deleteConfirm: false,
        speedDial: false
      },
      initialDialogState: {},
      defaultSecretTableOptions: {
        itemsPerPage: 10,
        sortBy: ['name'],
        sortDesc: [false]
      },
      secretSelectedColumns: {},
      secretTableOptions: undefined,
      secretFilter: '',
      createSecretMenu: false
    }
  },
  computed: {
    ...mapGetters([
      'cloudProfilesByCloudProviderKind',
      'getInfrastructureSecretByName',
      'infrastructureSecretList',
      'shootList',
      'canCreateSecrets',
      'sortedCloudProviderKindList'
    ]),
    hasCloudProfileForCloudProviderKind () {
      return (kind) => {
        return !isEmpty(this.cloudProfilesByCloudProviderKind(kind))
      }
    },
    secretTableHeaders () {
      const headers = [
        {
          text: 'NAME',
          align: 'start',
          value: 'name',
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
        selected: get(this.secretSelectedColumns, header.value, header.defaultSelected)
      }))
    },
    visibleSecretTableHeaders () {
      return filter(this.secretTableHeaders, ['selected', true])
    },
    secretList () {
      return map(this.infrastructureSecretList, secret => ({
        name: secret.metadata.name,
        isOwnSecret: isOwnSecret(secret),
        ownernamespace: secret.metadata.secretRef.namespace,
        infrastructure: `${secret.metadata.cloudProviderKind}${secret.metadata.cloudProfileName}`,
        infrastructureName: secret.metadata.cloudProviderKind,
        cloudProfileName: secret.metadata.cloudProfileName,
        details: this.getSecretDetails(secret),
        relatedShootCount: this.relatedShootCount(secret),
        relatedShootCountLabel: this.relatedShootCountLabel(secret),
        isSupportedInfrastructure: includes(this.sortedCloudProviderKindList, secret.metadata.cloudProviderKind),
        secret
      }))
    }
  },
  methods: {
    onToogleHelp (infrastructureKind) {
      const infrastructure = this.dialogState[infrastructureKind]
      infrastructure.help = !infrastructure.help
    },
    onHideHelp (infrastructureKind) {
      this.dialogState[infrastructureKind].help = false
    },
    openSecretAddDialog (infrastructureKind) {
      this.selectedSecret = undefined
      this.dialogState[infrastructureKind].visible = true
    },
    onUpdateSecret (secret) {
      const kind = secret.metadata.cloudProviderKind
      this.selectedSecret = secret
      this.dialogState[kind].visible = true
    },
    onRemoveSecret (secret) {
      this.selectedSecret = secret
      this.dialogState.deleteConfirm = true
    },
    hideDialogs () {
      merge(this.dialogState, this.initialDialogState)
    },
    getSecretDetails (secret) {
      const secretData = secret.data || {}
      switch (secret.metadata.cloudProviderKind) {
        case 'openstack':
          return [
            {
              label: 'Domain Name',
              value: secretData.domainName
            },
            {
              label: 'Tenant Name',
              value: secretData.tenantName
            }
          ]
        case 'vsphere':
          return [
            {
              label: 'vSphere Username',
              value: secretData.vsphereUsername
            },
            {
              label: 'NSX-T Username',
              value: secretData.nsxtUsername
            }
          ]
        case 'aws':
          return [
            {
              label: 'Access Key ID',
              value: secretData.accessKeyID
            }
          ]
        case 'azure':
          return [
            {
              label: 'Subscription ID',
              value: secretData.subscriptionID
            }
          ]
        case 'gcp':
          return [
            {
              label: 'Project',
              value: secretData.project
            }
          ]
        case 'alicloud':
          return [
            {
              label: 'Access Key ID',
              value: secretData.accessKeyID
            }
          ]
      }
      return undefined
    },
    relatedShootCount (secret) {
      const name = secret.metadata.name
      const shootsByInfrastructureSecret = filter(this.shootList, ['spec.secretBindingName', name])
      return shootsByInfrastructureSecret.length
    },
    relatedShootCountLabel (secret) {
      const count = this.relatedShootCount(secret)
      if (count === 0) {
        return 'currently unused'
      } else {
        return `${count} ${count > 1 ? 'clusters' : 'cluster'}`
      }
    },
    setSelectedHeader (header) {
      this.$set(this.secretSelectedColumns, header.value, !header.selected)
      this.saveSelectedColumns()
    },
    resetTableSettings () {
      this.secretSelectedColumns = mapTableHeader(this.secretTableHeaders, 'defaultSelected')
      this.tableOptions = this.defaultSecretTableOptions
      this.saveSelectedColumns()
    },
    saveSelectedColumns () {
      this.$localStorage.setObject('secrets/secret-list/selected-columns', mapTableHeader(this.secretTableHeaders, 'selected'))
    },
    updateTableSettings () {
      this.secretSelectedColumns = this.$localStorage.getObject('members/secret-list/selected-columns') || {}
      const tableOptions = this.$localStorage.getObject('members/secret-list/options')
      this.secretTableOptions = {
        ...this.defaultSecretTableOptions,
        ...tableOptions
      }
    }
  },
  watch: {
    secretTableOptions (value) {
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
    const infrastructureSecret = this.getInfrastructureSecretByName(this.$route.params)
    if (!infrastructureSecret || !isOwnSecret(infrastructureSecret)) {
      return
    }
    this.onUpdateSecret(infrastructureSecret)
  },
  created () {
    merge(this.initialDialogState, this.dialogState)

    this.$bus.$on('esc-pressed', () => {
      this.hideDialogs()
    })
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
