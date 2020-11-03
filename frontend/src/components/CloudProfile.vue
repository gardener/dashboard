<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <template v-if="isCreateMode">
      <v-select
      :items="cloudProfiles"
      :value="value"
      item-value="metadata.name"
      item-text="metadata.displayName"
      label="Cloud Profile"
      :error-messages="getErrorMessages('value')"
      :color="color"
      :item-color="color"
      @input="onInput"
      @blur="$v.value.$touch()"
      ></v-select>
    </template>
    <template v-else>
      <v-text-field
        v-model="value"
        :disabled="true"
        label="Cloud Profile"
      ></v-text-field>
    </template>
  </div>
</template>

<script>
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'

const validationErrors = {
  value: {
    required: 'You can\'t leave this empty.'
  }
}

export default {
  name: 'CloudProfile',
  props: {
    value: {
      type: String
    },
    isCreateMode: {
      type: Boolean,
      required: true
    },
    cloudProfiles: {
      type: Array,
      required: true
    },
    color: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      validationErrors,
      valid: undefined
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    validators () {
      return {
        value: {
          required
        }
      }
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInput (value) {
      this.$v.value.$touch()
      this.$emit('input', value)
      this.validateInput()
    },
    validateInput () {
      const valid = !this.$v.$invalid
      if (this.valid !== valid) {
        this.valid = valid
        this.$emit('valid', valid)
      }
    }
  }
}
</script>
