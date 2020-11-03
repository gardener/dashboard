<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-select
      hint="Indicate the importance of the cluster"
      color="cyan darken-2"
      item-color="cyan darken-2"
      label="Purpose"
      :items="purposes"
      item-text="purpose"
      item-value="purpose"
      v-model="internalPurpose"
      persistent-hint
      :error-messages="getErrorMessages('internalPurpose')"
      @input="onInputPurpose"
      @blur="$v.internalPurpose.$touch()">
      <template v-slot:item="{ item }">
        <v-list-item-content>
          <v-list-item-title>{{item.purpose}}</v-list-item-title>
          <v-list-item-subtitle>
            {{item.description}}
          </v-list-item-subtitle>
        </v-list-item-content>
      </template>
    </v-select>
  </div>
</template>

<script>
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors, purposesForSecret } from '@/utils'
import map from 'lodash/map'
import head from 'lodash/head'

const validationErrors = {
  internalPurpose: {
    required: 'Purpose is required.'
  }
}

export default {
  name: 'Purpose',
  props: {
    secret: {
      type: Object
    }
  },
  data () {
    return {
      validationErrors,
      valid: undefined,
      internalPurpose: undefined
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    validators () {
      return {
        internalPurpose: {
          required
        }
      }
    },
    purposes () {
      const purposes = purposesForSecret(this.secret)
      return map(purposes, purpose => ({
        purpose,
        description: this.descriptionForPurpose(purpose)
      }))
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputPurpose () {
      this.$v.internalPurpose.$touch()
      this.$emit('updatePurpose', this.internalPurpose)
      this.validateInput()
    },
    validateInput () {
      const valid = !this.$v.$invalid
      if (this.valid !== valid) {
        this.valid = valid
        this.$emit('valid', valid)
      }
    },
    descriptionForPurpose (purpose) {
      switch (purpose) {
        case 'testing':
          return 'Testing clusters do not get a monitoring or a logging stack as part of their control planes'
        default:
          return ''
      }
    },
    setDefaultPurpose () {
      this.internalPurpose = head(this.purposes).purpose
      this.onInputPurpose()
    },
    setPurpose (purpose) {
      this.internalPurpose = purpose
      this.onInputPurpose()
    }
  }
}
</script>
