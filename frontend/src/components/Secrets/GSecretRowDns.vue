<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <tr>
    <td v-if="selectedHeaders.name">
      <div class="d-flex">
        {{ item.name }}
        <v-tooltip
          v-if="!item.isOwnSecret"
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
          <span>Secret shared by {{ item.secretNamespace }}</span>
        </v-tooltip>
      </div>
    </td>
    <td v-if="selectedHeaders.secret">
      <span v-if="!item.isOwnSecret">{{ item.secretNamespace }}: </span>{{ item.secretName }}
    </td>
    <td v-if="selectedHeaders.dnsProvider">
      <g-vendor
        extended
        :cloud-provider-kind="item.dnsProvider"
      />
    </td>
    <td v-if="selectedHeaders.details">
      <g-secret-details-item-content
        dns
        class="py-1"
        :secret="item.secret"
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
          v-if="canPatchSecrets"
          icon="mdi-pencil"
          :disabled="!item.isOwnSecret || !item.isSupportedCloudProvider"
          @click="onUpdate"
        >
          <template #tooltip>
            <span v-if="!item.isOwnSecret">You can only edit secrets that are owned by you</span>
            <span v-else-if="!item.isSupportedCloudProvider">This DNS Provider is currently not supported by the dashboard</span>
            <span v-else>Edit Secret</span>
          </template>
        </g-action-button>
        <g-action-button
          v-if="canDeleteSecrets"
          icon="mdi-delete"
          :disabled="!item.isOwnSecret || !item.isSupportedCloudProvider"
          @click="onDelete"
        >
          <template #tooltip>
            <span v-if="!item.isOwnSecret">You can only delete secrets that are owned by you</span>
            <span v-else-if="item.relatedShootCount > 0">You can only delete secrets that are currently unused</span>
            <span v-else>Delete Secret</span>
          </template>
        </g-action-button>
      </div>
    </td>
  </tr>
</template>

<script>
import { mapGetters } from 'pinia'

import { mapTableHeader } from '@/utils'
import GVendor from '@/components/GVendor'
import GSecretDetailsItemContent from '@/components/Secrets/GSecretDetailsItemContent'
import GActionButton from '@/components/GActionButton.vue'
import { useAuthzStore } from '@/store'

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
    ...mapGetters(useAuthzStore, ['canPatchSecrets', 'canDeleteSecrets']),
    selectedHeaders () {
      return mapTableHeader(this.headers, 'selected')
    },
  },
  methods: {
    onUpdate () {
      this.$emit('update', this.item.secret)
    },
    onDelete () {
      this.$emit('delete', this.item.secret)
    },
  },
}
</script>
