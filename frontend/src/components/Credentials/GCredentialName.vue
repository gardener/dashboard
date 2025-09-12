<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span v-if="resourceHash">
    <g-credential-icon
      :binding="binding"
      :credential="credential"
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
  toRefs,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useAuthzStore } from '@/store/authz'

import GTextRouterLink from '@/components/GTextRouterLink.vue'
import GCredentialDetailsItemContent from '@/components/Credentials/GCredentialDetailsItemContent'
import GCredentialIcon from '@/components/Credentials/GCredentialIcon'
import GOrphanedCredentialIcon from '@/components/Credentials/GOrphanedBindingIcon.vue'
import GSharedCredentialIcon from '@/components/Credentials/GSharedCredentialIcon.vue'

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'
import { useCloudProviderCredential } from '@/composables/credential/useCloudProviderCredential'

const props = defineProps({
  credential: Object,
  binding: Object,
  renderLink: Boolean,
})

const { credential, binding } = toRefs(props)

const authzStore = useAuthzStore()
const { canGetCloudProviderCredentials } = storeToRefs(authzStore)

let credentialComposable = {}
if (binding.value) {
  credentialComposable = useCloudProviderBinding(binding)
}
if (credential.value) {
  credentialComposable = useCloudProviderCredential(credential)
}

const {
  isSharedBinding,
  credentialNamespace,
  isOrphanedBinding,
  providerType,
  resourceName,
  resourceNamespace,
  resourceUid,
} = credentialComposable

const canLinkToCredential = computed(() => canGetCloudProviderCredentials.value && resourceUid?.value)

const resourceHash = computed(() => {
  const uid = resourceUid?.value
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
