<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    class="mx-0"
    :class="isTextBtn ? 'g-action-text-button' : 'g-action-button'"
  >
    <v-btn
      variant="text"
      :density="buttonDensity"
      :disabled="disabled"
      :[iconProp]="icon"
      :text="text"
      :color="color"
      :size="size"
      :to="to"
      :loading="loading"
      :width="isTextBtn ? '100%' : undefined"
      :class="{ 'text-none font-weight-regular justify-start': isTextBtn }"
      @click.stop.prevent="emit('click', $event)"
    />
    <v-tooltip
      v-if="hasTooltip"
      activator="parent"
      location="top"
      :disabled="tooltipDisabled"
    >
      <slot name="tooltip">
        {{ tooltip }}
      </slot>
    </v-tooltip>
  </div>
</template>

<script setup>
import {
  computed,
  toRefs,
  useSlots,
} from 'vue'

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
  },
  tooltip: {
    type: String,
  },
  tooltipDisabled: {
    type: Boolean,
    default: false,
  },
  to: {
    type: [Object, String],
  },
  loading: {
    type: Boolean,
  },
})

const emit = defineEmits([
  'click',
])

const { disabled, icon, text, color, size, tooltip, to } = toRefs(props)

const hasTooltip = computed(() => {
  return !!slots.tooltip || !!tooltip.value
})

const isTextBtn = computed(() => {
  return !!props.text
})

const iconProp = computed(() => {
  return isTextBtn.value ? 'prepend-icon' : 'icon'
})

const buttonDensity = computed(() => {
  const defaultDensity = isTextBtn.value
    ? 'default'
    : 'comfortable'
  return props.density
    ? props.density
    : defaultDensity
})

</script>

<style>
.g-action-button {
  width: fit-content !important;
}

.g-action-text-button {
  width: 100% !important;
}
</style>
