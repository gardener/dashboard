<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="internalValue"
    :disabled="isDisabled"
    :toolbar-title="toolbarTitle"
    :toolbar-color="color"
  >
    <template #activator="{ props: activatorProps }">
      <v-chip
        v-if="failureToleranceType"
        v-bind="activatorProps"
        variant="tonal"
        :size="size"
        :color="color"
        :class="['cursor-pointer', chipClass]"
      >
        {{ failureToleranceTypeLabel }}
      </v-chip>
    </template>
    <g-list
      class="text-left"
      style="min-width: 300px"
    >
      <g-list-item>
        <template #prepend>
          <v-icon
            icon="mdi-information-outline"
            color="primary"
          />
        </template>
        <g-list-item-content label="Failure Tolerance Type">
          <code>{{ failureToleranceType }}</code>
        </g-list-item-content>
      </g-list-item>
      <slot />
    </g-list>
  </g-popover>
</template>

<script setup>
import {
  computed,
  inject,
  ref,
} from 'vue'

const props = defineProps({
  popoverKey: {
    type: String,
    required: true,
  },
  failureToleranceType: {
    type: String,
    required: false,
  },
  toolbarTitle: {
    type: String,
    default: 'High Availability',
  },
  size: {
    type: [String, Number],
    default: undefined,
  },
  color: {
    type: String,
    default: 'primary',
  },
  chipClass: {
    type: [String, Array, Object],
    default: undefined,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const activePopoverKey = inject('activePopoverKey', ref(''))

const failureToleranceTypeLabels = Object.freeze({
  node: 'Node',
  zone: 'Zone',
})

const failureToleranceTypeLabel = computed(() => {
  return failureToleranceTypeLabels[props.failureToleranceType] ?? props.failureToleranceType
})

const isDisabled = computed(() => {
  return props.disabled || !props.failureToleranceType
})

const internalValue = computed({
  get () {
    return activePopoverKey.value === props.popoverKey
  },
  set (value) {
    activePopoverKey.value = value ? props.popoverKey : ''
  },
})
</script>
