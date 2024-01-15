<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row class="my-0">
    <v-hover>
      <template #default="{ isHovering, props }">
        <v-card
          v-for="infrastructureKind in sortedInfrastructureKindList"
          v-bind="props"
          :key="infrastructureKind"
          class="select_infra_card cursor-pointer"
          :class="{
            'select_infra_card_active elevation-8' : isActive(infrastructureKind),
            'elevation-3': !isActive(infrastructureKind),
          }"
          hover
          @click.stop="selectInfrastructure(infrastructureKind)"
        >
          <div class="d-flex flex-column justify-center align-center">
            <g-vendor-icon
              :icon="infrastructureKind"
              :size="60"
              no-background
              :grayscale="getGrayscaleVal(infrastructureKind, isHovering)"
            />
            <div class="mt-2 text-subtitle-1">
              {{ infrastructureKind }}
            </div>
          </div>
        </v-card>
      </template>
    </v-hover>
  </v-row>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'

import GVendorIcon from '@/components/GVendorIcon'

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
    isActive (infrastructureKind) {
      return infrastructureKind === this.selectedInfrastructure
    },
    getGrayscaleVal (infrastructureKind, isHovering) {
      if (this.isActive(infrastructureKind)) {
        return '0%'
      }
      if (isHovering) {
        return '50%'
      }
      return '80%'
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
  }

  .select_infra_card:hover {
    opacity: 1;
  }

  .select_infra_card_active {
    border: 1px solid rgb(var(--v-theme-primary));
    opacity: 1;
  }
</style>
