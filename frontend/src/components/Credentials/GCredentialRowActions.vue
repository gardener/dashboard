<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex justify-end">
    <g-action-button
      v-if="canPatchCredentials"
      icon="mdi-pencil"
      :disabled="item.isMarkedForDeletion || !item.hasOwnCredential || !item.hasOwnSecret"
      @click="onUpdate"
    >
      <template #tooltip>
        <span v-if="item.isMarkedForDeletion">Secret is marked for deletion</span>
        <span v-else-if="!item.hasOwnCredential">You can only edit Secrets that are owned by you</span>
        <span v-else-if="item.hasOwnWorkloadIdentity">The dashboard doesn't support editing credentials of type WorkloadIdentity</span>
        <span v-else-if="!item.hasOwnSecret">The Secret for this Binding does not exist. Please cleanup manually</span>
        <span v-else>Edit Secret</span>
      </template>
    </g-action-button>
    <g-action-button
      v-if="canDeleteCredentials"
      icon="mdi-delete"
      :disabled="item.relatedShootCount > 0 || !item.hasOwnCredential || !item.hasOwnSecret || item.isMarkedForDeletion"
      @click="onDelete"
    >
      <template #tooltip>
        <span v-if="item.isMarkedForDeletion">Secret is already marked for deletion</span>
        <span v-else-if="!item.hasOwnCredential">You can only delete Secrets that are owned by you</span>
        <span v-else-if="item.hasOwnWorkloadIdentity">The dashboard doesn't support deleting credentials of type WorkloadIdentity</span>
        <span v-else-if="!item.hasOwnSecret">The Secret for this Binding does not exist. Please cleanup manually</span>
        <span v-else-if="item.relatedShootCount > 0">You can only delete Secrets that are currently unused</span>
        <span v-else>Delete Secret</span>
      </template>
    </g-action-button>
  </div>
</template>

<script>
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store/authz'

import GActionButton from '@/components/GActionButton.vue'

export default {
  components: {
    GActionButton,
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
  emits: [
    'update',
    'delete',
  ],
  computed: {
    ...mapState(useAuthzStore, [
      'canPatchCredentials',
      'canDeleteCredentials',
    ]),
  },
  methods: {
    onUpdate () {
      this.$emit('update', this.item.binding)
    },
    onDelete () {
      this.$emit('delete', this.item.binding)
    },
  },
}
</script>
