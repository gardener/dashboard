<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <template v-if="createMode">
      <v-select
        v-model="v$.internalValue.$model"
        :items="cloudProfiles"
        item-value="metadata.name"
        item-title="metadata.displayName"
        label="Cloud Profile"
        :error-messages="getErrorMessages(v$.internalValue)"
        color="primary"
        variant="underlined"
        @blur="v$.internalValue.$touch()"
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

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

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
  validations () {
    return {
      internalValue: withFieldName('Cloud Profile', {
        required,
      }),
    }
  },
  computed: {
    internalValue: {
      get () {
        return this.modelValue
      },
      set (value) {
        this.$emit('update:modelValue', value)
      },
    },
  },
  methods: {
    getErrorMessages,
  },
}
</script>
