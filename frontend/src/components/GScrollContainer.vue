<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    class="scroll-wrapper"
    :class="wrapperClasses"
    :style="cssVars"
  >
    <div
      ref="scrollRef"
      class="scrollable-container"
      :class="containerClasses"
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

const wrapperClasses = computed(() => ({
  'scroll-wrapper--vertical': direction.value === 'vertical',
  'scroll-wrapper--horizontal': direction.value === 'horizontal',
}))

const containerClasses = computed(() => ({
  'scrollable-container--vertical': direction.value === 'vertical',
  'scrollable-container--horizontal': direction.value === 'horizontal',
}))

const cssVars = computed(() => ({
  '--fadeOpacity': fadeOpacity.value,
  '--fadeSize': `${fadeSize.value}px`,
}))
</script>

<style scoped>
.scroll-wrapper {
  position: relative;
}

.scrollable-container--vertical {
  overflow-y: auto;
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

/* Vertical: bottom fade - on the non-scrolling wrapper */
.scroll-wrapper--vertical::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: var(--fadeSize);
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(var(--v-theme-surface)));
  pointer-events: none;
  opacity: var(--fadeOpacity);
  z-index: 1;
}

/* Horizontal: right fade - on the non-scrolling wrapper */
.scroll-wrapper--horizontal::after {
  content: "";
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: var(--fadeSize);
  background: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(var(--v-theme-surface)));
  pointer-events: none;
  opacity: var(--fadeOpacity);
  z-index: 1;
}
</style>
