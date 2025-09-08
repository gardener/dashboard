<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex justify-end">
    <g-action-button
      v-if="canPatchCredentials"
      icon="mdi-pencil"
      :disabled="isSharedCredential || hasOwnWorkloadIdentity"
      @click="onUpdate"
    >
      <template #tooltip>
        <span v-if="isSharedCredential">You can only edit Secrets that are owned by you</span>
        <span v-else-if="hasOwnWorkloadIdentity">The dashboard doesn't support editing credentials of type WorkloadIdentity</span>
        <span v-else>Edit Secret</span>
      </template>
    </g-action-button>
    <g-action-button
      v-if="canDeleteCredentials"
      icon="mdi-delete"
      :disabled="credentialUsageCount > 0 || isSharedCredential || hasOwnWorkloadIdentity || isMarkedForDeletion"
      @click="onDelete"
    >
      <template #tooltip>
        <span v-if="credentialUsageCount > 0">You can only delete Secrets that are currently unused</span>
        <span v-else-if="isSharedCredential">You can only delete Secrets that are owned by you</span>
        <span v-else-if="hasOwnWorkloadIdentity">The dashboard doesn't support deleting credentials of type WorkloadIdentity</span>
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

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'
import { useCredential } from '@/composables/credential/useCloudProviderCredential'
import {
  isSecretBinding,
  isCredentialsBinding,
} from '@/composables/credential/helper'

const props = defineProps({
  credentialEntity: {
    type: Object,
    required: true,
  },
})
const credential = toRef(props, 'credentialEntity')

const emit = defineEmits(['update', 'delete'])

const authzStore = useAuthzStore()
const { canPatchCredentials, canDeleteCredentials } = storeToRefs(authzStore)

let composable
if (isSecretBinding(credential.value) || isCredentialsBinding(credential.value)) {
  composable = useCloudProviderBinding(credential)
} else {
  composable = useCredential(credential)
}

const {
  hasOwnWorkloadIdentity,
  credentialUsageCount,
  isMarkedForDeletion,
  isSharedCredential,
} = composable

function onUpdate () {
  emit('update', credential.value)
}

function onDelete () {
  emit('delete', credential.value)
}

</script>
