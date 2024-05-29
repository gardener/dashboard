<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-select
    v-model="v$.internalValue.$model"
    hint="Indicate the importance of the cluster"
    color="primary"
    item-color="primary"
    label="Purpose"
    :items="purposes"
    :item-props="itemProps"
    persistent-hint
    :error-messages="getErrorMessages(v$.internalValue)"
    variant="underlined"
    @blur="v$.internalValue.$touch()"
  />
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import { withFieldName } from '@/utils/validators'
import { getErrorMessages } from '@/utils'

export default {
  props: {
    modelValue: {
      type: String,
    },
    purposes: {
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
      internalValue: withFieldName('Purpose', {
        required,
      }),
    }
  },
  computed: {
    internalValue: {
      get () {
        return this.modelValue ?? ''
      },
      set (value) {
        this.$emit('update:modelValue', value)
      },
    },
  },
  methods: {
    itemProps (value) {
      return {
        value,
        subtitle: this.getPurposeDescription(value),
      }
    },
    getPurposeDescription (purpose) {
      switch (purpose) {
        case 'testing':
          return 'Testing clusters do not get a monitoring or a logging stack as part of their control planes'
        default:
          return ''
      }
    },
    getErrorMessages,
  },
}
</script>
