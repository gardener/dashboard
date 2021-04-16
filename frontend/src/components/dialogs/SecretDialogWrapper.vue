<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div>
    <aws-dialog v-if="dialogState.aws" v-model="dialogState.aws.visible" :secret="selectedSecret" vendor="aws" @input="onInput('aws')"></aws-dialog>
    <azure-dialog v-if="dialogState.azure" v-model="dialogState.azure.visible" :secret="selectedSecret" vendor="azure" @input="onInput('azure')"></azure-dialog>
    <gcp-dialog v-if="dialogState.gcp" v-model="dialogState.gcp.visible" :secret="selectedSecret" vendor="gcp" @input="onInput('gcp')"></gcp-dialog>
    <openstack-dialog v-if="dialogState.openstack" v-model="dialogState.openstack.visible" :secret="selectedSecret" vendor="openstack" @input="onInput('openstack')"></openstack-dialog>
    <alicloud-dialog v-if="dialogState.alicloud" v-model="dialogState.alicloud.visible" :secret="selectedSecret" vendor="alicloud" @input="onInput('alicloud')"></alicloud-dialog>
    <metal-dialog v-if="dialogState.metal" v-model="dialogState.metal.visible" :secret="selectedSecret" @input="onInput('metal')"></metal-dialog>
    <vsphere-dialog v-if="dialogState.vsphere" v-model="dialogState.vsphere.visible" :secret="selectedSecret" @input="onInput('vsphere')"></vsphere-dialog>

    <aws-dialog v-if="dialogState['aws-route53']" v-model="dialogState['aws-route53'].visible" :secret="selectedSecret" vendor="aws-route53" @input="onInput('aws-route53')"></aws-dialog>
    <azure-dialog v-if="dialogState['azure-dns']" v-model="dialogState['azure-dns'].visible" :secret="selectedSecret" vendor="azure-dns" @input="onInput('azure-dns')"></azure-dialog>
    <gcp-dialog v-if="dialogState['google-clouddns']" v-model="dialogState['google-clouddns'].visible" :secret="selectedSecret" vendor="google-clouddns" @input="onInput('google-clouddns')"></gcp-dialog>
    <openstack-dialog v-if="dialogState['openstack-designate']" v-model="dialogState['openstack-designate'].visible" :secret="selectedSecret" vendor="openstack-designate" @input="onInput('openstack-designate')"></openstack-dialog>
    <alicloud-dialog v-if="dialogState['alicloud-dns']" v-model="dialogState['alicloud-dns'].visible" :secret="selectedSecret" vendor="alicloud-dns" @input="onInput('alicloud-dns')"></alicloud-dialog>
    <cloudflare-dialog v-if="dialogState.cloudflare" v-model="dialogState.cloudflare.visible" :secret="selectedSecret" vendor="cloudflare" @input="onInput('cloudflare')"></cloudflare-dialog>
    <infoblox-dialog v-if="dialogState.infoblox" v-model="dialogState.infoblox.visible" :secret="selectedSecret" vendor="infoblox" @input="onInput('infoblox')"></infoblox-dialog>
    <netlify-dialog v-if="dialogState.netlify" v-model="dialogState.netlify.visible" :secret="selectedSecret" vendor="netlify" @input="onInput('netlify')"></netlify-dialog>
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
import CloudflareDialog from '@/components/dialogs/SecretDialogCloudflare'
import InfobloxDialog from '@/components/dialogs/SecretDialogInfoblox'
import NetlifyDialog from '@/components/dialogs/SecretDialogNetlify'

export default {
  name: 'secret-dialog-wrapper',
  components: {
    GcpDialog,
    AzureDialog,
    AwsDialog,
    OpenstackDialog,
    AlicloudDialog,
    MetalDialog,
    VsphereDialog,
    CloudflareDialog,
    InfobloxDialog,
    NetlifyDialog
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
