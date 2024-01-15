<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row class="my-0">
    <g-new-shoot-infrastructure-card
      v-for="infrastructureKind in sortedInfrastructureKindList"
      :key="infrastructureKind"
      :model-value="infrastructureKind === selectedInfrastructureKind"
      :infrastructure-kind="infrastructureKind"
      @update:model-value="selectInfrastructure(infrastructureKind)"
    />
  </v-row>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'

import GNewShootInfrastructureCard from './GNewShootInfrastructureCard.vue'

export default {
  components: {
    GNewShootInfrastructureCard,
  },
  props: {
    userInterActionBus: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      selectedInfrastructureKind: undefined,
    }
  },
  computed: {
    ...mapState(useCloudProfileStore, [
      'sortedInfrastructureKindList',
    ]),
  },
  methods: {
    ...mapActions(useCloudProfileStore, ['cloudProfilesByCloudProviderKind']),
    selectInfrastructure (value) {
      this.setSelectedInfrastructure(value)
      this.userInterActionBus.emit('updateInfrastructure', value)
    },
    setSelectedInfrastructure (value) {
      this.selectedInfrastructureKind = value
    },
  },
}
</script>
