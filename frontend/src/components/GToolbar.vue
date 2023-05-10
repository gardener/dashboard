<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-toolbar
    flat
    :density="density"
    class="bg-toolbar-background"
  >
    <slot name="prepend">
      <v-icon v-if="prependIcon"
        :icon="prependIcon"
        color="toolbar-title"
      />
    </slot>
    <v-toolbar-title class="text-subtitle-1 text-toolbar-title">
      <slot>{{ title }}</slot>
    </v-toolbar-title>
    <template v-if="slots.append">
      <v-spacer></v-spacer>
      <slot name="append"></slot>
    </template>
  </v-toolbar>
</template>

<script setup>
import { useSlots, toRefs } from 'vue'

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

const slots = useSlots()
</script>
