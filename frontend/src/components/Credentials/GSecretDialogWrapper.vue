<!--
SPDX-FileCopyrightText: Copyright Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <component
    :is="resolvedComponent"
    v-if="visibleDialog"
    v-model="visibleDialogState"
    v-bind="{ credential: selectedDnsCredential, binding: selectedInfraBinding, providerType: visibleDialog, vendorType: visibleDialogVendorType }"
  >
    <template
      v-if="resolvedHelpComponent"
      #help
    >
      <component
        :is="resolvedHelpComponent"
        :provider-type="visibleDialog"
      />
    </template>
  </component>
</template>

<script>
import { defineAsyncComponent } from 'vue'

const OpenstackDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogOpenstack'))
const GenericDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogGeneric'))
const DeleteDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogDelete'))
const MigrationDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogMigration'))
const AlicloudHelp = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogHelpAlicloud'))
const AwsHelp = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogHelpAws'))

export default {
  props: {
    selectedDnsCredential: { type: Object, required: false },
    selectedInfraBinding: { type: Object, required: false },
    visibleDialog: { type: String, required: false },
    visibleDialogVendorType: { type: String, required: false },
  },
  emits: ['dialog-closed'],
  data () {
    return { visibleDialogState: false }
  },
  computed: {
    resolvedComponent () {
      switch (this.visibleDialog) {
        // Custom Dialogs for specific provider types
        case 'openstack': return OpenstackDialog
        case 'openstack-designate': return OpenstackDialog

        // Generic Dialogs
        case 'delete': return DeleteDialog
        case 'migrate-secret-binding': return MigrationDialog

        default: return GenericDialog
      }
    },
    resolvedHelpComponent () {
      switch (this.visibleDialog) {
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
