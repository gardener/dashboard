<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-tooltip location="top">
    <template #activator="{ props: tooltipProps }">
      <v-text-field
        v-bind="tooltipProps"
        :model-value="modelValue"
        prepend-inner-icon="mdi-magnify"
        color="primary"
        label="Search"
        single-line
        hide-details
        variant="solo"
        flat
        clearable
        clear-icon="mdi-close"
        density="compact"
        class="g-table-search-field mr-3"
        @update:model-value="$emit('update:modelValue', $event)"
        @keyup.esc="$emit('update:modelValue', '')"
      />
    </template>
    Search terms are <span class="font-weight-bold">ANDed</span>.<br>
    <span class="font-weight-bold">Use quotes</span> for exact words or phrases:
    <v-chip
      v-for="(example, index) in examples"
      :key="`example-${index}`"
      label
      color="primary"
      variant="flat"
      size="small"
      :class="index < examples.length - 1 ? 'mr-1' : ''"
    >
      "{{ example }}"
    </v-chip>
    <br>
    <span class="font-weight-bold">Use minus sign</span>
    to exclude words that you don't want:
    <v-chip
      v-for="(example, index) in excludeExamples"
      :key="`exclude-${index}`"
      label
      color="primary"
      variant="flat"
      size="small"
      :class="index < excludeExamples.length - 1 ? 'mr-1' : ''"
    >
      -{{ example.startsWith('"') ? example : `"${example}"` }}
    </v-chip>
    <br>
  </v-tooltip>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  examples: {
    type: Array,
    default: () => ['example1', 'example2'],
  },
  excludeExamples: {
    type: Array,
    default: () => ['exclude1', 'exclude2'],
  },
})

defineEmits(['update:modelValue'])
</script>
