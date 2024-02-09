<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-select
    v-model="internalValue"
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
  data () {
    return {
      valid: undefined,
      lazyValue: this.modelValue,
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
        return this.lazyValue
      },
      set (value) {
        this.lazyValue = value ?? ''
        this.v$.internalValue.$touch()
        this.$emit('update:modelValue', this.lazyValue)
      },
    },
  },
  watch: {
    modelValue (value) {
      if (!value) {
        this.lazyValue = ''
        this.v$.internalValue.$touch()
      } else if (this.lazyValue !== value) {
        this.lazyValue = value
      }
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
