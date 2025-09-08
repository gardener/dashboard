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
      <div class="d-flex">
        {{ item.binding.metadata.name }}
        <g-shared-credential-icon
          v-if="item.isSharedCredential"
          :namespace="item.credentialNamespace"
        />
        <g-orphaned-credential-icon
          v-if="item.isOrphanedBinding"
          :credential-entity="item.binding"
        />
      </div>
    </td>
    <td v-if="selectedHeaders.kind">
      <g-credential-icon :credential-entity="item.binding" />
    </td>
    <td v-if="selectedHeaders.infrastructure">
      <g-vendor
        extended
        :provider-type="getProviderType(item.binding)"
      />
    </td>
    <td v-if="selectedHeaders.details">
      <g-credential-details-item-content
        class="py-1"
        :credential-entity="item.credential"
        :shared="item.isSharedCredential"
        :provider-type="getProviderType(item.binding)"
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
        :credential-entity="item.binding"
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
import GSharedCredentialIcon from '@/components/Credentials/GSharedCredentialIcon.vue'
import GOrphanedCredentialIcon from '@/components/Credentials/GOrphanedCredentialIcon.vue'

import { getProviderType } from '@/composables/credential/helper'

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

const emit = defineEmits(['update', 'delete'])

const selectedHeaders = computed(() =>
  mapTableHeader(headers.value, 'selected'),
)

function onUpdate (value) {
  emit('update', value)
}

function onDelete (value) {
  emit('delete', value)
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
