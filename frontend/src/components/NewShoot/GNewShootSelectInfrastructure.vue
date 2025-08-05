<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row class="my-0">
    <g-new-shoot-infrastructure-card
      v-for="value in cloudProfileStore.sortedInfraProviderTypeList"
      :key="value"
      :model-value="value === providerType"
      :provider-type="value"
      @update:model-value="setProviderType(value)"
    />
  </v-row>
</template>

<script setup>
import { useCloudProfileStore } from '@/store/cloudProfile'

import { useShootContext } from '@/composables/useShootContext'

import GNewShootInfrastructureCard from './GNewShootInfrastructureCard.vue'

const cloudProfileStore = useCloudProfileStore()

const { providerType } = useShootContext()

function setProviderType (value) {
  providerType.value = value
}
</script>
