<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex justify-end">
    <g-action-button
      v-if="canPatchCredentials"
      icon="mdi-pencil"
      :disabled="item.isSharedCredential || item.hasOwnWorkloadIdentity"
      @click="onUpdate"
    >
      <template #tooltip>
        <span v-if="item.isSharedCredential">You can only edit Secrets that are owned by you</span>
        <span v-else-if="item.hasOwnWorkloadIdentity">The dashboard doesn't support editing credentials of type WorkloadIdentity</span>
        <span v-else>Edit Secret</span>
      </template>
    </g-action-button>
    <g-action-button
      v-if="canDeleteCredentials"
      icon="mdi-delete"
      :disabled="item.relatedShootCount > 0 || item.isSharedCredential || item.hasOwnWorkloadIdentity || item.isMarkedForDeletion"
      @click="onDelete"
    >
      <template #tooltip>
        <span v-if="item.relatedShootCount > 0">You can only delete Secrets that are currently unused</span>
        <span v-else-if="item.isSharedCredential">You can only delete Secrets that are owned by you</span>
        <span v-else-if="item.hasOwnWorkloadIdentity">The dashboard doesn't support deleting credentials of type WorkloadIdentity</span>
        <span v-else-if="item.isMarkedForDeletion">Secret is already marked for deletion</span>
        <span v-else>Delete Secret</span>
      </template>
    </g-action-button>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'

import { useAuthzStore } from '@/store/authz'

import GActionButton from '@/components/GActionButton.vue'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update', 'delete'])

const authzStore = useAuthzStore()
const { canPatchCredentials, canDeleteCredentials } = storeToRefs(authzStore)

function onUpdate () {
  emit('update', props.item.binding)
}

function onDelete () {
  emit('delete', props.item.binding)
}
</script>
