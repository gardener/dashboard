<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
