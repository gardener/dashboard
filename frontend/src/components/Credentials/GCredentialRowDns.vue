<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <tr
    class="credential-row"
    :class="{ 'highlighted': item.highlighted }"
  >
    <td v-if="selectedHeaders.name">
      <div class="d-flex">
        {{ item.name }}
        <v-tooltip
          v-if="!item.hasOwnCredential"
          location="top"
        >
          <template #activator="{ props }">
            <v-icon
              v-bind="props"
              size="small"
              class="mx-1"
            >
              mdi-account-arrow-left
            </v-icon>
          </template>
          <span>Credential shared by {{ item.credentialNamespace }}</span>
        </v-tooltip>
      </div>
    </td>
    <td v-if="selectedHeaders.kind">
      {{ item.kind }}
    </td>
    <td v-if="selectedHeaders.credential">
      <span v-if="!item.hasOwnCredential">{{ item.credentialNamespace }}: </span>{{ item.hasOwnCredentialName }}
    </td>
    <td v-if="selectedHeaders.dnsProvider">
      <g-vendor
        extended
        :provider-type="item.providerType"
      />
    </td>
    <td v-if="selectedHeaders.details">
      <g-secret-details-item-content
        dns
        class="py-1"
        :secret="item.binding._secret"
        :provider-type="item.providerType"
      />
    </td>
    <td v-if="selectedHeaders.relatedShootCount">
      <div
        class="d-flex"
        :class="{'font-weight-light text-disabled' : !item.relatedShootCount}"
      >
        {{ item.relatedShootCountLabel }}
      </div>
    </td>
    <td
      v-if="selectedHeaders.actions"
      class="text-action-button"
    >
      <div class="d-flex justify-end">
        <g-action-button
          v-if="canPatchCredentials"
          icon="mdi-pencil"
          :disabled="!item.hasOwnCredential || !item.hasOwnSecret || item.isMarkedForDeletion"
          @click="onUpdate"
        >
          <template #tooltip>
            <span v-if="!item.hasOwnCredential">You can only edit secrets that are owned by you</span>
            <span v-else-if="!item.hasOwnSecret">The dashboard only supports editing credentials of type secret</span>
            <span v-else-if="item.isMarkedForDeletion">Secret is marked for deletion</span>
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
            <span v-if="!item.hasOwnCredential">You can only delete secrets that are owned by you</span>
            <span v-else-if="!item.hasOwnSecret">The dashboard only supports editing credentials of type secret</span>
            <span v-else-if="item.relatedShootCount > 0">You can only delete secrets that are currently unused</span>
            <span v-else-if="item.isMarkedForDeletion">Secret is already marked for deletion</span>
            <span v-else>Delete Secret</span>
          </template>
        </g-action-button>
      </div>
    </td>
  </tr>
</template>

<script>
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store/authz'

import GVendor from '@/components/GVendor'
import GSecretDetailsItemContent from '@/components/Credentials/GSecretDetailsItemContent'
import GActionButton from '@/components/GActionButton.vue'

import { mapTableHeader } from '@/utils'

export default {
  components: {
    GVendor,
    GSecretDetailsItemContent,
    GActionButton,
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
    headers: {
      type: Array,
      required: true,
    },
  },
  emits: [
    'update',
    'delete',
  ],
  computed: {
    ...mapState(useAuthzStore, ['canPatchCredentials', 'canDeleteCredentials']),
    selectedHeaders () {
      return mapTableHeader(this.headers, 'selected')
    },
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

<style lang="scss" scoped>
  $highlighted-color: rgb(var(--v-theme-accent));

  .credential-row {
    transition: background-color 0.5s ease;

    &.highlighted {
      background-color: $highlighted-color;
    }
  }
</style>
