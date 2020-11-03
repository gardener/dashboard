<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div>
    <aws-dialog v-model="dialogState.aws.visible" :secret="selectedSecret" @input="onInput('aws')"></aws-dialog>
    <aws-help-dialog v-model="dialogState.aws.help" @input="onInput('aws')"></aws-help-dialog>

    <azure-dialog v-model="dialogState.azure.visible" :secret="selectedSecret" @input="onInput('azure')"></azure-dialog>
    <azure-help-dialog v-model="dialogState.azure.help" @input="onInput('azure')"></azure-help-dialog>

    <gcp-dialog v-model="dialogState.gcp.visible" :secret="selectedSecret" @input="onInput('gcp')"></gcp-dialog>
    <gcp-help-dialog v-model="dialogState.gcp.help" @input="onInput('gcp')"></gcp-help-dialog>

    <openstack-dialog v-model="dialogState.openstack.visible" :secret="selectedSecret" @input="onInput('openstack')"></openstack-dialog>
    <openstack-help-dialog v-model="dialogState.openstack.help" @input="onInput('openstack')"></openstack-help-dialog>

    <alicloud-dialog v-model="dialogState.alicloud.visible" :secret="selectedSecret" @input="onInput('alicloud')"></alicloud-dialog>
    <alicloud-help-dialog v-model="dialogState.alicloud.help" @input="onInput('alicloud')"></alicloud-help-dialog>

    <metal-dialog v-model="dialogState.metal.visible" :secret="selectedSecret" @input="onInput('metal')"></metal-dialog>
    <metal-help-dialog v-model="dialogState.metal.help" @input="onInput('metal')"></metal-help-dialog>

    <vsphere-dialog v-model="dialogState.vsphere.visible" :secret="selectedSecret" @input="onInput('vsphere')"></vsphere-dialog>
    <vsphere-help-dialog v-model="dialogState.vsphere.help" @input="onInput('vsphere')"></vsphere-help-dialog>
  </div>
</template>

<script>
import GcpDialog from '@/components/dialogs/SecretDialogGcp'
import GcpHelpDialog from '@/components/dialogs/SecretDialogGcpHelp'
import AwsHelpDialog from '@/components/dialogs/SecretDialogAwsHelp'
import AwsDialog from '@/components/dialogs/SecretDialogAws'
import AzureDialog from '@/components/dialogs/SecretDialogAzure'
import AzureHelpDialog from '@/components/dialogs/SecretDialogAzureHelp'
import OpenstackDialog from '@/components/dialogs/SecretDialogOpenstack'
import OpenstackHelpDialog from '@/components/dialogs/SecretDialogOpenstackHelp'
import AlicloudDialog from '@/components/dialogs/SecretDialogAlicloud'
import AlicloudHelpDialog from '@/components/dialogs/SecretDialogAlicloudHelp'
import MetalDialog from '@/components/dialogs/SecretDialogMetal'
import MetalHelpDialog from '@/components/dialogs/SecretDialogMetalHelp'
import VsphereDialog from '@/components/dialogs/SecretDialogVSphere'
import VsphereHelpDialog from '@/components/dialogs/SecretDialogVSphereHelp'

export default {
  name: 'secret-dialog-wrapper',
  components: {
    GcpDialog,
    GcpHelpDialog,
    AzureHelpDialog,
    AzureDialog,
    AwsDialog,
    AwsHelpDialog,
    OpenstackDialog,
    OpenstackHelpDialog,
    AlicloudDialog,
    AlicloudHelpDialog,
    MetalDialog,
    MetalHelpDialog,
    VsphereDialog,
    VsphereHelpDialog
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
      this.$emit('dialogClosed', infrastructureKind)
    }
  }
}
</script>
