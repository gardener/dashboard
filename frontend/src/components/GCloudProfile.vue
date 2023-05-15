<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <template v-if="createMode">
      <v-select
        :items="cloudProfiles"
        :model-value="modelValue"
        item-value="metadata.name"
        item-title="metadata.displayName"
        label="Cloud Profile"
        :error-messages="getErrorMessages('modelValue')"
        color="primary"
        @update:model-value="onInput"
        @blur="v$.modelValue.$touch()"
        variant="underlined"
      />
    </template>
    <template v-else>
      <v-text-field
        :model-value="modelValue"
        :disabled="true"
        label="Cloud Profile"
      ></v-text-field>
    </template>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { getValidationErrors } from '@/utils'

const validationErrors = {
  modelValue: {
    required: 'You can\'t leave this empty.',
  },
}

export default defineComponent({
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  props: {
    modelValue: {
      type: String,
    },
    createMode: {
      type: Boolean,
      default: false,
    },
    cloudProfiles: {
      type: Array,
      required: true,
    },
  },
  emits: [
    'update:modelValue',
    'valid',
  ],
  data () {
    return {
      validationErrors,
      valid: undefined,
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    validators () {
      return {
        modelValue: {
          required,
        },
      }
    },
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInput (modelValue) {
      this.v$.modelValue.$touch()
      this.$emit('update:modelValue', modelValue)
      this.validateInput()
    },
    validateInput () {
      const valid = !this.v$.$invalid
      if (this.valid !== valid) {
        this.valid = valid
        this.$emit('valid', valid)
      }
    },
  },
})
</script>
