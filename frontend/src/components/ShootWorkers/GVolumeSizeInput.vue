<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-text-field
    v-model="innerValue"
    :min="min"
    :color="color"
    suffix="Gi"
    :label="label"
    type="number"
    :error-messages="errorMessages"
    variant="underlined"
    @blur="emitBlur"
  />
</template>

<script>
import { parseSize } from '@/utils'

export default {
  props: {
    modelValue: {
      type: [String, Number],
    },
    label: {
      type: String,
    },
    color: {
      type: String,
    },
    errorMessages: {
      type: [String, Array],
    },
    min: {
      type: [String, Number],
    },
  },
  emits: [
    'update:modelValue',
    'blur',
  ],
  computed: {
    innerValue: {
      get () {
        if (this.modelValue) {
          return parseSize(this.modelValue)
        }
        return undefined
      },
      set (modelValue) {
        if (!modelValue) {
          this.$emit('update:modelValue', undefined)
        } else {
          this.$emit('update:modelValue', this.format(modelValue))
        }
      },
    },
  },
  methods: {
    format (modelValue) {
      return modelValue + 'Gi'
    },
    emitBlur (e) {
      this.$emit('blur', e)
    },
  },
}
</script>
