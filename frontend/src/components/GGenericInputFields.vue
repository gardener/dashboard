<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <component
    :is="wrapper"
    v-for="field in fields"
    :key="field.key"
    v-bind="wrapperProps"
  >
    <GGenericInputField
      v-model="fieldData[field.key]"
      :field="field"
      :cloud-profile-ref="cloudProfileRef"
      :input-props="inputProps"
    />
  </component>
</template>
<script setup>

import {
  watch,
  ref,
} from 'vue'

import GGenericInputField from '@/components/GGenericInputField'

import isEqual from 'lodash/isEqual'
import fromPairs from 'lodash/fromPairs'

const props = defineProps({
  fields: {
    type: Array,
  },
  modelValue: {
    type: Object,
    required: true,
  },
  wrapper: {
    type: String,
    default: 'div',
  },
  wrapperProps: {
    type: Object,
  },
  inputProps: {
    type: Object,
  },
  cloudProfileRef: {
    type: String,
  },
})

const emit = defineEmits([
  'update:modelValue',
])

const fieldData = ref({})

function defaultFieldData (fields = []) {
  return fromPairs(
    fields
      .filter(field => Object.prototype.hasOwnProperty.call(field, 'defaultValue'))
      .map(field => [field.key, field.defaultValue]),
  )
}

function initialFieldData (fields, value) {
  return {
    ...defaultFieldData(fields),
    ...(value ?? {}),
  }
}

watch(() => fieldData.value, value => {
  if (!isEqual(value, props.modelValue)) {
    emit('update:modelValue', value)
  }
}, {
  deep: true,
})

watch([() => props.fields, () => props.modelValue], ([fields, value]) => {
  const valueWithDefaults = initialFieldData(fields, value)
  if (!isEqual(fieldData.value, valueWithDefaults)) {
    fieldData.value = valueWithDefaults
  }
}, {
  immediate: true,
})

</script>
