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

import isEmpty from 'lodash/isEmpty'

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

watch(() => fieldData.value, () => {
  emit('update:modelValue', fieldData.value)
}, {
  deep: true,
})

watch(() => props.modelValue, value => {
  if (isEmpty(fieldData.value) && !isEmpty(value)) {
    // set initial data
    fieldData.value = value
  }
}, {
  immediate: true,
})

</script>
