<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->

<template>
  <v-container fluid>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('aws')"
    infrastructureKey="aws"
    infrastructureName="Amazon Web Services"
    icon="mdi-amazon"
    secretDescriptorKey="accessKeyID"
    description="Before you can provision and access a Kubernetes cluster on AWS, you need to add account credentials."
    color="orange darken-2"
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('azure')"
    class="mt-3"
    infrastructureKey="azure"
    infrastructureName="Microsoft Azure Cloud"
    icon="mdi-microsoft"
    secretDescriptorKey="subscriptionID"
    description="Make sure that the new credentials have the correct permission on Azure."
    color="blue"
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('gcp')"
    class="mt-3"
    infrastructureKey="gcp"
    infrastructureName="Google Cloud Platform"
    icon="mdi-google"
    secretDescriptorKey="project"
    description="Make sure that the new credentials have the correct permission on GCP."
    color="green"
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('openstack')"
    class="mt-3"
    infrastructureKey="openstack"
    infrastructureName="OpenStack"
    icon="mdi-server-network"
    description="Make sure that the new credentials have the correct OpenStack permissions"
    color="orange"
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    >
      <template v-if="isOwnSecretBinding(props.secret)" slot="rowSubTitle" slot-scope="props">
        {{props.secret.data.domainName}} / {{props.secret.data.tenantName}}
      </template>
    </secret>

    <template v-if="showDisabledCloudProviders">

      <disabled-secret
      class="mt-3"
      infrastructureName="Alibaba Cloud"
      icon="alibaba-cloud"
      description="Before you can provision and access a Kubernetes cluster on Alibaba Cloud, you need to add account credentials."
      color="black"
      ></disabled-secret>

      <disabled-secret
      class="mt-3"
      infrastructureName="Digital Ocean"
      icon="digital-ocean"
      description="Before you can provision and access a Kubernetes cluster on Digital Ocean, you need to add account credentials."
      color="blue"
      ></disabled-secret>

      <disabled-secret
      class="mt-3"
      infrastructureName="VMware"
      icon="vmware"
      description="Before you can provision and access a Kubernetes cluster on VMware, you need to add account credentials."
      color="green darken-4"
      ></disabled-secret>

      <disabled-secret
      class="mt-3"
      infrastructureName="China Telecom"
      icon="china-telecom"
      description="Before you can provision and access a Kubernetes cluster on China Telecom, you need to add account credentials."
      color="blue darken-3"
      ></disabled-secret>

      <disabled-secret
      class="mt-3"
      infrastructureName="Nutanix"
      icon="mdi-xamarin"
      description="Before you can provision and access a Kubernetes cluster on Nutanix, you need to add account credentials."
      color="light-green lighten-1"
      ></disabled-secret>

    </template>

    <aws-dialog v-model="dialogState.aws.visible" :secret="selectedSecret"></aws-dialog>
    <aws-help-dialog v-model="dialogState.aws.help"></aws-help-dialog>

    <azure-dialog v-model="dialogState.azure.visible" :secret="selectedSecret"></azure-dialog>
    <azure-help-dialog v-model="dialogState.azure.help"></azure-help-dialog>

    <gcp-dialog v-model="dialogState.gcp.visible" :secret="selectedSecret"></gcp-dialog>
    <gcp-help-dialog v-model="dialogState.gcp.help"></gcp-help-dialog>

    <openstack-dialog v-model="dialogState.openstack.visible" :secret="selectedSecret"></openstack-dialog>
    <openstack-help-dialog v-model="dialogState.openstack.help"></openstack-help-dialog>

    <delete-dialog v-if="selectedSecret" v-model="dialogState.deleteConfirm" :secret="selectedSecret" :backgroundSrc="backgroundForSelectedSecret"></delete-dialog>

    <v-fab-transition>
      <v-speed-dial fixed bottom right v-show="floatingButton" direction="top" transition="slide-y-reverse-transition" v-model="dialogState.speedDial">
        <v-btn slot="activator" class="cyan darken-2" dark fab v-model="dialogState.speedDial">
          <v-icon>add</v-icon>
          <v-icon>close</v-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('openstack')" fab dark small class="orange" @click="onAdd('openstack')">
          <v-icon>mdi-server-network</v-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('gcp')" fab dark small class="green" @click="onAdd('gcp')">
          <v-icon>mdi-google</v-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('azure')" fab dark small class="blue" @click="onAdd('azure')">
          <v-icon>mdi-microsoft</v-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('aws')" fab dark small class="orange darken-2" @click="onAdd('aws')">
          <v-icon>mdi-amazon</v-icon>
        </v-btn>
      </v-speed-dial>
    </v-fab-transition>
  </v-container>
</template>

<script>
import { mapGetters } from 'vuex'
import get from 'lodash/get'
import { isOwnSecretBinding } from '@/utils'
import GcpDialog from '@/dialogs/SecretDialogGcp'
import GcpHelpDialog from '@/dialogs/SecretDialogGcpHelp'
import AwsHelpDialog from '@/dialogs/SecretDialogAwsHelp'
import AwsDialog from '@/dialogs/SecretDialogAws'
import AzureDialog from '@/dialogs/SecretDialogAzure'
import AzureHelpDialog from '@/dialogs/SecretDialogAzureHelp'
import OpenstackDialog from '@/dialogs/SecretDialogOpenstack'
import OpenstackHelpDialog from '@/dialogs/SecretDialogOpenstackHelp'
import DeleteDialog from '@/dialogs/SecretDialogDelete'
import Secret from '@/components/Secret'
import DisabledSecret from '@/components/DisabledSecret'
import isEmpty from 'lodash/isEmpty'
import merge from 'lodash/merge'

export default {
  name: 'secrets',
  components: {
    GcpDialog,
    GcpHelpDialog,
    AzureHelpDialog,
    AzureDialog,
    AwsDialog,
    AwsHelpDialog,
    OpenstackDialog,
    OpenstackHelpDialog,
    DeleteDialog,
    Secret,
    DisabledSecret
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
    backgroundForSelectedSecret () {
      const kind = get(this.selectedSecret, 'metadata.cloudProviderKind')
      return this.backgroundForCloudProviderKind(kind)
    },
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
      this.selectedSecret = undefined
      this.dialogState[infrastructureKind].visible = true
    },
    onUpdate (row) {
      const kind = row.metadata.cloudProviderKind
      this.selectedSecret = row
      this.dialogState[kind].visible = true
    },
    onDelete (row) {
      this.selectedSecret = row
      this.dialogState.deleteConfirm = true
    },
    backgroundForCloudProviderKind (kind) {
      switch (kind) {
        case 'azure':
          return '/static/background_azure.svg'
        case 'aws':
          return '/static/background_aws.svg'
        case 'gcp':
          return '/static/background_gcp.svg'
        case 'openstack':
          return '/static/background_openstack.svg'
      }
      return '/static/background_aws.svg'
    },
    hideDialogs () {
      merge(this.dialogState, this.initialDialogState)
    },
    isOwnSecretBinding (secret) {
      return isOwnSecretBinding(secret)
    }
  },
  mounted () {
    this.floatingButton = true

    if (get(this.$route.params, 'name')) {
      const infrastructureSecret = this.getInfrastructureSecretByName(this.$route.params)
      if (infrastructureSecret) {
        this.onUpdate(infrastructureSecret)
      }
    }
  },
  created () {
    merge(this.initialDialogState, this.dialogState)

    this.$bus.$on('esc-pressed', () => {
      this.hideDialogs()
    })
  }
}
</script>
