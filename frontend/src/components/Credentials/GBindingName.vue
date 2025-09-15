<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span v-if="resourceHash">
    <g-binding-icon
      :binding="binding"
    />
    <v-tooltip
      class="credentials-details-tooltip"
      :open-delay="500"
      location="top"
    >
      <template #activator="{ props: tProps }">
        <g-text-router-link
          v-if="canLinkToCredential && renderLink"
          v-bind="tProps"
          :to="{ name: 'Credentials', params: { namespace: resourceNamespace }, hash: resourceHash }"
          :text="resourceName"
        />
        <span
          v-else
          v-bind="tProps"
        >{{ resourceName }}</span>
      </template>
      <v-card>
        <g-credential-details-item-content
          class="ma-1"
          :credential="credential"
          :shared="isSharedBinding"
          :provider-type="providerType"
        />
      </v-card>
    </v-tooltip>
    <g-shared-credential-icon
      v-if="isSharedBinding"
      :namespace="credentialNamespace"
    />
    <g-orphaned-credential-icon
      v-if="isOrphanedBinding"
      :binding="binding"
    />
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
import GCredentialDetailsItemContent from '@/components/Credentials/GCredentialDetailsItemContent'
import GBindingIcon from '@/components/Credentials/GBindingIcon'
import GOrphanedCredentialIcon from '@/components/Credentials/GOrphanedBindingIcon.vue'
import GSharedCredentialIcon from '@/components/Credentials/GSharedCredentialIcon.vue'

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'

const props = defineProps({
  binding: Object,
  renderLink: Boolean,
})

const binding = toRef(props, 'binding')

const authzStore = useAuthzStore()
const { canGetCloudProviderCredentials } = storeToRefs(authzStore)

const {
  isSharedBinding,
  credentialNamespace,
  isOrphanedBinding,
  providerType,
  resourceName,
  resourceNamespace,
  resourceUid,
  credential,
} = useCloudProviderBinding(binding)

const resourceHash = computed(() => {
  const uid = resourceUid.value
  return uid ? `#credential-uid=${encodeURIComponent(uid)}` : ''
})

const canLinkToCredential = computed(() => canGetCloudProviderCredentials.value && resourceName.value)

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
