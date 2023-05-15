<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-toolbar
    flat
    :density="density"
    :class="[colorClass, backgroundColorClass]"
  >
    <slot name="prepend">
      <v-icon v-if="prependIcon"
        :icon="prependIcon"
        :color="color"
        :size="iconSize"
        class="ml-5"
      />
    </slot>
    <v-toolbar-title :class="[fontClass]">
      <slot>{{ title }}</slot>
    </v-toolbar-title>
    <template v-if="slots.append">
      <v-spacer></v-spacer>
      <slot name="append"></slot>
    </template>
  </v-toolbar>
</template>

<script setup>
import { ref, computed, toRefs, useSlots } from 'vue'

const props = defineProps({
  title: {
    type: String,
  },
  density: {
    type: String,
    default: 'compact',
  },
  prependIcon: {
    type: String,
  },
})
const { title, prependIcon, density } = toRefs(props)
const color = ref('toolbar-title')
const colorClass = computed(() => {
  return `text-${color.value}`
})
const backgroundColor = ref('toolbar-background')
const backgroundColorClass = computed(() => {
  return `bg-${backgroundColor.value}`
})
const fontClass = computed(() => {
  switch (props.density) {
    case 'compact':
      return 'text-subtitle-1'
    case 'comfortable':
      return 'text-h6'
    default:
      return 'text-h5'
  }
})
const iconSize = computed(() => {
  switch (props.density) {
    case 'compact':
      return 'default'
    case 'comfortable':
      return 'large'
    default:
      return 'x-large'
  }
})
const slots = useSlots()
</script>
