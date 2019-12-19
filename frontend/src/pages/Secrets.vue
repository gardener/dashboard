<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
    icon="aws-white"
    secretDescriptorKey="accessKeyID"
    description="Before you can provision and access a Kubernetes cluster on AWS, you need to add account credentials."
    color="aws-bgcolor"
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
    icon="azure-white"
    secretDescriptorKey="subscriptionID"
    description="Make sure that the new credentials have the correct permission on Azure."
    color="azure-bgcolor"
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
    icon="gcp-white"
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
    icon="openstack-white"
    description="Make sure that the new credentials have the correct OpenStack permissions"
    color="openstack-bgcolor"
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    >
      <template v-if="isOwnSecretBinding(props.secret)" slot="rowSubTitle" slot-scope="props">
        {{props.secret.data.domainName}} / {{props.secret.data.tenantName}}
      </template>
    </secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('alicloud')"
    class="mt-3"
    infrastructureKey="alicloud"
    infrastructureName="Alibaba Cloud"
    secretDescriptorKey="accessKeyID"
    icon="alicloud-white"
    description="Make sure that the new credentials have the correct Alibaba Cloud permissions"
    color="grey darken-4"
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('metal')"
    class="mt-3"
    infrastructureKey="metal"
    infrastructureName="Metal Cloud"
    secretDescriptorKey="metalHMAC"
    icon="metal-white"
    description="Make sure that the new credentials have the correct Metal Cloud permissions"
    color="metal-bgcolor"
    @add="onAdd"
    @toogleHelp="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <template v-if="showDisabledCloudProviders">

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

    <secret-dialog-wrapper :dialogState="dialogState" :selectedSecret="selectedSecret"></secret-dialog-wrapper>
    <delete-dialog v-if="selectedSecret" v-model="dialogState.deleteConfirm" :secret="selectedSecret" :backgroundSrc="backgroundForSelectedSecret"></delete-dialog>

    <v-fab-transition>
      <v-speed-dial fixed bottom right v-show="floatingButton" direction="top" transition="slide-y-reverse-transition" v-model="dialogState.speedDial">
        <v-btn slot="activator" class="cyan darken-2" dark fab v-model="dialogState.speedDial">
          <v-icon>add</v-icon>
          <v-icon>close</v-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('alicloud')" fab dark small class="grey darken-4" @click="onAdd('alicloud')">
          <infra-icon value="alicloud-white" :width="20"></infra-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('openstack')" fab dark small :color="infrastructureColor('openstack')" @click="onAdd('openstack')">
          <infra-icon value="openstack-white" :width="20"></infra-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('gcp')" fab dark small class="green" @click="onAdd('gcp')">
          <infra-icon value="gcp-white" :width="20"></infra-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('azure')" fab dark small :color="infrastructureColor('azure')" @click="onAdd('azure')">
          <infra-icon value="azure-white" :width="20"></infra-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('aws')" fab dark small :color="infrastructureColor('aws')" @click="onAdd('aws')">
          <infra-icon value="aws-white" :width="20"></infra-icon>
        </v-btn>
        <v-btn v-if="hasCloudProfileForCloudProviderKind('metal')" fab dark small :color="infrastructureColor('metal')" @click="onAdd('metal')">
          <infra-icon value="metal-white" :width="20"></infra-icon>
        </v-btn>
      </v-speed-dial>
    </v-fab-transition>
  </v-container>
</template>

<script>
import { mapGetters } from 'vuex'
import get from 'lodash/get'
import { isOwnSecretBinding, infrastructureColor } from '@/utils'
import DeleteDialog from '@/dialogs/SecretDialogDelete'
import SecretDialogWrapper from '@/dialogs/SecretDialogWrapper'
import Secret from '@/components/Secret'
import DisabledSecret from '@/components/DisabledSecret'
import InfraIcon from '@/components/VendorIcon'
import isEmpty from 'lodash/isEmpty'
import merge from 'lodash/merge'

export default {
  name: 'secrets',
  components: {
    DeleteDialog,
    Secret,
    DisabledSecret,
    InfraIcon,
    SecretDialogWrapper
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
        case 'alicloud':
          return '/static/background_alicloud.svg'
        case 'metal':
          return '/static/background_metal.svg'
      }
      return '/static/background_aws.svg'
    },
    hideDialogs () {
      merge(this.dialogState, this.initialDialogState)
    },
    isOwnSecretBinding (secret) {
      return isOwnSecretBinding(secret)
    },
    infrastructureColor (kind) {
      return infrastructureColor(kind)
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
