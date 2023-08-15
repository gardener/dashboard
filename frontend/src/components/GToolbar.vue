<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-toolbar
    flat
    :height="height"
    :class="[colorClass, backgroundColorClass]"
  >
    <slot name="prepend">
      <v-icon
        v-if="prependIcon"
        :icon="prependIcon"
        :color="color"
        :size="size"
        class="ml-4"
      />
    </slot>
    <v-toolbar-title
      class="font-weight-regular"
      :style="{
        fontSize,
      }"
    >
      <slot>{{ title }}</slot>
    </v-toolbar-title>
    <template v-if="slots.append">
      <slot name="append" />
    </template>
  </v-toolbar>
</template>

<script setup>
import {
  ref,
  computed,
  toRefs,
  useSlots,
} from 'vue'

const props = defineProps({
  title: {
    type: String,
  },
  prependIcon: {
    type: String,
  },
  size: {
    type: String,
    default: 'default',
    validator (value) {
      return ['x-small', 'small', 'default', 'large', 'x-large'].includes(value)
    },
  },
  height: {
    type: [String, Number],
  },
  fontSize: {
    type: [String, Number],
  },
})

const { title, size, prependIcon } = toRefs(props)
const color = ref('toolbar-title')
const colorClass = computed(() => {
  return `text-${color.value}`
})
const backgroundColor = ref('toolbar-background')
const backgroundColorClass = computed(() => {
  return `bg-${backgroundColor.value}`
})

const fontSize = computed(() => {
  if (props.fontSize) {
    return typeof props.fontSize === 'string'
      ? props.fontSize
      : `${props.fontSize}px`
  }
  const index = ['x-small', 'small', 'default', 'large', 'x-large'].indexOf(props.size)
  return index === -1
    ? '16px'
    : `${12 + 2 * index}px`
})

const height = computed(() => {
  if (props.height) {
    return props.height
  }
  const index = ['x-small', 'small', 'default', 'large', 'x-large'].indexOf(props.size)
  return index === -1
    ? 48
    : 32 + 8 * index
})

const slots = useSlots()
</script>
