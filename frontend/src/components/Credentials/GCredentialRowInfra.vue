<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <tr
    class="credential-row"
    :class="{ 'highlighted': isHighlighted }"
  >
    <td v-if="selectedHeaders.name">
      <div class="d-flex">
        {{ binding.metadata.name }}
        <g-shared-credential-icon
          v-if="isSharedCredential"
          :namespace="credentialNamespace"
        />
        <g-orphaned-credential-icon v-if="isOrphanedCredential" />
      </div>
    </td>
    <td v-if="selectedHeaders.kind">
      <g-credential-icon :binding="binding" />
    </td>
    <td v-if="selectedHeaders.infrastructure">
      <g-vendor
        extended
        :provider-type="binding.provider.type"
      />
    </td>
    <td v-if="selectedHeaders.details">
      <g-secret-details-item-content
        v-if="hasOwnSecret"
        class="py-1"
        :secret="credential"
        :provider-type="binding.provider.type"
      />
    </td>
    <td v-if="selectedHeaders.credentialUseCount">
      <g-credential-used-by-label :used-by="credentialUseCount" />
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
import GSecretDetailsItemContent from '@/components/Credentials/GSecretDetailsItemContent'
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
  isHighlighted: {
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
  credentialUseCount,
  isOrphanedCredential,
  credential,
  hasOwnSecret,
} = useCloudProviderBinding(binding)

const emit = defineEmits(['update', 'delete'])

const selectedHeaders = computed(() =>
  mapTableHeader(props.headers, 'selected'),
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
