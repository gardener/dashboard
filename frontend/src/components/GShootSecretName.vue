<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span>
    <g-text-router-link
      v-if="canLinkToSecret"
      :to="{ name: 'Secret', params: { name: secretBindingName, namespace: namespace } }"
      :text="secretBindingName"
    />
    <span v-else>{{ secretBindingName }}</span>
    <v-tooltip
      v-if="secret"
      location="top"
      activator="parent"
    >
      <v-card>
        <v-card-text>
          <g-secret-details-item-content
            infra
            :secret="secret"
          />
        </v-card-text>
      </v-card>
    </v-tooltip>
  </span>
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
