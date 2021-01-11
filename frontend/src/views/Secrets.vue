<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('aws')"
    infrastructure-key="aws"
    infrastructure-name="Amazon Web Services"
    icon="aws"
    secret-descriptor-key="accessKeyID"
    description="Before you can provision and access a Kubernetes cluster on AWS, you need to add account credentials."
    @add="onAdd"
    @toogle-help="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('azure')"
    class="mt-4"
    infrastructure-key="azure"
    infrastructure-name="Microsoft Azure Cloud"
    icon="azure"
    secret-descriptor-key="subscriptionID"
    description="Make sure that the new credentials have the correct permission on Azure."
    @add="onAdd"
    @toogle-help="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('gcp')"
    class="mt-4"
    infrastructure-key="gcp"
    infrastructure-name="Google Cloud Platform"
    icon="gcp"
    secret-descriptor-key="project"
    description="Make sure that the new credentials have the correct permission on GCP."
    @add="onAdd"
    @toogle-help="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('openstack')"
    class="mt-4"
    infrastructure-key="openstack"
    infrastructure-name="OpenStack"
    icon="openstack"
    description="Make sure that the new credentials have the correct OpenStack permissions"
    @add="onAdd"
    @toogle-help="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('alicloud')"
    class="mt-4"
    infrastructure-key="alicloud"
    infrastructure-name="Alibaba Cloud"
    secret-descriptor-key="accessKeyID"
    icon="alicloud"
    description="Make sure that the new credentials have the correct Alibaba Cloud permissions"
    @add="onAdd"
    @toogle-help="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('metal')"
    class="mt-4"
    infrastructure-key="metal"
    infrastructure-name="Metal Cloud"
    secret-descriptor-key="metalHMAC"
    icon="metal"
    description="Make sure that the new credentials have the correct Metal Cloud permissions"
    @add="onAdd"
    @toogle-help="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <secret
    v-if="hasCloudProfileForCloudProviderKind('vsphere')"
    class="mt-4"
    infrastructure-key="vsphere"
    infrastructure-name="VMware vSphere"
    secret-descriptor-key="vsphereUsername"
    icon="vsphere"
    description="Make sure that the new credentials have the correct VMware vSphere permissions"
    @add="onAdd"
    @toogle-help="onToogleHelp"
    @update="onUpdate"
    @delete="onDelete"
    ></secret>

    <template v-if="showDisabledCloudProviders">

      <disabled-secret
      class="mt-4"
      infrastructure-name="Digital Ocean"
      icon="digital-ocean"
      description="Before you can provision and access a Kubernetes cluster on Digital Ocean, you need to add account credentials."
        ></disabled-secret>

      <disabled-secret
      class="mt-4"
      infrastructure-name="China Telecom"
      icon="china-telecom"
      description="Before you can provision and access a Kubernetes cluster on China Telecom, you need to add account credentials."
        ></disabled-secret>

      <disabled-secret
      class="mt-4"
      infrastructure-name="Nutanix"
      icon="mdi-xamarin"
      description="Before you can provision and access a Kubernetes cluster on Nutanix, you need to add account credentials."
        ></disabled-secret>

    </template>

    <secret-dialog-wrapper :dialog-state="dialogState" :selected-secret="selectedSecret"></secret-dialog-wrapper>
    <delete-dialog v-if="selectedSecret" v-model="dialogState.deleteConfirm" :secret="selectedSecret"></delete-dialog>
  </v-container>
</template>

<script>
import { mapGetters } from 'vuex'
import { isOwnSecret } from '@/utils'
import get from 'lodash/get'
import DeleteDialog from '@/components/dialogs/SecretDialogDelete'
import SecretDialogWrapper from '@/components/dialogs/SecretDialogWrapper'
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
