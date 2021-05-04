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
    >
  </v-text-field>
</template>

<script>
import { parseSize } from '@/utils'

export default {
  props: ['value', 'label', 'color', 'errorMessages', 'min'],
  computed: {
    innerValue: {
      get () {
        if (this.value) {
          return parseSize(this.value)
        }
        return undefined
      },
      set (value) {
        if (!value) {
          this.$emit('input', undefined)
        } else {
          this.$emit('input', this.format(value))
        }
      }
    }
  },
  methods: {
    format (value) {
      return value + 'Gi'
    },
    emitBlur (e) {
      this.$emit('blur', e)
    }
  }
}
</script>
