<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-col
    v-if="!workerless"
    cols="3"
  >
    <v-select
      v-model="v$.parentReferenceType.$model"
      color="primary"
      item-color="primary"
      label="Parent Reference Type"
      :items="parentReferenceTypes"
      :error-messages="getErrorMessages(v$.parentReferenceType)"
      hint="Reference type for the parent resource: SingleSubnet or SubnetGroup"
      persistent-hint
      variant="underlined"
      @blur="v$.parentReferenceType.$touch()"
    />
  </v-col>
  <v-col
    v-if="!workerless"
    cols="3"
  >
    <v-text-field
      v-model="v$.parentReferenceName.$model"
      color="primary"
      label="Parent Reference Name"
      :error-messages="getErrorMessages(v$.parentReferenceName)"
      hint="Name of the parent GDC Subnet or SubnetGroup"
      persistent-hint
      variant="underlined"
      @blur="v$.parentReferenceName.$touch()"
    />
  </v-col>
  <v-col
    v-if="!workerless"
    cols="3"
  >
    <v-text-field
      v-model="parentReferenceNamespace"
      color="primary"
      label="Parent Reference Namespace (optional)"
      hint="Namespace of the parent reference, if it is in another GDC project"
      persistent-hint
      variant="underlined"
    />
  </v-col>
  <v-col
    v-if="!workerless"
    cols="3"
  >
    <v-text-field
      v-model="v$.nodeCIDR.$model"
      color="primary"
      label="Node CIDR"
      :error-messages="getErrorMessages(v$.nodeCIDR)"
      hint="CIDR range used for worker nodes. The GDC provider extension creates a subnet for this range from the parent reference (e.g. 10.0.0.0/18)"
      persistent-hint
      variant="underlined"
      @blur="v$.nodeCIDR.$touch()"
    />
  </v-col>
  <v-col
    v-if="!workerless"
    cols="3"
  >
    <v-checkbox
      v-model="enableEgress"
      label="Enable Cloud NAT egress"
      color="primary"
      density="compact"
      hint="Recommended. Disable only if your project does not use Cloud NAT egress."
      persistent-hint
    />
  </v-col>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { requiredIf } from '@vuelidate/validators'
import { Netmask } from 'netmask'

import { useShootContext } from '@/composables/useShootContext'

import { getErrorMessages } from '@/utils'
import {
  withFieldName,
  withMessage,
} from '@/utils/validators'

export default {
  setup () {
    const {
      providerInfrastructureContext,
      networkingNodes,
      workerless,
    } = useShootContext()
    const {
      parentReferenceName,
      parentReferenceNamespace,
      parentReferenceType,
      enableEgress,
      nodeCIDR,
      parentReferenceTypes,
    } = providerInfrastructureContext.value

    return {
      v$: useVuelidate(),
      parentReferenceName,
      parentReferenceNamespace,
      parentReferenceType,
      enableEgress,
      nodeCIDR,
      parentReferenceTypes,
      networkingNodes,
      workerless,
    }
  },
  validations () {
    const requiredWithWorkers = requiredIf(() => !this.workerless)
    return {
      parentReferenceName: withFieldName('Parent Reference Name', { required: requiredWithWorkers }),
      parentReferenceType: withFieldName('Parent Reference Type', { required: requiredWithWorkers }),
      nodeCIDR: withFieldName('Node CIDR', {
        required: requiredWithWorkers,
        cidr: withMessage('Must be a valid IPv4 CIDR range', value => {
          if (this.workerless || !value) {
            return true
          }
          const [address, prefix, ...remainder] = value.split('/')
          const octets = address?.split('.') ?? []
          if (remainder.length || !prefix || octets.length !== 4 || octets.some(octet => !/^\d{1,3}$/.test(octet))) {
            return false
          }
          try {
            return new Netmask(value).toString() === value
          } catch {
            return false
          }
        }),
        matchesNetworkingNodes: withMessage('Must match the shoot networking node CIDR', value => {
          return this.workerless || value === this.networkingNodes
        }),
      }),
    }
  },
  methods: {
    getErrorMessages,
  },
}
</script>
