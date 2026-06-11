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
  nextTick,
  onMounted,
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
  pinWidth: {
    type: Boolean,
    default: false,
  },
})

const scrollRef = ref(null)
const pinnedWidth = ref(null)
const { x, y } = useScroll(scrollRef)
const { width, height } = useElementSize(scrollRef)

const isVertical = computed(() => props.direction === 'y')

const fadeLength = computed(() => {
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

  return Math.min(fadeLength.value, Math.max(0, remaining))
})

const containerStyle = computed(() => {
  const style = {}

  if (pinnedWidth.value !== null) {
    const width = `${pinnedWidth.value}px`
    style.width = width
    style.minWidth = width
    style.maxWidth = width
  }

  if (fadeSize.value <= 0) {
    return style
  }

  const gradientDir = isVertical.value ? 'to bottom' : 'to right'
  const mask = `linear-gradient(${gradientDir}, black calc(100% - ${fadeSize.value}px), transparent)`
  style.maskImage = mask
  style.WebkitMaskImage = mask
  return style
})

const directionClass = computed(() => {
  return isVertical.value ? 'scroll-y' : 'scroll-x'
})

onMounted(async () => {
  if (!props.pinWidth) {
    return
  }

  await nextTick()
  const width = scrollRef.value?.getBoundingClientRect().width
  if (width > 0) {
    pinnedWidth.value = Math.ceil(width)
  }
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
