<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    :disabled="!secretBinding?._secret"
    location="top"
  >
    <template #activator="{ props }">
      <g-text-router-link
        v-if="canLinkToSecret"
        v-bind="props"
        :to="{ name: 'Secret', params: { name: secretBindingName, namespace: namespace } }"
        :text="secretBindingName"
      />
      <span
        v-else
        v-bind="props"
      >{{ secretBindingName }}</span>
    </template>
    <v-card>
      <g-secret-details-item-content
        class="ma-1"
        infra
        :secret="secretBinding._secret"
        :provider-type="secretBinding.provider.type"
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
import GSecretDetailsItemContent from '@/components/Secrets/GSecretDetailsItemContent'

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
  },
  computed: {
    ...mapState(useAuthzStore, [
      'canGetSecrets',
    ]),
    canLinkToSecret () {
      return this.canGetSecrets && this.secretBindingName && this.namespace
    },
    secretBinding () {
      return this.getSecretBinding({ namespace: this.namespace, name: this.secretBindingName })
    },
  },
  methods: {
    ...mapActions(useCredentialStore, ['getSecretBinding']),
  },
}
</script>

<style lang="scss" scoped>
:deep(.v-overlay__content) {
  opacity: 1 !important;
  padding: 0;
}
</style>
