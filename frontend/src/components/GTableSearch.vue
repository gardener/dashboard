<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div
    class="g-table-search-field"
    :class="{ fluid }"
  >
    <v-tooltip
      location="top"
      :open-on-focus="false"
      :open-delay="500"
    >
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
  </div>
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
  fluid: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.fluid {
  min-width: 0;
  max-width: none;
  width: 100%;
}
</style>
