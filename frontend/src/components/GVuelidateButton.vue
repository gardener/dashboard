<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    location="top"
    :disabled="!hasVisibleErrors"
  >
    <template #activator="{ props: activatorProps }">
      <div
        v-bind="activatorProps"
      >
        <v-btn
          v-bind="$attrs"
          :disabled="disabled || (v.$invalid && hasVisibleErrors)"
          @click="onClick"
        >
          <slot />
        </v-btn>
      </div>
    </template>
    <div class="font-weight-bold">
      There are input errors that you need to resolve
    </div>
    <div
      v-for="(err, i) in errorMessages"
      :key="`${err.message}_${i}`"
    >
      <span class="font-weight-bold">{{ err.fieldName }}:</span>
      {{ err.message }}
    </div>
  </v-tooltip>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  v: {
    type: Object,
  },
  disabled: {
    type: Boolean,
  },
})

const emit = defineEmits([
  'click',
  'errorMessagesUpdated',
])

const errorMessages = computed(() => {
  const errorMessages = []
  if (props.v.$errors) {
    props.v.$errors.forEach(error => {
      errorMessages.push({
        fieldName: error.$params.fieldName ? error.$params.fieldName : error.$propertyPath,
        message: error.$message,
      })
    })
  }
  return errorMessages
})

const hasVisibleErrors = computed(() => {
  return props.v.$errors.length > 0
})

const onClick = async (e) => {
  if (props.v.$invalid) {
    await props.v.$validate()
    if (hasVisibleErrors.value) {
      const messages = errorMessages.value.map(msg => `${msg.fieldName}: ${msg.message}`).join(', ')
      emit('errorMessagesUpdated', messages)
    }
  } else {
    emit('click', e)
  }
}

</script>
