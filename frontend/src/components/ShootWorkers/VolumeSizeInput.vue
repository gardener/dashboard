<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

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
        return parseSize(this.value)
      },
      set (value) {
        this.$emit('input', this.format(value))
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
