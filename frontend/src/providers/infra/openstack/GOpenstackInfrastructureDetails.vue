<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <template v-if="!workerless">
    <v-col cols="3">
      <g-wildcard-select
        v-model="floatingPoolName"
        :wildcard-select-items="allFloatingPoolNames"
        wildcard-select-label="Floating Pool"
      />
    </v-col>
    <v-col cols="3">
      <v-select
        v-model="v$.loadBalancerProviderName.$model"
        color="primary"
        item-color="primary"
        label="Load Balancer Provider"
        :items="allLoadBalancerProviderNames"
        :error-messages="getErrorMessages(v$.loadBalancerProviderName)"
        persistent-hint
        variant="underlined"
        @blur="v$.loadBalancerProviderName.$touch()"
      />
    </v-col>
  </template>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { requiredIf } from '@vuelidate/validators'

import GWildcardSelect from '@/components/GWildcardSelect'

import { useShootContext } from '@/composables/useShootContext'

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

export default {
  components: {
    GWildcardSelect,
  },
  setup () {
    const {
      providerInfrastructureContext,
      workerless,
    } = useShootContext()
    const {
      loadBalancerProviderName,
      floatingPoolName,
      allLoadBalancerProviderNames,
      allFloatingPoolNames,
    } = providerInfrastructureContext.value

    return {
      v$: useVuelidate(),
      loadBalancerProviderName,
      floatingPoolName,
      allLoadBalancerProviderNames,
      allFloatingPoolNames,
      workerless,
    }
  },
  validations () {
    return {
      loadBalancerProviderName: withFieldName('Load Balancer Provider', {
        required: requiredIf(() => !this.workerless),
      }),
    }
  },
  methods: {
    getErrorMessages,
  },
}
</script>
