<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-col
    v-if="!workerless"
    cols="3"
  >
    <v-text-field
      v-model="v$.projectID.$model"
      color="primary"
      item-color="primary"
      label="Project ID"
      :error-messages="getErrorMessages(v$.projectID)"
      hint="Clusters with same Project ID share IP ranges to allow load balancing accross multiple partitions"
      persistent-hint
      variant="underlined"
      @blur="v$.projectID.$touch()"
    />
  </v-col>
  <v-col
    v-if="!workerless"
    cols="3"
  >
    <v-select
      v-model="v$.partitionID.$model"
      color="primary"
      item-color="primary"
      label="Partition ID"
      :items="partitionIDs"
      :error-messages="getErrorMessages(v$.partitionID)"
      hint="Partion ID equals zone on other infrastructures"
      persistent-hint
      variant="underlined"
      @blur="v$.partitionID.$touch()"
    />
  </v-col>
  <v-col
    v-if="!workerless"
    cols="3"
  >
    <v-select
      v-model="v$.firewallImage.$model"
      color="primary"
      item-color="primary"
      label="Firewall Image"
      :items="firewallImages"
      :error-messages="getErrorMessages(v$.firewallImage)"
      variant="underlined"
      @blur="v$.firewallImage.$touch()"
    />
  </v-col>
  <v-col
    v-if="!workerless"
    cols="3"
  >
    <v-select
      v-model="v$.firewallSize.$model"
      color="primary"
      item-color="primary"
      label="Firewall Size"
      :items="firewallSizes"
      :error-messages="getErrorMessages(v$.firewallSize)"
      variant="underlined"
      @blur="v$.firewallSize.$touch()"
    />
  </v-col>
  <v-col
    v-if="!workerless"
    cols="3"
  >
    <v-select
      v-model="v$.firewallNetworks.$model"
      color="primary"
      item-color="primary"
      label="Firewall Networks"
      :items="allFirewallNetworks"
      :error-messages="getErrorMessages(v$.firewallNetworks)"
      chips
      closable-chips
      multiple
      variant="underlined"
      @blur="v$.firewallNetworks.$touch()"
    />
  </v-col>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { requiredIf } from '@vuelidate/validators'

import { useShootContext } from '@/composables/useShootContext'

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

export default {
  setup () {
    const {
      providerInfrastructureContext,
      workerless,
    } = useShootContext()
    const {
      projectID,
      partitionID,
      firewallImage,
      firewallSize,
      firewallNetworks,
      partitionIDs,
      firewallImages,
      firewallSizes,
      allFirewallNetworks,
    } = providerInfrastructureContext.value

    return {
      v$: useVuelidate(),
      projectID,
      partitionID,
      firewallImage,
      firewallSize,
      firewallNetworks,
      partitionIDs,
      firewallImages,
      firewallSizes,
      allFirewallNetworks,
      workerless,
    }
  },
  validations () {
    const requiredWithWorkers = requiredIf(() => !this.workerless)
    return {
      projectID: withFieldName('Project ID', { required: requiredWithWorkers }),
      partitionID: withFieldName('Partition ID', { required: requiredWithWorkers }),
      firewallImage: withFieldName('Firewall Image', { required: requiredWithWorkers }),
      firewallSize: withFieldName('Firewall Size', { required: requiredWithWorkers }),
      firewallNetworks: withFieldName('Firewall Networks', { required: requiredWithWorkers }),
    }
  },
  watch: {
    workerless (value) {
      if (!value) {
        this.v$.projectID.$touch()
      }
    },
  },
  mounted () {
    if (!this.workerless) {
      this.v$.projectID.$touch()
    }
  },
  methods: {
    getErrorMessages,
  },
}
</script>
