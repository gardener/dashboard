<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span v-if="resourceHash">
    <g-credential-icon
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
          :provider-type="providerType"
        />
      </v-card>
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
import GCredentialDetailsItemContent from '@/components/Credentials/GCredentialDetailsItemContent'
import GCredentialIcon from '@/components/Credentials/GCredentialIcon'

import { useCloudProviderCredential } from '@/composables/credential/useCloudProviderCredential'

const props = defineProps({
  credential: Object,
  renderLink: Boolean,
})

const credential = toRef(props, 'credential')

const authzStore = useAuthzStore()
const { canGetCloudProviderCredentials } = storeToRefs(authzStore)

const {
  providerType,
  resourceName,
  resourceNamespace,
  resourceUid,
} = useCloudProviderCredential(credential)

const resourceHash = computed(() => {
  const uid = resourceUid.value
  return uid ? `#credential-uid=${encodeURIComponent(uid)}` : ''
})

const canLinkToCredential = computed(() => canGetCloudProviderCredentials.value && resourceUid.value)

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
