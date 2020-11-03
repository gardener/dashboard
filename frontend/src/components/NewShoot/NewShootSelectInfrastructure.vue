<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row >
    <v-card
      v-for="infrastructureKind in sortedCloudProviderKindList"
      class="select_infra_card"
      :class="{ 'select_infra_card_active elevation-4' : infrastructureKind == selectedInfrastructure }"
      @click="selectInfrastructure(infrastructureKind)"
      :key="infrastructureKind"
      hover
      >
      <div class="d-flex flex-column justify-center align-center">
        <div>
          <infra-icon :value="infrastructureKind" :height="60"></infra-icon>
        </div>
        <div class="mt-2" >
          <span class="subtitle-1">{{infrastructureKind}}</span>
        </div>
      </div>
    </v-card>
  </v-row>
</template>

<script>
import InfraIcon from '@/components/VendorIcon'
import { mapGetters } from 'vuex'

export default {
  name: 'new-shoot-select-infrastructure',
  components: {
    InfraIcon
  },
  props: {
    userInterActionBus: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      selectedInfrastructure: undefined,
      valid: false,
      infrastructureValid: false
    }
  },
  computed: {
    ...mapGetters([
      'sortedCloudProviderKindList',
      'cloudProfilesByCloudProviderKind'
    ])
  },
  methods: {
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
    }
  }
}
</script>

<style lang="scss" scoped>
  .select_infra_card {
    padding: 10px;
    opacity: 0.8;
    cursor: pointer;
    margin: 10px 20px 10px 0px;
    min-width: 120px;
    filter: grayscale(70%);
    background-color: #f9f9f9;
  }

  .select_infra_card:hover {
    padding: 10px;
    opacity: 1;
    filter: grayscale(50%);
  }

  .select_infra_card_active {
    opacity: 1;
    filter: grayscale(0%);
    background-color: transparent;
  }

  .select_infra_card_active:hover {
    filter: grayscale(0%);
  }
</style>
