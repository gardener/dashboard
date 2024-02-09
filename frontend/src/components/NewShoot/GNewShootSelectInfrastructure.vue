<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row class="my-0">
    <g-new-shoot-infrastructure-card
      v-for="kind in sortedInfrastructureKindList"
      :key="kind"
      :model-value="kind === infrastructureKind"
      :infrastructure-kind="kind"
      @update:model-value="selectInfrastructure(kind)"
    />
  </v-row>
</template>

<script>
import {
  mapState,
  mapWritableState,
} from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useShootCreationStore } from '@/store/shoot'

import GNewShootInfrastructureCard from './GNewShootInfrastructureCard.vue'

export default {
  components: {
    GNewShootInfrastructureCard,
  },
  computed: {
    ...mapState(useCloudProfileStore, [
      'sortedInfrastructureKindList',
    ]),
    ...mapWritableState(useShootCreationStore, [
      'infrastructureKind',
    ]),
  },
  methods: {
    selectInfrastructure (value) {
      this.infrastructureKind = value
    },
  },
}
</script>
