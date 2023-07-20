<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <transition-group :name="animationName">
    <slot />
  </transition-group>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
})

const animationName = computed(() => {
  return props.disabled ? '' : 'g-list'
})

</script>

<style>
.g-list-enter-active,
.g-list-leave-active {
  transition: all 0.5s;
  overflow: hidden;
}

.g-list-enter-from {
  max-height: 0px;
}

.g-list-enter-to,
.g-list-leave-from {
  max-height: 200vh;
}

.g-list-leave-to {
  max-height: 0px;
}
</style>
