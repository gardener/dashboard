<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    v-if="secret"
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
        :secret="secret"
      />
    </v-card>
  </v-tooltip>
</template>

<script>
import { mapActions } from 'pinia'

import { useSecretStore } from '@/store/secret'

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
    canLinkToSecret () {
      return this.secretBindingName && this.namespace
    },
    secret () {
      return this.getCloudProviderSecretByName({ namespace: this.namespace, name: this.secretBindingName })
    },
  },
  methods: {
    ...mapActions(useSecretStore, ['getCloudProviderSecretByName']),
  },
}
</script>

<style lang="scss" scoped>
:deep(.v-overlay__content) {
  opacity: 1 !important;
  padding: 0;
}
</style>
