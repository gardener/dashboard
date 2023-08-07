<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

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
        variant="underlined"
        @update:model-value="onInput"
        @blur="v$.modelValue.$touch()"
      />
    </template>
    <template v-else>
      <v-text-field
        :model-value="modelValue"
        :disabled="true"
        label="Cloud Profile"
      />
    </template>
  </div>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { getValidationErrors } from '@/utils'

const validationErrors = {
  modelValue: {
    required: 'You can\'t leave this empty.',
  },
}

export default {
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
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      validationErrors,
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
    },
  },
}
</script>
