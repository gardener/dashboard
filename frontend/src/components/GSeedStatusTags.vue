<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    ref="containerRef"
    class="d-flex flex-nowrap justify-start"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @mousemove="onMouseMove"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <g-seed-status-tag
      v-for="condition in conditions"
      :key="condition.type"
      :seed-name="seedName"
      :condition="condition"
      :popper-placement="popperPlacement"
      :identifier="identifier"
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
  inject,
  ref,
  watch,
  onBeforeUnmount,
  toRefs,
} from 'vue'

import GSeedStatusTag from '@/components/GSeedStatusTag.vue'
import GExternalLink from '@/components/GExternalLink.vue'

import { useManagedSeedShoot } from '@/composables/useManagedSeedShootForSeed'
import { useSeedEffectiveConditions } from '@/composables/useSeedEffectiveConditions'
import { useSeedItem } from '@/composables/useSeedItem/index'
import { useStatusConditions } from '@/composables/useStatusConditions'

const props = defineProps({
  popperPlacement: {
    type: String,
  },
  showStatusText: {
    type: Boolean,
    default: false,
  },
  identifier: {
    type: String,
    required: true,
  },
  isStaleShoot: {
    type: Boolean,
    default: false,
  },
})
const {
  popperPlacement,
  showStatusText,
  identifier,
  isStaleShoot,
} = toRefs(props)

const {
  seedName,
  seedConditions,
} = useSeedItem()

const {
  managedSeedShootConditions,
} = useManagedSeedShoot()

const effectiveConditions = useSeedEffectiveConditions(seedConditions, managedSeedShootConditions)

const {
  conditions,
  errorCodeObjects,
} = useStatusConditions(effectiveConditions)

const activePopoverKey = inject('activePopoverKey', ref(''))
const popoverOpenInContainer = computed(() => {
  const key = activePopoverKey.value
  if (!key) {
    return false
  }
  const id = identifier.value
  return id ? key.startsWith('g-seed-status-tag[') && key.endsWith(`:${id}`) : false
})

const EDGE_THRESHOLD = 12
const SCROLL_STEP = 2
const COLLAPSE_DELAY = 3_000

const containerRef = ref(null)
const hovered = ref(false)
const pointerInside = ref(false)
const focusInside = ref(false)
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
  pointerInside.value = true
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

function scheduleCollapse () {
  clearTimeout(collapseTimer)
  if (pointerInside.value || focusInside.value || popoverOpenInContainer.value) {
    return
  }
  const scrollContainer = getScrollContainer()
  collapseTimer = setTimeout(() => {
    hovered.value = false
    scrollContainer?.scrollTo({
      left: 0,
      behavior: 'smooth',
    })
  }, COLLAPSE_DELAY)
}

function onMouseLeave () {
  stopAutoScroll()
  pointerInside.value = false
  scheduleCollapse()
}

function scrollFocusedIntoView (target) {
  const scrollContainer = getScrollContainer()
  if (!scrollContainer || !(target instanceof Element)) {
    return
  }

  const containerRect = scrollContainer.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()

  if (targetRect.left < containerRect.left) {
    scrollContainer.scrollLeft -= containerRect.left - targetRect.left + EDGE_THRESHOLD
  } else if (targetRect.right > containerRect.right) {
    scrollContainer.scrollLeft += targetRect.right - containerRect.right + EDGE_THRESHOLD
  }
}

function onFocusIn (event) {
  if (!event.target?.matches?.(':focus-visible')) {
    return
  }
  clearTimeout(collapseTimer)
  focusInside.value = true
  hovered.value = true
  // wait for chip expand transition (0.3s) before scrolling
  const target = event.target
  setTimeout(() => scrollFocusedIntoView(target), 320)
}

function onFocusOut (event) {
  // collapse only when focus leaves the container entirely
  if (containerRef.value?.contains(event.relatedTarget)) {
    return
  }
  focusInside.value = false
  scheduleCollapse()
}

watch(popoverOpenInContainer, open => {
  if (open) {
    clearTimeout(collapseTimer)
    hovered.value = true
  } else {
    scheduleCollapse()
  }
})

onBeforeUnmount(() => {
  clearTimeout(collapseTimer)
  stopAutoScroll()
})
</script>
