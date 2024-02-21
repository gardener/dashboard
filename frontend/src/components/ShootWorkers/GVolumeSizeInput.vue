<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex">
    <v-select
      v-if="!hasVolumeTypes"
      v-model="storageKind"
      :color="color"
      label="Volume"
      variant="underlined"
      :items="storageKindItems"
      class="mr-1"
      @blur="emitBlur"
      @update:model-value="onInputStorageKind"
    />
    <v-text-field
      v-if="hasVolumeTypes || customStorageSize"
      ref="volumeSize"
      v-model="innerValue"
      :min="min"
      :color="color"
      suffix="Gi"
      label="Volume Size"
      type="number"
      :error-messages="errorMessages"
      variant="underlined"
      style="maxWidth: 80px"
      @blur="emitBlur"
    />
  </div>
</template>

<script>
import { parseSize } from '@/utils'

export default {
  props: {
    modelValue: {
      type: [String, Number],
    },
    customStorageSize: {
      type: Boolean,
      default: false,
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
    defaultStorageSize: {
      type: [String, Number],
    },
    hasVolumeTypes: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'update:modelValue',
    'update:customStorageSize',
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
    storageKind: {
      get () {
        return this.customStorageSize ? 'custom' : 'default'
      },
      set (value) {
        if (value === 'custom') {
          this.$emit('update:customStorageSize', true)
        } else {
          this.$emit('update:customStorageSize', false)
        }
      },
    },
    storageKindItems () {
      return [
        {
          title: this.defaultStorageSize ? `default (${this.defaultStorageSize})` : 'default',
          value: 'default',
        },
        {
          title: 'custom',
          key: 'custom',
        },
      ]
    },
  },
  methods: {
    format (modelValue) {
      return modelValue + 'Gi'
    },
    emitBlur (e) {
      this.$emit('blur', e)
    },
    onInputStorageKind () {
      this.innerValue = undefined
      this.$nextTick(() => this.$refs.volumeSize?.focus())
    },
  },
}
</script>
