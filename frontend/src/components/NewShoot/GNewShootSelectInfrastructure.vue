<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row class="my-0">
    <v-card
      v-for="infrastructureKind in sortedInfrastructureKindList"
      class="select_infra_card cursor-pointer"
      :class="{
        'select_infra_card_active elevation-8' : infrastructureKind === selectedInfrastructure,
        'elevation-3': infrastructureKind !== selectedInfrastructure,
      }"
      @click.stop="selectInfrastructure(infrastructureKind)"
      :key="infrastructureKind"
      hover
      >
      <div class="d-flex flex-column justify-center align-center">
        <div>
          <g-vendor-icon :value="infrastructureKind" :size="60" no-background></g-vendor-icon>
        </div>
        <div class="mt-2" >
          <span class="text-subtitle-1">{{infrastructureKind}}</span>
        </div>
      </div>
    </v-card>
  </v-row>
</template>

<script>
import { defineComponent } from 'vue'
import GVendorIcon from '@/components/GVendorIcon'
import { mapGetters, mapActions } from 'pinia'
import {
  useCloudProfileStore,
} from '@/store'

export default defineComponent({
  components: {
    GVendorIcon,
  },
  props: {
    userInterActionBus: {
      type: Object,
      required: true,
    },
  },
  emits: [
    'valid',
  ],
  data () {
    return {
      selectedInfrastructure: undefined,
      valid: false,
      infrastructureValid: false,
    }
  },
  computed: {
    ...mapGetters(useCloudProfileStore, ['sortedInfrastructureKindList']),
  },
  methods: {
    ...mapActions(useCloudProfileStore, ['cloudProfilesByCloudProviderKind']),
    selectInfrastructure (infrastructure) {
      this.setSelectedInfrastructure(infrastructure)
      this.userInterActionBus.emit('updateInfrastructure', infrastructure)
    },
    validateInput () {
      const valid = this.infrastructureValid
      if (this.valid !== valid) {
        this.valid = valid
        this.$emit('valid', valid)
      }
    },
    setSelectedInfrastructure (infrastructure) {
      this.selectedInfrastructure = infrastructure
      this.infrastructureValid = true
      this.validateInput()
    },
  },
})
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
    border: 1px solid var(--v-primary-base);
    opacity: 1;
    filter: grayscale(0%);
  }

  .select_infra_card_active:hover {
    filter: grayscale(0%);
  }
</style>
