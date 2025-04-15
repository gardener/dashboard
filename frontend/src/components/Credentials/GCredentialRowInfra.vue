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
      <v-tooltip location="top">
        <template #activator="{ props }">
          <v-icon
            v-bind="props"
            size="small"
            class="mx-1"
          >
            {{ item.kind.icon }}
          </v-icon>
        </template>
        <span>{{ item.kind.tooltip }}</span>
      </v-tooltip>
    </td>
    <td v-if="selectedHeaders.credential">
      <span v-if="!item.hasOwnCredential">{{ item.credentialNamespace }}: </span>{{ item.credentialName }}
    </td>
    <td v-if="selectedHeaders.infrastructure">
      <g-vendor
        extended
        :provider-type="item.providerType"
      />
    </td>
    <td v-if="selectedHeaders.details">
      <g-secret-details-item-content
        infra
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
      <g-credential-row-actions
        :item="item"
        @update="onUpdate"
        @delete="onDelete"
      />
    </td>
  </tr>
</template>

<script>

import GVendor from '@/components/GVendor'
import GSecretDetailsItemContent from '@/components/Credentials/GSecretDetailsItemContent'
import GCredentialRowActions from '@/components/Credentials/GCredentialRowActions'

import { mapTableHeader } from '@/utils'

export default {
  components: {
    GVendor,
    GSecretDetailsItemContent,
    GCredentialRowActions,
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
    height: 58px;

    &.highlighted {
      background-color: $highlighted-color;
    }
  }

</style>
