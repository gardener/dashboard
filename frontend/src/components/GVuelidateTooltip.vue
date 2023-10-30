<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    location="top"
    :disabled="!v$.$invalid"
    open-delay="0"
  >
    <template #activator="{ props: activatorProps }">
      <div
        v-bind="activatorProps"
        @mouseover="v$.$validate()"
      >
        <slot />
      </div>
    </template>
    <div class="font-weight-bold">
      There are input errors that you need to resolve
    </div>
    <div
      v-for="(err, i) in validationErrorTooltip"
      :key="`${err.message}_${i}`"
    >
      <span class="font-weight-bold">{{ err.causer }}:</span>
      {{ err.message }}
    </div>
  </v-tooltip>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  v$: {
    type: Object,
  },
})
const validationErrorTooltip = computed(() => {
  const errorMessages = []
  if (props.v$.$errors) {
    props.v$.$errors.forEach(error => {
      errorMessages.push({
        causer: error.$params.causer ? error.$params.causer : error.$propertyPath,
        message: error.$message,
      })
    })
  }
  return errorMessages
})
</script>
