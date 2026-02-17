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

const OpenstackDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogOpenstack'))
const GenericDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogGeneric'))
const DeleteDialog = defineAsyncComponent(() => import('@/components/Credentials/GSecretDialogDelete'))

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
        // Custom Dialogs for specific provider types
        case 'openstack': return OpenstackDialog
        case 'openstack-designate': return OpenstackDialog

        // Generic Dialogs
        case 'delete': return DeleteDialog
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
