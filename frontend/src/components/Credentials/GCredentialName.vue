<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span v-if="binding">
    <v-tooltip location="top">
      <template #activator="{ props: tprops }">
        <v-icon
          v-bind="tprops"
          size="small"
          class="mr-2"
        >
          {{ computedItem.kind.icon }}
        </v-icon>
      </template>
      <span>{{ computedItem.kind.tooltip }}</span>
    </v-tooltip>
    <v-tooltip
      class="credentials-details-tooltip"
      :open-delay="500"
      :disabled="!binding?._secret"
      location="top"
    >
      <template #activator="{ props: tprops }">
        <g-text-router-link
          v-if="canLinkToCredential && renderLink"
          v-bind="tprops"
          :to="{ name: 'Credentials', params: { namespace: binding.metadata.namespace }, hash: credentialHash }"
          :text="computedItem.name"
        />
        <span
          v-else
          v-bind="tprops"
        >{{ computedItem.name }}</span>
      </template>
      <v-card>
        <g-secret-details-item-content
          class="ma-1"
          :secret="binding._secret"
          :provider-type="binding.provider.type"
        />
      </v-card>
    </v-tooltip>
    <v-tooltip
      v-if="computedItem.isSharedCredential"
      location="top"
    >
      <template #activator="{ props: tprops }">
        <v-icon
          v-bind="tprops"
          size="small"
          class="ml-2"
        >
          mdi-account-arrow-left
        </v-icon>
      </template>
      <span>Credential shared by {{ computedItem.credentialNamespace }}</span>
    </v-tooltip>
    <v-tooltip
      v-if="computedItem.isOrphaned"
      location="top"
    >
      <template #activator="{ props: activatorProps }">
        <v-icon
          v-bind="activatorProps"
          icon="mdi-alert-circle-outline"
          end
          size="small"
          color="warning"
        />
      </template>
      Associated Credential does not exist
    </v-tooltip>
  </span>
  <span v-else>
    <span>Unknown credential</span>
  </span>
</template>

<script setup>
import {
  computed,
  toRef,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useAuthzStore } from '@/store/authz'

import GTextRouterLink from '@/components/GTextRouterLink.vue'
import GSecretDetailsItemContent from '@/components/Credentials/GSecretDetailsItemContent'

import { computeBindingItem } from '@/utils'

const props = defineProps({
  binding: Object,
  renderLink: Boolean,
})

const binding = toRef(props.binding)

const authzStore = useAuthzStore()
const { canGetCloudProviderCredentials } = storeToRefs(authzStore)

const computedItem = computed(() => computeBindingItem(binding.value))

const canLinkToCredential = computed(() => canGetCloudProviderCredentials.value && binding.value)

const credentialHash = computed(() => {
  const uid = binding.value?.metadata?.uid
  return uid ? `#credential-uid=${encodeURIComponent(uid)}` : ''
})

</script>

<style lang="scss" scoped>

.credentials-details-tooltip {
  :deep(.v-overlay__content) {
    opacity: 1 !important;
    padding: 0;
    width: 200px;
  }
}
</style>
