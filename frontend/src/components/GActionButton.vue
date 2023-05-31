<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip location="top" :disabled="!this.$slots.tooltip">
    <template #activator="{ props }">
      <div v-bind="props" class="mx-1">
        <v-btn
          density="compact"
          variant="text"
          :disabled="disabled"
          :icon="icon"
          :text="text"
          :color="color"
          :size="size"
          @click.stop="emit('click')"
        >
        </v-btn>
      </div>
    </template>
    <slot name="tooltip" />
  </v-tooltip>
</template>

<script setup>
import { toRefs } from 'vue'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  icon: {
    type: [String, Boolean],
    default: false,
  },
  text: {
    type: String,
    default: undefined,
  },
  color: {
    type: String,
    default: 'action-button',
  },
  size: {
    type: String,
  },
})

const emit = defineEmits([
  'click',
])

const { disabled, icon, text, color, size } = toRefs(props)
</script>
