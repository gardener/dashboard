<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    ref="containerRef"
    class="d-flex flex-nowrap justify-start"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @mousemove="onMouseMove"
  >
    <g-status-tag
      v-for="condition in conditions"
      :key="condition.type"
      :condition="condition"
      :popper-placement="popperPlacement"
      :shoot-binding="shootCloudProviderBinding"
      :shoot-metadata="shootMetadata"
      :stale-shoot="isStaleShoot"
      :container-hovered="hovered"
    />
  </div>
  <template v-if="showStatusText">
    <div
      v-for="({ description, link }) in errorCodeObjects"
      :key="description"
      class="mt-1"
    >
      <div class="font-weight-bold text-error wrap-text">
        {{ description }}
      </div>
      <div v-if="link">
        <g-external-link
          :url="link.url"
          class="font-weight-bold text-error"
        >
          {{ link.text }}
        </g-external-link>
      </div>
    </div>
  </template>
</template>

<script setup>
import {
  computed,
  ref,
  onBeforeUnmount,
  toRefs,
} from 'vue'

import { useShootStore } from '@/store/shoot'

import GStatusTag from '@/components/GStatusTag.vue'
import GExternalLink from '@/components/GExternalLink.vue'

import { useShootItem } from '@/composables/useShootItem'
import { useStatusConditions } from '@/composables/useStatusConditions'

const props = defineProps({
  popperPlacement: {
    type: String,
  },
  showStatusText: {
    type: Boolean,
    default: false,
  },
})
const {
  popperPlacement,
  showStatusText,
} = toRefs(props)

const {
  shootCloudProviderBinding,
  shootMetadata,
  shootUid,
  shootReadiness,
} = useShootItem()

const shootStore = useShootStore()

const { conditions, errorCodeObjects } = useStatusConditions(shootReadiness)

const isStaleShoot = computed(() => {
  return !shootStore.isShootActive(shootUid.value)
})

const EDGE_THRESHOLD = 12
const SCROLL_STEP = 2

const containerRef = ref(null)
const hovered = ref(false)
let collapseTimer = null
let animationFrameId = null
let scrollDirection = 0

function getScrollContainer () {
  return containerRef.value?.closest('.scroll-x') ?? null
}

function stopAutoScroll () {
  scrollDirection = 0
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

function autoScroll () {
  const scrollContainer = getScrollContainer()
  if (!scrollContainer || !scrollDirection) {
    stopAutoScroll()
    return
  }

  const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth
  if (maxScrollLeft <= 0) {
    stopAutoScroll()
    return
  }

  const nextScrollLeft = Math.min(
    maxScrollLeft,
    Math.max(0, scrollContainer.scrollLeft + (scrollDirection * SCROLL_STEP)),
  )

  if (nextScrollLeft === scrollContainer.scrollLeft) {
    stopAutoScroll()
    return
  }

  scrollContainer.scrollLeft = nextScrollLeft
  animationFrameId = window.requestAnimationFrame(autoScroll)
}

function startAutoScroll (direction) {
  if (!direction) {
    stopAutoScroll()
    return
  }
  if (scrollDirection === direction && animationFrameId) {
    return
  }

  stopAutoScroll()
  scrollDirection = direction
  animationFrameId = window.requestAnimationFrame(autoScroll)
}

function onMouseEnter () {
  clearTimeout(collapseTimer)
  hovered.value = true
}

function onMouseMove (event) {
  const scrollContainer = getScrollContainer()
  if (!scrollContainer) {
    return
  }

  const { left, right } = scrollContainer.getBoundingClientRect()
  const isNearLeftEdge = event.clientX - left <= EDGE_THRESHOLD
  const isNearRightEdge = right - event.clientX <= EDGE_THRESHOLD

  if (isNearLeftEdge && scrollContainer.scrollLeft > 0) {
    startAutoScroll(-1)
    return
  }

  const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth
  if (isNearRightEdge && scrollContainer.scrollLeft < maxScrollLeft) {
    startAutoScroll(1)
    return
  }

  stopAutoScroll()
}

function onMouseLeave () {
  stopAutoScroll()
  const scrollContainer = getScrollContainer()
  collapseTimer = setTimeout(() => {
    hovered.value = false
    scrollContainer?.scrollTo({
      left: 0,
      behavior: 'smooth',
    })
  }, 1500)
}

onBeforeUnmount(() => {
  clearTimeout(collapseTimer)
  stopAutoScroll()
})
</script>
