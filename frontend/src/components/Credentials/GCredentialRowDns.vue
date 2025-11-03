<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <tr
    class="credential-row"
    :class="{ 'highlighted': highlighted }"
  >
    <td v-if="selectedHeaders.name">
      {{ item.credential.metadata.name }}
    </td>
    <td v-if="selectedHeaders.kind">
      <g-credential-icon :credential="item.credential" />
    </td>
    <td v-if="selectedHeaders.dnsProvider">
      <g-vendor
        extended
        :provider-type="item.providerType"
      />
    </td>
    <td v-if="selectedHeaders.details">
      <g-credential-details-item-content
        class="py-1"
        :credential="item.credential"
        :shared="item.isSharedBinding"
        :provider-type="item.providerType"
      />
    </td>
    <td v-if="selectedHeaders.credentialUsageCount">
      <g-credential-used-by-label :used-by="item.credentialUsageCount" />
    </td>
    <td
      v-if="selectedHeaders.actions"
      class="text-action-button"
    >
      <g-credential-row-actions
        :credential="item.credential"
        @update="onUpdate"
        @delete="onDelete"
      />
    </td>
  </tr>
</template>

<script setup>
import {
  computed,
  toRefs,
} from 'vue'

import GVendor from '@/components/GVendor'
import GCredentialDetailsItemContent from '@/components/Credentials/GCredentialDetailsItemContent'
import GCredentialRowActions from '@/components/Credentials/GCredentialRowActions'
import GCredentialIcon from '@/components/Credentials/GCredentialIcon'
import GCredentialUsedByLabel from '@/components/Credentials/GCredentialUsedByLabel'

import { mapTableHeader } from '@/utils'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  highlighted: {
    type: Boolean,
    default: false,
  },
  headers: {
    type: Array,
    required: true,
  },
})

const {
  item,
  highlighted,
  headers,
} = toRefs(props)

const emit = defineEmits(['updateDnsCredential', 'deleteDnsCredential'])

const selectedHeaders = computed(() => mapTableHeader(headers.value, 'selected'))

function onUpdate (value) {
  emit('updateDnsCredential', value)
}

function onDelete (value) {
  emit('deleteDnsCredential', value)
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
