<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div>
    <aws-dialog v-if="visibleDialog==='aws'" v-model="visibleDialogState" :secret="selectedSecret" vendor="aws" @input="onInput('aws')"></aws-dialog>
    <azure-dialog v-if="visibleDialog==='azure'" v-model="visibleDialogState" :secret="selectedSecret" vendor="azure" @input="onInput('azure')"></azure-dialog>
    <gcp-dialog v-if="visibleDialog==='gcp'" v-model="visibleDialogState" :secret="selectedSecret" vendor="gcp" @input="onInput('gcp')"></gcp-dialog>
    <openstack-dialog v-if="visibleDialog==='openstack'" v-model="visibleDialogState" :secret="selectedSecret" vendor="openstack" @input="onInput('openstack')"></openstack-dialog>
    <alicloud-dialog v-if="visibleDialog==='alicloud'" v-model="visibleDialogState" :secret="selectedSecret" vendor="alicloud" @input="onInput('alicloud')"></alicloud-dialog>
    <metal-dialog v-if="visibleDialog==='metal'" v-model="visibleDialogState" :secret="selectedSecret" @input="onInput('metal')"></metal-dialog>
    <vsphere-dialog v-if="visibleDialog==='vsphere'" v-model="visibleDialogState" :secret="selectedSecret" @input="onInput('vsphere')"></vsphere-dialog>

    <aws-dialog v-if="visibleDialog==='aws-route53'" v-model="visibleDialogState" :secret="selectedSecret" vendor="aws-route53" @input="onInput('aws-route53')"></aws-dialog>
    <azure-dialog v-if="visibleDialog==='azure-dns'" v-model="visibleDialogState" :secret="selectedSecret" vendor="azure-dns" @input="onInput('azure-dns')"></azure-dialog>
    <gcp-dialog v-if="visibleDialog==='google-vlouddns'" v-model="visibleDialogState" :secret="selectedSecret" vendor="google-clouddns" @input="onInput('google-clouddns')"></gcp-dialog>
    <openstack-dialog v-if="visibleDialog==='openstack-designate'" v-model="visibleDialogState" :secret="selectedSecret" vendor="openstack-designate" @input="onInput('openstack-designate')"></openstack-dialog>
    <alicloud-dialog v-if="visibleDialog==='alicloud-dns'" v-model="visibleDialogState" :secret="selectedSecret" vendor="alicloud-dns" @input="onInput('alicloud-dns')"></alicloud-dialog>
    <cloudflare-dialog v-if="visibleDialog==='cloudflare'" v-model="visibleDialogState" :secret="selectedSecret" vendor="cloudflare" @input="onInput('cloudflare')"></cloudflare-dialog>
    <infoblox-dialog v-if="visibleDialog==='infoblox'" v-model="visibleDialogState"
     :secret="selectedSecret" vendor="infoblox" @input="onInput('infoblox')"></infoblox-dialog>
    <netlify-dialog v-if="visibleDialog==='netlify'" v-model="visibleDialogState" :secret="selectedSecret" vendor="netlify" @input="onInput('netlify')"></netlify-dialog>
    <delete-dialog v-if="visibleDialog==='delete'" v-model="visibleDialogState" :secret="selectedSecret"></delete-dialog>
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
import DeleteDialog from '@/components/dialogs/SecretDialogDelete'

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
    NetlifyDialog,
    DeleteDialog
  },
  data () {
    return {
      visibleDialogState: false
    }
  },
  props: {
    selectedSecret: {
      type: Object,
      required: false
    },
    visibleDialog: {
      type: String,
      required: false
    }
  },
  methods: {
    onInput (infrastructureKind) {
      this.$emit('dialog-closed', infrastructureKind)
    }
  },
  watch: {
    visibleDialog: function (visibleDialog) {
      if (visibleDialog) {
        this.visibleDialogState = true
      }
    },
    visibleDialogState: function (visibleDialogState) {
      if (!visibleDialogState) {
        this.$emit('dialog-closed')
      }
    }
  }
}
</script>
