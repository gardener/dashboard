<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div>
    <aws-dialog v-model="dialogState.aws.visible" :secret="selectedSecret" @input="onInput('aws')"></aws-dialog>
    <azure-dialog v-model="dialogState.azure.visible" :secret="selectedSecret" @input="onInput('azure')"></azure-dialog>
    <gcp-dialog v-model="dialogState.gcp.visible" :secret="selectedSecret" @input="onInput('gcp')"></gcp-dialog>
    <openstack-dialog v-model="dialogState.openstack.visible" :secret="selectedSecret" @input="onInput('openstack')"></openstack-dialog>
    <alicloud-dialog v-model="dialogState.alicloud.visible" :secret="selectedSecret" @input="onInput('alicloud')"></alicloud-dialog>
    <metal-dialog v-model="dialogState.metal.visible" :secret="selectedSecret" @input="onInput('metal')"></metal-dialog>
    <vsphere-dialog v-model="dialogState.vsphere.visible" :secret="selectedSecret" @input="onInput('vsphere')"></vsphere-dialog>
  </div>
</template>

<script>
import GcpDialog from '@/components/dialogs/SecretDialogGcp'
import AwsDialog from '@/components/dialogs/SecretDialogAws'
import AzureDialog from '@/components/dialogs/SecretDialogAzure'
import OpenstackDialog from '@/components/dialogs/SecretDialogOpenstack'
import AlicloudDialog from '@/components/dialogs/SecretDialogAlicloud'
import MetalDialog from '@/components/dialogs/SecretDialogMetal'
import VsphereDialog from '@/components/dialogs/SecretDialogVSphere'

export default {
  name: 'secret-dialog-wrapper',
  components: {
    GcpDialog,
    AzureDialog,
    AwsDialog,
    OpenstackDialog,
    AlicloudDialog,
    MetalDialog,
    VsphereDialog
  },
  props: {
    dialogState: {
      type: Object,
      required: true
    },
    selectedSecret: {
      type: Object
    }
  },
  methods: {
    onInput (infrastructureKind) {
      this.$emit('dialog-closed', infrastructureKind)
    }
  }
}
</script>
