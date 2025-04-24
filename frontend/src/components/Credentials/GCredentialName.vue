<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span v-if="binding">
    <g-credential-icon :binding="binding" />
    <v-tooltip
      class="credentials-details-tooltip"
      :open-delay="500"
      :disabled="!binding?._secret"
      location="top"
    >
      <template #activator="{ props: tProps }">
        <g-text-router-link
          v-if="canLinkToCredential && renderLink"
          v-bind="tProps"
          :to="{ name: 'Credentials', params: { namespace: binding.metadata.namespace }, hash: credentialHash }"
          :text="binding.metadata.name"
        />
        <span
          v-else
          v-bind="tProps"
        >{{ binding.metadata.name }}</span>
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
      v-if="isSharedCredential"
      location="top"
    >
      <template #activator="{ props: tProps }">
        <v-icon
          v-bind="tProps"
          size="small"
          class="ml-2"
        >
          mdi-account-arrow-left
        </v-icon>
      </template>
      <span>Credential shared by {{ credentialNamespace }}</span>
    </v-tooltip>
    <v-tooltip
      v-if="isOrphanedCredential"
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
      Associated credential does not exist
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
import GCredentialIcon from '@/components/Credentials/GCredentialIcon'

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'

const props = defineProps({
  binding: Object,
  renderLink: Boolean,
})

const binding = toRef(props.binding)

const authzStore = useAuthzStore()
const { canGetCloudProviderCredentials } = storeToRefs(authzStore)

const canLinkToCredential = computed(() => canGetCloudProviderCredentials.value && binding.value)

const credentialHash = computed(() => {
  const uid = binding.value?.metadata?.uid
  return uid ? `#credential-uid=${encodeURIComponent(uid)}` : ''
})

const {
  isSharedCredential,
  credentialNamespace,
  isOrphanedCredential,
} = useCloudProviderBinding(binding)

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
