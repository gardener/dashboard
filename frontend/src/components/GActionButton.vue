<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="g-action-button">
    <v-btn
      variant="text"
      :density="density"
      :disabled="disabled"
      :icon="icon"
      :text="text"
      :color="color"
      :size="size"
      :to="to"
      @click.stop.prevent="emit('click', $event)"
    />
    <v-tooltip v-if="hasTooltip"
      activator="parent"
      location="top"
    >
      <slot name="tooltip">
        {{ tooltip }}
      </slot>
    </v-tooltip>
  </div>
</template>

<script setup>
import { computed, toRefs, useSlots } from 'vue'

const slots = useSlots()

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
  density: {
    type: String,
    default: 'comfortable',
  },
  tooltip: {
    type: String,
  },
  to: {
    type: [Object, String],
  },
})

const emit = defineEmits([
  'click',
])

const { disabled, icon, text, color, size, tooltip, to } = toRefs(props)

const hasTooltip = computed(() => {
  return !!slots.tooltip || !!tooltip.value
})
</script>
