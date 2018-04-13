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

  <v-container fluid class="secrets">

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
      <template slot="rowSubTitle" slot-scope="props">
        {{props.data.domainName}} / {{props.data.tenantName}}
      </template>
    </secret>

    <aws-dialog v-model="aws.visible" :secret="selectedSecret"></aws-dialog>
    <aws-help-dialog v-model="aws.help"></aws-help-dialog>

    <azure-dialog v-model="azure.visible" :secret="selectedSecret"></azure-dialog>
    <azure-help-dialog v-model="azure.help"></azure-help-dialog>

    <gcp-dialog v-model="gcp.visible" :secret="selectedSecret"></gcp-dialog>
    <gcp-help-dialog v-model="gcp.help"></gcp-help-dialog>

    <openstack-dialog v-model="openstack.visible" :secret="selectedSecret"></openstack-dialog>
    <openstack-help-dialog v-model="openstack.help"></openstack-help-dialog>

    <delete-dialog v-if="selectedSecret" v-model="deleteConfirm" :secret="selectedSecret" :backgroundSrc="backgroundForSelectedSecret"></delete-dialog>

    <v-speed-dial fixed bottom right fab dark v-show="floatingButton" direction="top" transition="scale-transition">
      <v-btn slot="activator" class="blue darken-2" dark fab v-model="speedDial">
        <v-icon>add</v-icon>
        <v-icon>close</v-icon>
      </v-btn>
      <v-btn v-if="hasCloudProfileForCloudProviderKind('openstack')" fab dark small class="orange" @click.native.stop="onAdd('openstack')">
        <v-icon>mdi-server-network</v-icon>
      </v-btn>
      <v-btn v-if="hasCloudProfileForCloudProviderKind('gcp')" fab dark small class="green" @click.stop="onAdd('gcp')">
        <v-icon>mdi-google</v-icon>
      </v-btn>
      <v-btn v-if="hasCloudProfileForCloudProviderKind('azure')" fab dark small class="blue" @click.native.stop="onAdd('azure')">
        <v-icon>mdi-microsoft</v-icon>
      </v-btn>
      <v-btn v-if="hasCloudProfileForCloudProviderKind('aws')" fab dark small class="orange darken-2" @click.native.stop="onAdd('aws')">
        <v-icon>mdi-amazon</v-icon>
      </v-btn>
    </v-speed-dial>
  </v-container>
</template>

<script>
  import { mapGetters } from 'vuex'
  import get from 'lodash/get'
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
  import isEmpty from 'lodash/isEmpty'

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
      Secret
    },
    data () {
      return {
        selectedSecret: {},
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
        speedDial: false,
        deleteConfirm: false,
        floatingButton: false
      }
    },
    computed: {
      ...mapGetters([
        'cloudProfilesByCloudProviderKind'
      ]),
      backgroundForSelectedSecret () {
        const kind = get(this.selectedSecret, 'metadata.cloudProviderKind')
        return this.backgroundForCloudProviderKind(kind)
      },
      hasCloudProfileForCloudProviderKind () {
        return (kind) => {
          return !isEmpty(this.cloudProfilesByCloudProviderKind(kind))
        }
      }
    },
    methods: {
      onToogleHelp (infrastructureKind) {
        const infrastructure = this[infrastructureKind]
        infrastructure.help = !infrastructure.help
      },
      onHideHelp (infrastructureKind) {
        this[infrastructureKind].help = false
      },
      onAdd (infrastructureKind) {
        this.selectedSecret = undefined
        this[infrastructureKind].visible = true
      },
      onUpdate (row) {
        const kind = row.metadata.cloudProviderKind
        this.selectedSecret = row
        this[kind].visible = true
      },
      onDelete (row) {
        this.selectedSecret = row
        this.deleteConfirm = true
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
      }
    },
    mounted () {
      this.floatingButton = true
    }
  }
</script>
