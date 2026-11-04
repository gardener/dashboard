<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <component
    :is="resolvedComponent"
    v-if="dialogState"
    v-model="visibleDialogState"
    :credential="dialogState.credential"
    :binding="dialogState.binding"
    :provider-type="dialogState.providerType"
    :vendor-type="dialogState.vendorType"
  >
    <template
      v-if="resolvedHelpComponent"
      #help
    >
      <component
        :is="resolvedHelpComponent"
        :provider-type="dialogState.providerType"
      />
    </template>
  </component>
</template>

<script>
import { defineAsyncComponent } from 'vue'

const OpenstackDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogOpenstack'))
const GdchDnsDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogGdchDns'))
const GenericDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogGeneric'))
const DeleteDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogDelete'))
const MigrationDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogMigration'))
const AlicloudHelp = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogHelpAlicloud'))
const AwsHelp = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogHelpAws'))

export default {
  props: {
    dialogState: { type: Object, required: false },
  },
  emits: ['dialog-closed'],
  data () {
    return { visibleDialogState: false }
  },
  computed: {
    resolvedComponent () {
      const { operation, providerType } = this.dialogState ?? {}

      if (operation === 'delete') {
        return DeleteDialog
      }
      if (operation === 'migrate-secret-binding') {
        return MigrationDialog
      }

      switch (providerType) {
        // Custom Dialogs for specific provider types
        case 'openstack': return OpenstackDialog
        case 'openstack-designate': return OpenstackDialog
        case 'gdch-dns': return GdchDnsDialog

        // Generic Dialogs
        default: return GenericDialog
      }
    },
    resolvedHelpComponent () {
      const { operation, credentialKind, providerType } = this.dialogState ?? {}
      if (credentialKind !== 'Secret' || !['create', 'edit'].includes(operation)) {
        return undefined
      }

      switch (providerType) {
        case 'alicloud':
          return AlicloudHelp
        case 'aws':
        case 'aws-route53':
          return AwsHelp
        default:
          return undefined
      }
    },
  },
  watch: {
    dialogState: {
      handler (dialogState) {
        this.visibleDialogState = Boolean(dialogState)
      },
      immediate: true,
    },
    visibleDialogState (visibleDialogState) {
      if (!visibleDialogState) {
        this.$emit('dialog-closed')
      }
    },
  },
}
</script>
