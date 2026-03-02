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
          v-if="item.isSharedBinding"
          :namespace="item.credentialNamespace"
        />
        <g-orphaned-binding-icon
          v-if="item.isOrphanedBinding"
          :binding="item.binding"
        />
      </div>
    </td>
    <td v-if="selectedHeaders.kind">
      <g-binding-icon :binding="item.binding" />
    </td>
    <td v-if="selectedHeaders.infrastructure">
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
      <g-binding-row-actions
        :binding="item.binding"
        @update="onUpdate"
        @delete="onDelete"
        @migrate-secret-binding="onMigrateSecretBinding"
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
import GBindingRowActions from '@/components/Credentials/GBindingRowActions'
import GBindingIcon from '@/components/Credentials/GBindingIcon'
import GCredentialUsedByLabel from '@/components/Credentials/GCredentialUsedByLabel'
import GSharedCredentialIcon from '@/components/Credentials/GSharedCredentialIcon.vue'
import GOrphanedBindingIcon from '@/components/Credentials/GOrphanedBindingIcon.vue'

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

const emit = defineEmits(['updateInfraBinding', 'deleteInfraBinding', 'migrateSecretBinding'])

const selectedHeaders = computed(() => {
  return mapTableHeader(headers.value, 'selected')
})

function onUpdate (value) {
  emit('updateInfraBinding', value)
}

function onDelete (value) {
  emit('deleteInfraBinding', value)
}

function onMigrateSecretBinding (value) {
  emit('migrateSecretBinding', value)
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
