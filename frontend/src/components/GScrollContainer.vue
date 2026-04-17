<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    ref="scrollRef"
    class="scrollable-container"
    :class="[directionClass, { 'hide-scrollbar': hideScrollbar }]"
    :style="containerStyle"
  >
    <slot />
  </div>
</template>

<script setup>
import {
  ref,
  computed,
} from 'vue'
import {
  useScroll,
  useElementSize,
} from '@vueuse/core'

const props = defineProps({
  direction: {
    type: String,
    default: 'y',
    validator: v => ['x', 'y'].includes(v),
  },
  hideScrollbar: {
    type: Boolean,
    default: false,
  },
})

const scrollRef = ref(null)
const { x, y } = useScroll(scrollRef)
const { width, height } = useElementSize(scrollRef)

const isVertical = computed(() => props.direction === 'y')

const fadeHeight = computed(() => {
  const size = isVertical.value ? height.value : width.value
  return Math.max(40, size / 2)
})

const fadeSize = computed(() => {
  const el = scrollRef.value
  if (!el) {
    return 0
  }

  const remaining = isVertical.value
    ? el.scrollHeight - (y.value + height.value)
    : el.scrollWidth - (x.value + width.value)

  return Math.min(fadeHeight.value, Math.max(0, remaining))
})

const containerStyle = computed(() => {
  if (fadeSize.value <= 0) {
    return {}
  }

  const gradientDir = isVertical.value ? 'to bottom' : 'to right'
  const mask = `linear-gradient(${gradientDir}, black calc(100% - ${fadeSize.value}px), transparent)`
  return {
    maskImage: mask,
    WebkitMaskImage: mask,
  }
})

const directionClass = computed(() => {
  return isVertical.value ? 'scroll-y' : 'scroll-x'
})
</script>

<style scoped>
.scroll-y {
  overflow-y: auto;
}

.scroll-x {
  overflow-x: auto;
}

.scroll-x :slotted(*) {
  min-width: max-content;
}

.hide-scrollbar {
  scrollbar-width: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
