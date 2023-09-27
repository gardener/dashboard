<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="slots.label || props.label"
    class="text-body-2 text-medium-emphasis pb-1"
  >
    <slot name="label">
      {{ props.label }}
    </slot>
  </div>
  <div class="text-body-1">
    <slot />
  </div>
  <div
    v-if="slots.description || props.description"
    class="text-body-2 text-high-emphasis pt-1"
    :class="descriptionClass"
  >
    <slot name="description">
      {{ props.description }}
    </slot>
  </div>
</template>

<script setup>
import { useSlots } from 'vue'

const slots = useSlots()

const props = defineProps({
  label: {
    type: String,
  },
  description: {
    type: String,
  },
  descriptionClass: {
    type: String,
  },
})
</script>
