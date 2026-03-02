<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex justify-end">
    <g-action-button
      v-if="canPatchCredentials"
      icon="mdi-pencil"
      :disabled="hasOwnWorkloadIdentity"
      @click="onUpdate"
    >
      <template #tooltip>
        <span v-if="hasOwnWorkloadIdentity">The dashboard doesn't support editing credentials of type WorkloadIdentity</span>
        <span v-else>Edit Secret</span>
      </template>
    </g-action-button>
    <g-action-button
      v-if="canDeleteCredentials"
      icon="mdi-delete"
      :disabled="credentialUsageCount > 0 || hasOwnWorkloadIdentity || isMarkedForDeletion"
      @click="onDelete"
    >
      <template #tooltip>
        <span v-if="hasOwnWorkloadIdentity">The dashboard doesn't support deleting credentials of type WorkloadIdentity</span>
        <span v-else-if="credentialUsageCount > 0">You can only delete Secrets that are currently unused</span>
        <span v-else-if="isMarkedForDeletion">Secret is already marked for deletion</span>
        <span v-else>Delete Secret</span>
      </template>
    </g-action-button>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { toRef } from 'vue'

import { useAuthzStore } from '@/store/authz'

import GActionButton from '@/components/GActionButton.vue'

import { useCloudProviderCredential } from '@/composables/credential/useCloudProviderCredential'

const props = defineProps({
  credential: Object,
})
const credential = toRef(props, 'credential')

const emit = defineEmits(['update', 'delete'])

const authzStore = useAuthzStore()
const { canPatchCredentials, canDeleteCredentials } = storeToRefs(authzStore)

const {
  hasOwnWorkloadIdentity,
  credentialUsageCount,
  isMarkedForDeletion,
} = useCloudProviderCredential(credential)

function onUpdate () {
  emit('update', credential.value)
}

function onDelete () {
  emit('delete', credential.value)
}

</script>
