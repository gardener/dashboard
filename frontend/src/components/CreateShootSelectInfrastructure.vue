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
  <div>
    <v-layout align-center justify-center row fill-height>
      <v-card
        v-for="infrastructureKind in sortedCloudProviderKindList"
        :class="select_infra_card_class(infrastructureKind)"
        @click="selectInfrastructure(infrastructureKind)"
        :key="infrastructureKind"
        hover
        >
        <v-layout align-center justify-center row fill-height>
          <infra-icon :value="infrastructureKind" :width="100"></infra-icon>
        </v-layout>
      </v-card>
    </v-layout>
  </div>
</template>

<script>
import InfraIcon from '@/components/InfrastructureIcon'
import intersection from 'lodash/intersection'
import { mapGetters } from 'vuex'

export default {
  name: 'create-shoot-infrastructure',
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
      'cloudProviderKindList',
      'cloudProfilesByCloudProviderKind'
    ]),
    sortedCloudProviderKindList () {
      return intersection(['aws', 'azure', 'gcp', 'openstack', 'alicloud'], this.cloudProviderKindList)
    }
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
    select_infra_card_class (infrastructure) {
      if (infrastructure === this.selectedInfrastructure) {
        return 'select_infra_card select_infra_card_active'
      }
      return 'select_infra_card'
    },
    setSelectedInfrastructure (infrastructure) {
      this.selectedInfrastructure = infrastructure
      this.infrastructureValid = true
      this.validateInput()
    },
  },
  mounted () {
    this.$nextTick(() => {
      if (!this.selectedInfrastructure) {
        this.selectInfrastructure('aws')
      }
    })
  }
}
</script>

<style lang="styl" scoped>
  .select_infra_card {
    padding: 10px;
    opacity: 0.8;
    cursor: pointer;
    margin: 10px 20px 10px;
    height: 120px;
  }

  .select_infra_card:hover {
    padding: 10px;
    opacity: 1;
  }

  .select_infra_card_active {
    border: 1px solid #0097A7; // cyan darken-2
    opacity: 1
    margin: 9px 19px 9px;
  }
</style>
