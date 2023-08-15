<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row class="my-0">
    <v-card
      v-for="infrastructureKind in sortedInfrastructureKindList"
      :key="infrastructureKind"
      class="select_infra_card cursor-pointer"
      :class="{
        'select_infra_card_active elevation-8' : infrastructureKind === selectedInfrastructure,
        'elevation-3': infrastructureKind !== selectedInfrastructure,
      }"
      hover
      @click.stop="selectInfrastructure(infrastructureKind)"
    >
      <div class="d-flex flex-column justify-center align-center">
        <div>
          <g-vendor-icon
            :icon="infrastructureKind"
            :size="60"
            no-background
          />
        </div>
        <div class="mt-2">
          <span class="text-subtitle-1">{{ infrastructureKind }}</span>
        </div>
      </div>
    </v-card>
  </v-row>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'

import GVendorIcon from '@/components/GVendorIcon'
import { useCloudProfileStore } from '@/store'

export default {
  components: {
    GVendorIcon,
  },
  props: {
    userInterActionBus: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      selectedInfrastructure: undefined,
    }
  },
  computed: {
    ...mapState(useCloudProfileStore, [
      'sortedInfrastructureKindList',
    ]),
  },
  methods: {
    ...mapActions(useCloudProfileStore, ['cloudProfilesByCloudProviderKind']),
    selectInfrastructure (infrastructure) {
      this.setSelectedInfrastructure(infrastructure)
      this.userInterActionBus.emit('updateInfrastructure', infrastructure)
    },
    setSelectedInfrastructure (infrastructure) {
      this.selectedInfrastructure = infrastructure
    },
  },
}
</script>

<style lang="scss" scoped>
  .select_infra_card {
    padding: 10px;
    opacity: 0.8;
    margin: 10px 20px 10px 0px;
    min-width: 120px;
    filter: grayscale(80%);
  }

  .select_infra_card:hover {
    opacity: 1;
    filter: grayscale(50%);
  }

  .select_infra_card_active {
    border: 1px solid rgb(var(--v-theme-primary));
    opacity: 1;
    filter: grayscale(0%);
  }

  .select_infra_card_active:hover {
    filter: grayscale(0%);
  }
</style>
