<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <v-layout row wrap>
    <v-card
      v-for="infrastructureKind in sortedCloudProviderKindList"
      class="select_infra_card"
      :class="{ 'select_infra_card_active elevation-4' : infrastructureKind == selectedInfrastructure }"
      @click="selectInfrastructure(infrastructureKind)"
      :key="infrastructureKind"
      hover
      >
      <v-layout align-center justify-center column>
        <v-flex>
          <infra-icon :value="infrastructureKind" :height="60"></infra-icon>
        </v-flex>
        <v-flex mt-2>
          <span class="subheading">{{infrastructureKind}}</span>
        </v-flex>
      </v-layout>
    </v-card>
  </v-layout>
</template>

<script>
import InfraIcon from '@/components/VendorIcon'
import { mapGetters } from 'vuex'

export default {
  name: 'create-shoot-select-infrastructure',
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

<style lang="styl" scoped>
  @import '~vuetify/src/stylus/settings/_colors.styl';

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
