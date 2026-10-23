//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  triggerRef,
  watch,
} from 'vue'
import {
  useEventListener,
  useResizeObserver,
} from '@vueuse/core'

import {
  getOffsetWithin,
  getRevealScrollTop,
  getScrollTop,
  getViewportHeight,
  isDocumentScroller,
  scrollTo,
} from '@/utils/scroll'

function getScrollParent (element) {
  for (let parent = element?.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent)
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent
    }
  }
  return document.scrollingElement ?? document.documentElement
}

function lowerBound (values, value, start = 0) {
  let low = start
  let high = values.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (values.at(middle) < value) {
      low = middle + 1
    } else {
      high = middle
    }
  }
  return low
}

/**
 * Keyed variable-height virtualization for animated, mutable lists.
 *
 * Unlike Vuetify's v-virtual-scroll, measurements survive array changes, range
 * updates are synchronous, and items can stay rendered while they animate.
 * Keys must be stable, listRef must live inside a scroll container, and
 * measureElement must be bound as each item's function ref.
 */
export function useKeyedVirtualList ({
  items,
  getKey,
  estimateSize,
  overscan = 200,
}) {
  const listRef = shallowRef()
  const scrollContainer = shallowRef()
  const viewportScrollTop = shallowRef(0)
  const viewportHeight = shallowRef(window.innerHeight)
  const listOffsetTop = shallowRef(0)
  const pinnedKeys = shallowRef(new Set())
  const measuredSizes = shallowRef(new Map())
  const elementsByKey = new Map()
  const keysByElement = new WeakMap()
  let itemResizeObserver
  let viewportAnimationFrame

  const itemList = computed(() => toValue(items))
  const scrollEventTarget = computed(() => isDocumentScroller(scrollContainer.value)
    ? window
    : scrollContainer.value)
  const offsets = computed(() => {
    const values = [0]
    const sizes = measuredSizes.value
    for (const item of itemList.value) {
      const key = getKey(item)
      values.push(values.at(-1) + (sizes.get(key) ?? estimateSize(item)))
    }
    return values
  })

  const visibleRange = computed(() => {
    const values = offsets.value
    const count = itemList.value.length
    const relativeTop = Math.max(0, viewportScrollTop.value - listOffsetTop.value - overscan)
    const relativeBottom = Math.max(
      0,
      viewportScrollTop.value - listOffsetTop.value + viewportHeight.value + overscan,
    )

    return {
      start: Math.min(count, lowerBound(values, relativeTop, 1) - 1),
      end: Math.min(count, lowerBound(values, relativeBottom, 1)),
    }
  })

  const pinnedRange = computed(() => {
    let start = itemList.value.length
    let end = 0
    for (const [index, item] of itemList.value.entries()) {
      if (pinnedKeys.value.has(getKey(item))) {
        start = Math.min(start, index)
        end = Math.max(end, index + 1)
      }
    }
    return { start, end }
  })

  const rangeStart = computed(() => Math.min(visibleRange.value.start, pinnedRange.value.start))
  const rangeEnd = computed(() => Math.max(visibleRange.value.end, pinnedRange.value.end))

  const virtualItems = computed(() => itemList.value
    .slice(rangeStart.value, rangeEnd.value)
    .map((item, offset) => ({
      item,
      index: rangeStart.value + offset,
      key: getKey(item),
    })))

  const paddingTop = computed(() => offsets.value[rangeStart.value] ?? 0)
  const paddingBottom = computed(() => {
    const values = offsets.value
    return (values.at(-1) ?? 0) - (values[rangeEnd.value] ?? 0)
  })

  function updateViewportMetrics () {
    const container = scrollContainer.value
    const list = listRef.value
    if (!container || !list) {
      return
    }

    viewportScrollTop.value = getScrollTop(container)
    viewportHeight.value = getViewportHeight(container) || window.innerHeight
    listOffsetTop.value = getOffsetWithin(container, list)
  }

  function scheduleViewportUpdate () {
    if (viewportAnimationFrame !== undefined) {
      return
    }
    viewportAnimationFrame = window.requestAnimationFrame(() => {
      viewportAnimationFrame = undefined
      updateViewportMetrics()
    })
  }

  function measureElement (key, element) {
    const previousElement = elementsByKey.get(key)
    if (previousElement === element) {
      return
    }
    if (previousElement) {
      itemResizeObserver?.unobserve(previousElement)
      keysByElement.delete(previousElement)
      elementsByKey.delete(key)
    }
    if (!element) {
      return
    }

    const previousKey = keysByElement.get(element)
    if (previousKey !== undefined && previousKey !== key) {
      elementsByKey.delete(previousKey)
    }
    elementsByKey.set(key, element)
    keysByElement.set(element, key)
    itemResizeObserver?.observe(element)
  }

  function recordMeasurements (entries) {
    const sizes = measuredSizes.value
    let changed = false
    for (const entry of entries) {
      const key = keysByElement.get(entry.target)
      const borderBoxSize = Array.isArray(entry.borderBoxSize)
        ? entry.borderBoxSize[0]
        : entry.borderBoxSize
      const size = borderBoxSize?.blockSize ?? entry.target.offsetHeight
      if (key === undefined || !Number.isFinite(size) || size <= 0 || sizes.get(key) === size) {
        continue
      }
      sizes.set(key, size)
      changed = true
    }
    if (changed) {
      triggerRef(measuredSizes)
    }
  }

  function pin (key) {
    if (key === undefined || pinnedKeys.value.has(key)) {
      return
    }
    pinnedKeys.value = new Set([...pinnedKeys.value, key])
  }

  function unpin (key) {
    if (!pinnedKeys.value.has(key)) {
      return
    }
    const keys = new Set(pinnedKeys.value)
    keys.delete(key)
    pinnedKeys.value = keys
  }

  function resetMeasurements () {
    measuredSizes.value.clear()
    for (const element of elementsByKey.values()) {
      itemResizeObserver?.unobserve(element)
      itemResizeObserver?.observe(element)
    }
    triggerRef(measuredSizes)
  }

  function getElement (key) {
    return elementsByKey.get(key)
  }

  function scrollToKey (key, { behavior = 'auto' } = {}) {
    const index = itemList.value.findIndex(item => getKey(item) === key)
    const container = scrollContainer.value
    if (index < 0 || !container) {
      return
    }

    const top = listOffsetTop.value + offsets.value.at(index)
    const bottom = listOffsetTop.value + offsets.value.at(index + 1)
    const target = getRevealScrollTop({
      scrollTop: getScrollTop(container),
      viewportHeight: getViewportHeight(container) || window.innerHeight,
      top,
      height: bottom - top,
    })

    scrollTo(container, { top: target, behavior })
  }

  watch(itemList, currentItems => {
    const activeKeys = new Set(currentItems.map(getKey))
    const sizes = measuredSizes.value
    let changed = false
    for (const key of sizes.keys()) {
      if (!activeKeys.has(key)) {
        sizes.delete(key)
        changed = true
      }
    }
    if (changed) {
      triggerRef(measuredSizes)
    }
    const nextPinnedKeys = new Set([...pinnedKeys.value].filter(key => activeKeys.has(key)))
    if (nextPinnedKeys.size !== pinnedKeys.value.size) {
      pinnedKeys.value = nextPinnedKeys
    }
  }, { flush: 'sync' })

  watch(listRef, element => {
    scrollContainer.value = element
      ? getScrollParent(element)
      : undefined
    if (element) {
      updateViewportMetrics()
    }
  }, { flush: 'post' })

  useEventListener(scrollEventTarget, 'scroll', scheduleViewportUpdate, { passive: true })
  useResizeObserver(scrollContainer, scheduleViewportUpdate)
  useResizeObserver(listRef, scheduleViewportUpdate)

  onMounted(() => {
    itemResizeObserver = new window.ResizeObserver(recordMeasurements)
    for (const element of elementsByKey.values()) {
      itemResizeObserver.observe(element)
    }
    updateViewportMetrics()
  })

  onScopeDispose(() => {
    if (viewportAnimationFrame !== undefined) {
      window.cancelAnimationFrame(viewportAnimationFrame)
    }
    itemResizeObserver?.disconnect()
  })

  return {
    listRef,
    virtualItems,
    paddingTop,
    paddingBottom,
    measureElement,
    pin,
    unpin,
    resetMeasurements,
    scrollContainer,
    scrollToKey,
    getElement,
  }
}
