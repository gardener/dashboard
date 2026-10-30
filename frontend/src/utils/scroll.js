//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

export function isDocumentScroller (element) {
  return !!element && (element === document.scrollingElement || element === document.documentElement)
}

export function getScrollTop (element) {
  return isDocumentScroller(element)
    ? window.scrollY
    : element.scrollTop
}

export function setScrollTop (element, value) {
  element.scrollTop = value
}

export function getViewportHeight (element) {
  return isDocumentScroller(element)
    ? window.innerHeight
    : element.clientHeight
}

export function getOffsetWithin (container, element) {
  const elementRect = element.getBoundingClientRect()
  if (isDocumentScroller(container)) {
    return elementRect.top + window.scrollY
  }

  const containerRect = container.getBoundingClientRect()
  return elementRect.top - containerRect.top - container.clientTop + container.scrollTop
}

/**
 * Return the scroll offset needed to reveal an item with the requested margin.
 * Keep the current offset when the item is already fully visible and align the
 * item start when the complete item cannot fit in the viewport.
 */
export function getScrollTopToReveal ({
  scrollTop,
  viewportHeight,
  top,
  height,
  margin = 16,
}) {
  if (top - margin >= scrollTop && top + height + margin <= scrollTop + viewportHeight) {
    return scrollTop
  }
  if (top - margin < scrollTop) {
    return Math.max(0, top - margin)
  }
  return Math.max(0, Math.min(top - margin, top + height + margin - viewportHeight))
}

export function scrollTo (element, options) {
  if (isDocumentScroller(element)) {
    window.scrollTo(options)
  } else {
    element.scrollTo(options)
  }
}
