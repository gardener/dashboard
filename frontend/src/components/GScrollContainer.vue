<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    ref="scrollRef"
    class="scrollable-container"
    :style="{ '--fadeOpacity': fadeOpacity, '--fadeHeight': `${fadeHeight}px` }"
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

const scrollRef = ref(null)
const { y } = useScroll(scrollRef)
const { height } = useElementSize(scrollRef)

const fadeHeight = Math.max(40, height.value / 2)

const fadeOpacity = computed(() => {
  const el = scrollRef.value
  if (!el) {
    return false
  }

  const remainingY = el.scrollHeight - (y.value + height.value)
  if (remainingY >= fadeHeight) {
    return 1
  }

  return remainingY / fadeHeight
})

</script>

<style scoped>
.scrollable-container {
  overflow-y: auto;
}

.scrollable-container::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: var(--fadeHeight);
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(var(--v-theme-surface)));
  pointer-events: none;
  opacity: var(--fadeOpacity);
}

</style>
