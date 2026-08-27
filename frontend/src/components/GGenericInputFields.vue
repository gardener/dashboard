<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <component
    :is="wrapper"
    v-for="field in fields"
    :key="field.key"
    v-bind="wrapperProps"
  >
    <g-generic-input-field
      v-model="fieldData[field.key]"
      :field="field"
      :input-props="inputProps"
    />
  </component>
</template>

<script setup>
import {
  ref,
  watch,
} from 'vue'

import GGenericInputField from '@/components/GGenericInputField'

import cloneDeep from 'lodash/cloneDeep'
import fromPairs from 'lodash/fromPairs'
import isEqual from 'lodash/isEqual'

const props = defineProps({
  fields: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: Object,
    required: true,
  },
  wrapper: {
    type: [String, Object],
    default: 'div',
  },
  wrapperProps: {
    type: Object,
  },
  inputProps: {
    type: Object,
  },
})

const emit = defineEmits([
  'update:modelValue',
])

const fieldData = ref({})

function defaultFieldData (fields) {
  return fromPairs(
    fields
      .filter(field => Object.prototype.hasOwnProperty.call(field, 'defaultValue'))
      .map(field => [field.key, cloneDeep(field.defaultValue)]),
  )
}

function initialFieldData (fields, value) {
  return {
    ...defaultFieldData(fields),
    ...(value ?? {}),
  }
}

watch(fieldData, value => {
  if (!isEqual(value, props.modelValue)) {
    emit('update:modelValue', value)
  }
}, {
  deep: true,
})

watch(() => props.modelValue, value => {
  const valueWithDefaults = initialFieldData(props.fields, value)
  if (!isEqual(fieldData.value, valueWithDefaults)) {
    fieldData.value = valueWithDefaults
  }
}, {
  immediate: true,
})
</script>
