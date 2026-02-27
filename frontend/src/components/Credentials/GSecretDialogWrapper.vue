<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <component
    :is="resolvedComponent"
    v-if="visibleDialog"
    v-model="visibleDialogState"
    v-bind="{ credential: selectedDnsCredential, binding: selectedInfraBinding, providerType: visibleDialog }"
  />
</template>

<script>
import { defineAsyncComponent } from 'vue'

const GcpDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogGcp'))
const AwsDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogAws'))
const AzureDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogAzure'))
const OpenstackDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogOpenstack'))
const AlicloudDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogAlicloud'))
const MetalDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogMetal'))
const VsphereDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogVSphere'))
const CloudflareDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogCloudflare'))
const InfobloxDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogInfoblox'))
const NetlifyDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogNetlify'))
const DDnsDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogDDns'))
const HcloudDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogHCloud'))
const PowerdnsDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogPowerdns'))
const GenericDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogGeneric'))
const DeleteDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogDelete'))
const MigrationDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogMigration'))

export default {
  props: {
    selectedDnsCredential: { type: Object, required: false },
    selectedInfraBinding: { type: Object, required: false },
    visibleDialog: { type: String, required: false },
  },
  emits: ['dialog-closed'],
  data () {
    return { visibleDialogState: false }
  },
  computed: {
    resolvedComponent () {
      switch (this.visibleDialog) {
        // Infra Secret Dialogs
        case 'aws': return AwsDialog
        case 'azure': return AzureDialog
        case 'gcp': return GcpDialog
        case 'openstack': return OpenstackDialog
        case 'alicloud': return AlicloudDialog
        case 'metal': return MetalDialog
        case 'vsphere': return VsphereDialog
        case 'hcloud': return HcloudDialog

        // DNS Secret Dialogs
        case 'aws-route53': return AwsDialog
        case 'azure-dns': return AzureDialog
        case 'azure-private-dns': return AzureDialog
        case 'google-clouddns': return GcpDialog
        case 'openstack-designate': return OpenstackDialog
        case 'alicloud-dns': return AlicloudDialog
        case 'cloudflare-dns': return CloudflareDialog
        case 'infoblox-dns': return InfobloxDialog
        case 'netlify-dns': return NetlifyDialog
        case 'rfc2136': return DDnsDialog
        case 'cloudflare': return CloudflareDialog
        case 'powerdns': return PowerdnsDialog

        // Generic Dialogs
        case 'delete': return DeleteDialog
        case 'migrate-secret-binding': return MigrationDialog

        default: return GenericDialog
      }
    },
  },
  watch: {
    visibleDialog (visibleDialog) {
      if (visibleDialog) {
        this.visibleDialogState = true
      }
    },
    visibleDialogState (visibleDialogState) {
      if (!visibleDialogState) {
        this.$emit('dialog-closed')
      }
    },
  },
}
</script>
