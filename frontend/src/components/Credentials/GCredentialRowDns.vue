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
        {{ binding.metadata.name }}
        <g-shared-credential-icon
          v-if="isSharedCredential"
          :namespace="credentialNamespace"
        />
        <g-orphaned-credential-icon
          v-if="isOrphanedCredential"
          :binding="binding"
        />
      </div>
    </td>
    <td v-if="selectedHeaders.kind">
      <g-credential-icon :binding="binding" />
    </td>
    <td v-if="selectedHeaders.dnsProvider">
      <g-vendor
        extended
        :provider-type="binding.provider.type"
      />
    </td>
    <td v-if="selectedHeaders.details">
      <g-credential-details-item-content
        class="py-1"
        :credential="credential"
        :shared="isSharedCredential"
        :provider-type="binding.provider.type"
      />
    </td>
    <td v-if="selectedHeaders.credentialUsageCount">
      <g-credential-used-by-label :used-by="credentialUsageCount" />
    </td>
    <td
      v-if="selectedHeaders.actions"
      class="text-action-button"
    >
      <g-credential-row-actions
        :binding="binding"
        @update="onUpdate"
        @delete="onDelete"
      />
    </td>
  </tr>
</template>

<script setup>
import {
  computed,
  toRef,
} from 'vue'

import GVendor from '@/components/GVendor'
import GCredentialDetailsItemContent from '@/components/Credentials/GCredentialDetailsItemContent'
import GCredentialRowActions from '@/components/Credentials/GCredentialRowActions'
import GCredentialIcon from '@/components/Credentials/GCredentialIcon'
import GCredentialUsedByLabel from '@/components/Credentials/GCredentialUsedByLabel'
import GSharedCredentialIcon from '@/components/Credentials/GSharedCredentialIcon.vue'
import GOrphanedCredentialIcon from '@/components/Credentials/GOrphanedCredentialIcon.vue'

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'

import { mapTableHeader } from '@/utils'

const props = defineProps({
  binding: {
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

const binding = toRef(props, 'binding')

const {
  isSharedCredential,
  credentialNamespace,
  credentialUsageCount,
  isOrphanedCredential,
  credential,
} = useCloudProviderBinding(binding)

const emit = defineEmits(['update', 'delete'])

const selectedHeaders = computed(() => mapTableHeader(props.headers, 'selected'))

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
