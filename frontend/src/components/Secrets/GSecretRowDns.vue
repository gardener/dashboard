<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <tr :class="{ 'highlighted': item.highlighted }">
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
        :provider-type="item.providerType"
      />
    </td>
    <td v-if="selectedHeaders.details">
      <g-secret-details-item-content
        dns
        class="py-1"
        :secret="item.secretBinding._secret"
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
          v-if="canPatchSecrets"
          icon="mdi-pencil"
          :disabled="!item.isOwnSecret"
          @click="onUpdate"
        >
          <template #tooltip>
            <span v-if="!item.isOwnSecret">You can only edit secrets that are owned by you</span>
            <span v-else>Edit Secret</span>
          </template>
        </g-action-button>
        <g-action-button
          v-if="canDeleteSecrets"
          icon="mdi-delete"
          :disabled="item.relatedShootCount > 0 || !item.isOwnSecret"
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
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store/authz'

import GVendor from '@/components/GVendor'
import GSecretDetailsItemContent from '@/components/Secrets/GSecretDetailsItemContent'
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
    ...mapState(useAuthzStore, ['canPatchSecrets', 'canDeleteSecrets']),
    selectedHeaders () {
      return mapTableHeader(this.headers, 'selected')
    },
  },
  methods: {
    onUpdate () {
      this.$emit('update', this.item.secretBinding)
    },
    onDelete () {
      this.$emit('delete', this.item.secretBinding)
    },
  },
}
</script>

<style lang="scss" scoped>
  $highlighted-color: rgb(var(--v-theme-accent));
  $highlighted-border-color: rgb(var(--v-theme-accent-darken-2));

  .highlighted {
    background-color: $highlighted-color;
    border-color: $highlighted-border-color;
  }
</style>
