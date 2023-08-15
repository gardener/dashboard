<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-select
      v-model="internalPurpose"
      hint="Indicate the importance of the cluster"
      color="primary"
      item-color="primary"
      label="Purpose"
      :items="purposes"
      item-title="purpose"
      item-value="purpose"
      persistent-hint
      :error-messages="getErrorMessages('internalPurpose')"
      variant="underlined"
      @update:model-value="onInputPurpose"
      @blur="v$.internalPurpose.$touch()"
    >
      <template #item="{ item, props }">
        <v-list-item
          v-bind="props"
          :subtitle="item.raw.description"
        />
      </template>
    </v-select>
  </div>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import {
  getValidationErrors,
  purposesForSecret,
} from '@/utils'

import { map } from '@/lodash'

const validationErrors = {
  internalPurpose: {
    required: 'Purpose is required.',
  },
}

export default {
  props: {
    secret: {
      type: Object,
    },
  },
  emits: [
    'update-purpose',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      validationErrors,
      valid: undefined,
      internalPurpose: undefined,
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    validators () {
      return {
        internalPurpose: {
          required,
        },
      }
    },
    purposes () {
      const purposes = purposesForSecret(this.secret)
      return map(purposes, purpose => ({
        purpose,
        description: this.descriptionForPurpose(purpose),
      }))
    },
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputPurpose () {
      this.v$.internalPurpose.$touch()
      this.$emit('update-purpose', this.internalPurpose)
    },
    descriptionForPurpose (purpose) {
      switch (purpose) {
        case 'testing':
          return 'Testing clusters do not get a monitoring or a logging stack as part of their control planes'
        default:
          return ''
      }
    },
    resetPurpose () {
      if (!this.purposes.some(p => p.purpose === this.internalPurpose)) {
        this.internalPurpose = undefined
        this.onInputPurpose()
      }
    },
    setPurpose (purpose) {
      this.internalPurpose = purpose
      this.onInputPurpose()
    },
  },
}
</script>
@/lodash
