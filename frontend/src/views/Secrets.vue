<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('aws')"
    infrastructureKey="aws"
    infrastructureName="Amazon Web Services"
    icon="aws"
    secretDescriptorKey="accessKeyID"
    description="Before you can provision and access a Kubernetes cluster on AWS, you need to add account credentials."
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('azure')"
    class="mt-4"
    infrastructureKey="azure"
    infrastructureName="Microsoft Azure Cloud"
    icon="azure"
    secretDescriptorKey="subscriptionID"
    description="Make sure that the new credentials have the correct permission on Azure."
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('gcp')"
    class="mt-4"
    infrastructureKey="gcp"
    infrastructureName="Google Cloud Platform"
    icon="gcp"
    secretDescriptorKey="project"
    description="Make sure that the new credentials have the correct permission on GCP."
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('openstack')"
    class="mt-4"
    infrastructureKey="openstack"
    infrastructureName="OpenStack"
    icon="openstack"
    description="Make sure that the new credentials have the correct OpenStack permissions"
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('alicloud')"
    class="mt-4"
    infrastructureKey="alicloud"
    infrastructureName="Alibaba Cloud"
    secretDescriptorKey="accessKeyID"
    icon="alicloud"
    description="Make sure that the new credentials have the correct Alibaba Cloud permissions"
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('metal')"
    class="mt-4"
    infrastructureKey="metal"
    infrastructureName="Metal Cloud"
    secretDescriptorKey="metalHMAC"
    icon="metal"
    description="Make sure that the new credentials have the correct Metal Cloud permissions"
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('vsphere')"
    class="mt-4"
    infrastructureKey="vsphere"
    infrastructureName="VMware vSphere"
    secretDescriptorKey="vsphereUsername"
    icon="vsphere"
    description="Make sure that the new credentials have the correct VMware vSphere permissions"
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <template v-if="showDisabledCloudProviders">

      <disabled-secret
      class="mt-4"
      infrastructureName="Digital Ocean"
      icon="digital-ocean"
      description="Before you can provision and access a Kubernetes cluster on Digital Ocean, you need to add account credentials."
        ></disabled-secret>

      <disabled-secret
      class="mt-4"
      infrastructureName="China Telecom"
      icon="china-telecom"
      description="Before you can provision and access a Kubernetes cluster on China Telecom, you need to add account credentials."
        ></disabled-secret>

      <disabled-secret
      class="mt-4"
      infrastructureName="Nutanix"
      icon="mdi-xamarin"
      description="Before you can provision and access a Kubernetes cluster on Nutanix, you need to add account credentials."
        ></disabled-secret>

    </template>

    <secret-dialog-wrapper :dialogState="dialogState" :selectedSecret="selectedSecret"></secret-dialog-wrapper>
    <delete-dialog v-if="selectedSecret" v-model="dialogState.deleteConfirm" :secret="selectedSecret"></delete-dialog>

    <v-fab-transition>
      <v-speed-dial fixed bottom right v-show="floatingButton" direction="top" transition="slide-y-reverse-transition" v-model="dialogState.speedDial">
        <template v-slot:activator>
          <v-btn class="primary" fab v-model="dialogState.speedDial">
            <v-icon v-if="dialogState.speedDial">mdi-close</v-icon>
            <v-icon v-else>mdi-plus</v-icon>
          </v-btn>
        </template>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('vsphere')" fab small @click="onAdd('vsphere')">
          <infra-icon value="vsphere"></infra-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('metal')" fab small @click="onAdd('metal')">
          <infra-icon value="metal"></infra-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('alicloud')" fab small @click="onAdd('alicloud')">
          <infra-icon value="alicloud"></infra-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('openstack')" fab small @click="onAdd('openstack')">
          <infra-icon value="openstack"></infra-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('gcp')" fab small @click="onAdd('gcp')">
          <infra-icon value="gcp"></infra-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('azure')" fab small @click="onAdd('azure')">
          <infra-icon value="azure"></infra-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('aws')" fab small @click="onAdd('aws')">
          <infra-icon value="aws"></infra-icon>
        </v-btn>
      </v-speed-dial>
    </v-fab-transition>
  </v-container>
</template>

<script>
import { mapGetters } from 'vuex'
import { isOwnSecret } from '@/utils'
import get from 'lodash/get'
import DeleteDialog from '@/components/dialogs/SecretDialogDelete'
import SecretDialogWrapper from '@/components/dialogs/SecretDialogWrapper'
import InfraIcon from '@/components/InfraIcon'
import Secret from '@/components/Secret'
import DisabledSecret from '@/components/DisabledSecret'
import isEmpty from 'lodash/isEmpty'
import merge from 'lodash/merge'

export default {
  name: 'secrets',
  components: {
    DeleteDialog,
    Secret,
    DisabledSecret,
    SecretDialogWrapper,
    InfraIcon
  },
  data () {
    return {
      selectedSecret: {}, // pragma: whitelist secret
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
      floatingButton: false
    }
  },
  computed: {
    ...mapGetters([
      'cloudProfilesByCloudProviderKind',
      'getInfrastructureSecretByName'
    ]),
    hasCloudProfileForCloudProviderKind () {
      return (kind) => {
        return !isEmpty(this.cloudProfilesByCloudProviderKind(kind))
      }
    },
    showDisabledCloudProviders () {
      return !!this.$store.state.cfg.showDisabledCloudProviders
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
    onAdd (infrastructureKind) {
      this.selectedSecret = undefined // pragma: whitelist secret
      this.dialogState[infrastructureKind].visible = true
    },
    onUpdate (row) {
      const kind = row.metadata.cloudProviderKind
      this.selectedSecret = row // pragma: whitelist secret
      this.dialogState[kind].visible = true
    },
    onDelete (row) {
      this.selectedSecret = row // pragma: whitelist secret
      this.dialogState.deleteConfirm = true
    },
    hideDialogs () {
      merge(this.dialogState, this.initialDialogState)
    }
  },
  mounted () {
    this.floatingButton = true
    if (!get(this.$route.params, 'name')) {
      return
    }
    const infrastructureSecret = this.getInfrastructureSecretByName(this.$route.params)
    if (!infrastructureSecret || !isOwnSecret(infrastructureSecret)) {
      return
    }
    this.onUpdate(infrastructureSecret)
  },
  created () {
    merge(this.initialDialogState, this.dialogState)

    this.$bus.$on('esc-pressed', () => {
      this.hideDialogs()
    })
  }
}
</script>
