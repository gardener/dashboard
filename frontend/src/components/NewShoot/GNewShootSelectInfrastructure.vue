<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row class="my-0">
    <g-new-shoot-infrastructure-card
      v-for="value in sortedInfrastructureKindList"
      :key="value"
      :model-value="value === providerType"
      :infrastructure-kind="value"
      @update:model-value="setProviderType(value)"
    />
  </v-row>
</template>

<script>
import {
  mapState,
  mapWritableState,
} from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useShootContextStore } from '@/store/shootContext'

import GNewShootInfrastructureCard from './GNewShootInfrastructureCard.vue'

export default {
  components: {
    GNewShootInfrastructureCard,
  },
  computed: {
    ...mapState(useCloudProfileStore, [
      'sortedInfrastructureKindList',
    ]),
    ...mapWritableState(useShootContextStore, [
      'providerType',
    ]),
  },
  methods: {
    setProviderType (value) {
      this.providerType = value
    },
  },
}
</script>
