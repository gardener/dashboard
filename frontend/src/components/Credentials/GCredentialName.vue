<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span v-if="credentialEntity">
    <g-credential-icon :credential-entity="credentialEntity" />
    <v-tooltip
      class="credentials-details-tooltip"
      :open-delay="500"
      location="top"
    >
      <template #activator="{ props: tProps }">
        <g-text-router-link
          v-if="canLinkToCredential && renderLink"
          v-bind="tProps"
          :to="{ name: 'Credentials', params: { namespace: credentialEntity.metadata.namespace }, hash: credentialHash }"
          :text="credentialEntity.metadata.name"
        />
        <span
          v-else
          v-bind="tProps"
        >{{ credentialEntity.metadata.name }}</span>
      </template>
      <v-card>
        <g-credential-details-item-content
          class="ma-1"
          :credential="credential"
          :shared="isSharedCredential"
          :provider-type="providerType"
        />
      </v-card>
    </v-tooltip>
    <g-shared-credential-icon
      v-if="isSharedCredential"
      :namespace="credentialNamespace"
    />
    <g-orphaned-credential-icon
      v-if="isOrphanedBinding"
      :credential-entity="credentialEntity"
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
import GCredentialIcon from '@/components/Credentials/GCredentialIcon'
import GOrphanedCredentialIcon from '@/components/Credentials/GOrphanedCredentialIcon.vue'
import GSharedCredentialIcon from '@/components/Credentials/GSharedCredentialIcon.vue'

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'
import { useCredential } from '@/composables/credential/useCloudProviderCredential'
import {
  isSecretBinding,
  isCredentialsBinding,
  getProviderType,
} from '@/composables/credential/helper'

const props = defineProps({
  credentialEntity: Object,
  renderLink: Boolean,
})

const credentialEntity = toRef(props, 'credentialEntity')

const authzStore = useAuthzStore()
const { canGetCloudProviderCredentials } = storeToRefs(authzStore)

const canLinkToCredential = computed(() => canGetCloudProviderCredentials.value && credentialEntity.value)

const credentialHash = computed(() => {
  const uid = credentialEntity.value?.metadata?.uid
  return uid ? `#credential-uid=${encodeURIComponent(uid)}` : ''
})

let composable
if (isSecretBinding(credentialEntity.value) || isCredentialsBinding(credentialEntity.value)) {
  composable = useCloudProviderBinding(credentialEntity)
} else {
  composable = useCredential(credentialEntity)
}

const {
  isSharedCredential,
  credentialNamespace,
  isOrphanedBinding,
  credential,
} = composable

const providerType = computed(() => getProviderType(credential.value))

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
