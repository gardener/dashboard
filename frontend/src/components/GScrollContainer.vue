<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    class="scroll-wrapper"
    :class="wrapperClasses"
  >
    <div
      ref="scrollRef"
      class="scrollable-container"
      :class="containerClasses"
      :style="maskStyle"
    >
      <div
        ref="contentRef"
        class="scrollable-content"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  toRefs,
} from 'vue'
import {
  useScroll,
  useElementSize,
} from '@vueuse/core'

const props = defineProps({
  direction: {
    type: String,
    default: 'vertical',
    validator: value => ['vertical', 'horizontal'].includes(value),
  },
})

const { direction } = toRefs(props)

const scrollRef = ref(null)
const contentRef = ref(null)
const { x, y } = useScroll(scrollRef)
const { width, height } = useElementSize(scrollRef)
const { width: contentWidth, height: contentHeight } = useElementSize(contentRef)

const fadeSize = computed(() => {
  if (direction.value === 'horizontal') {
    return Math.max(20, width.value / 4)
  }
  return Math.max(40, height.value / 2)
})

const fadeOpacity = computed(() => {
  const el = scrollRef.value
  if (!el) {
    return 0
  }

  if (direction.value === 'horizontal') {
    const remainingX = contentWidth.value - (x.value + width.value)
    if (remainingX <= 0) {
      return 0
    }
    if (remainingX >= fadeSize.value) {
      return 1
    }
    return remainingX / fadeSize.value
  }

  const remainingY = contentHeight.value - (y.value + height.value)
  if (remainingY <= 0) {
    return 0
  }
  if (remainingY >= fadeSize.value) {
    return 1
  }
  return remainingY / fadeSize.value
})

const maskStyle = computed(() => {
  if (fadeOpacity.value <= 0) {
    return {}
  }

  const effectiveFadeSize = Math.round(fadeSize.value * fadeOpacity.value)

  if (direction.value === 'horizontal') {
    const gradient = `linear-gradient(to right, black 0, black calc(100% - ${effectiveFadeSize}px), transparent 100%)`
    return {
      maskImage: gradient,
      WebkitMaskImage: gradient,
    }
  }

  const gradient = `linear-gradient(to bottom, black 0, black calc(100% - ${effectiveFadeSize}px), transparent 100%)`
  return {
    maskImage: gradient,
    WebkitMaskImage: gradient,
  }
})

const wrapperClasses = computed(() => ({
  'scroll-wrapper--vertical': direction.value === 'vertical',
  'scroll-wrapper--horizontal': direction.value === 'horizontal',
}))

const containerClasses = computed(() => ({
  'scrollable-container--vertical': direction.value === 'vertical',
  'scrollable-container--horizontal': direction.value === 'horizontal',
}))
</script>

<style scoped>
.scroll-wrapper {
  position: relative;
  overflow: hidden;
}

.scrollable-container--vertical {
  overflow-y: auto;
  max-height: inherit;
}

.scrollable-container--horizontal {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.scrollable-container--horizontal::-webkit-scrollbar {
  display: none;
}

.scrollable-container--horizontal > .scrollable-content {
  display: inline-flex;
  white-space: nowrap;
}
</style>
