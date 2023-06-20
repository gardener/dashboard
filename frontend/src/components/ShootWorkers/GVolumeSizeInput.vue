<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-text-field
    :min="min"
    :color="color"
    v-model="innerValue"
    suffix="Gi"
    :label="label"
    type="number"
    @blur="emitBlur"
    :error-messages="errorMessages"
    variant="underlined"
  ></v-text-field>
</template>

<script>
import { defineComponent } from 'vue'
import { parseSize } from '@/utils'

export default defineComponent({
  props: ['modelValue', 'label', 'color', 'errorMessages', 'min'],
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
})
</script>
