<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    :disabled="!binding?._secret"
    location="top"
  >
    <template #activator="{ props }">
      <g-text-router-link
        v-if="canLinkToCredential"
        v-bind="props"
        :to="{ name: 'Credentials', params: { namespace }, hash: credentialHash }"
        :text="binding?.metadata.name"
      />
      <span
        v-else
        v-bind="props"
      >{{ binding?.metadata.name }}</span>
      <v-chip
        label
        size="x-small"
        color="primary"
        variant="tonal"
        class="ml-2"
      >
        {{ binding?.kind }}
      </v-chip>
    </template>
    <v-card>
      <g-secret-details-item-content
        v-if="binding"
        class="ma-1"
        infra
        :secret="binding._secret"
        :provider-type="binding.provider.type"
      />
    </v-card>
  </v-tooltip>
</template>

<script>
import {
  mapActions,
  mapState,
} from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useCredentialStore } from '@/store/credential'

import GTextRouterLink from '@/components/GTextRouterLink.vue'
import GSecretDetailsItemContent from '@/components/Credentials/GSecretDetailsItemContent'

export default {
  components: {
    GTextRouterLink,
    GSecretDetailsItemContent,
  },
  props: {
    namespace: {
      type: String,
    },
    secretBindingName: {
      type: String,
    },
    credentialsBindingName: {
      type: String,
    },
  },
  computed: {
    ...mapState(useAuthzStore, [
      'canGetCloudProviderCredentials',
    ]),
    canLinkToCredential () {
      return this.canGetCloudProviderCredentials && this.binding
    },
    binding () {
      if (!this.namespace) {
        return undefined
      }
      if (this.secretBindingName) {
        return this.getSecretBinding({ namespace: this.namespace, name: this.secretBindingName })
      }
      if (this.credentialsBindingName) {
        return this.getCredentialsBinding({ namespace: this.namespace, name: this.credentialsBindingName })
      }
      return undefined
    },
    credentialHash () {
      const uid = this.binding?.metadata.uid
      if (!uid) {
        return ''
      }
      return `#credential-uid=${encodeURIComponent(uid)}`
    },
  },
  methods: {
    ...mapActions(useCredentialStore, ['getSecretBinding', 'getCredentialsBinding']),
  },
}
</script>

<style lang="scss" scoped>
:deep(.v-overlay__content) {
  opacity: 1 !important;
  padding: 0;
}
</style>
