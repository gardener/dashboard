//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { onScopeDispose } from 'vue'

import {
  getOffsetWithin,
  getRevealScrollTop,
  getScrollTop,
  getViewportHeight,
  setScrollTop,
} from '@/utils/scroll'

export const easeInOutCubic = t => t < 0.5
  ? 4 * t ** 3
  : 1 - (-2 * t + 2) ** 3 / 2

export function prefersReducedMotion () {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function tween ({
  duration,
  easing = easeInOutCubic,
  onFrame,
  onDone,
}) {
  let animationFrame
  let finished = false
  const start = performance.now()

  function done () {
    if (finished) {
      return
    }
    finished = true
    onDone?.()
  }

  function frame (timestamp) {
    if (finished) {
      return
    }
    const progress = Math.min(1, Math.max(0, (timestamp - start) / duration))
    onFrame(easing(progress))
    if (progress === 1) {
      done()
    } else {
      animationFrame = window.requestAnimationFrame(frame)
    }
  }

  onFrame(0)
  if (duration <= 0 || prefersReducedMotion()) {
    onFrame(1)
    done()
  } else {
    animationFrame = window.requestAnimationFrame(frame)
  }

  return {
    finish () {
      if (finished) {
        return
      }
      window.cancelAnimationFrame(animationFrame)
      onFrame(1)
      done()
    },
    cancel () {
      if (finished) {
        return
      }
      window.cancelAnimationFrame(animationFrame)
      finished = true
    },
  }
}

function applyTransitionStyles (element, content, container) {
  const styles = {
    height: element.style.height,
    overflow: element.style.overflow,
    opacity: content?.style.opacity,
    overflowAnchor: container.style.overflowAnchor,
  }

  element.style.overflow = 'hidden'
  container.style.overflowAnchor = 'none'

  return () => {
    element.style.height = styles.height
    element.style.overflow = styles.overflow
    if (content) {
      content.style.opacity = styles.opacity
    }
    container.style.overflowAnchor = styles.overflowAnchor
  }
}

function setOpacity (element, opacity) {
  if (element) {
    element.style.opacity = opacity
  }
}

export function useHeightTransitions ({
  getElement,
  getScrollContainer,
  getContentElement = element => element.firstElementChild,
  duration = 300,
}) {
  let activeAnimation

  function finishActive () {
    activeAnimation?.finish()
  }

  function animate (key, createFrameHandler, onComplete) {
    const element = getElement(key)
    const container = getScrollContainer()
    if (!element || !container) {
      onComplete?.()
      return Promise.resolve()
    }

    const content = getContentElement(element)
    const restoreStyles = applyTransitionStyles(element, content, container)

    return new Promise(resolve => {
      const animation = {
        finish: () => {},
      }
      activeAnimation = animation

      const controls = tween({
        duration,
        onFrame: createFrameHandler({ element, content, container }),
        onDone () {
          restoreStyles()
          if (activeAnimation === animation) {
            activeAnimation = undefined
          }
          onComplete?.()
          resolve()
        },
      })

      animation.finish = controls.finish
    })
  }

  function enter (key, { revealUntil } = {}) {
    finishActive()
    return animate(key, ({ element, content, container }) => {
      const initialScrollTop = getScrollTop(container)
      const trailingHeight = revealUntil
        ? Math.max(
          0,
          revealUntil.getBoundingClientRect().bottom - element.getBoundingClientRect().bottom,
        )
        : 0

      return progress => {
        const expandedHeight = element.scrollHeight
        element.style.height = `${expandedHeight * progress}px`
        const finalScrollTop = getRevealScrollTop({
          scrollTop: initialScrollTop,
          viewportHeight: getViewportHeight(container),
          top: getOffsetWithin(container, element),
          height: expandedHeight + trailingHeight,
        })

        setScrollTop(
          container,
          initialScrollTop + (finalScrollTop - initialScrollTop) * progress,
        )
        setOpacity(content, progress)
      }
    })
  }

  function leave (key, { onComplete } = {}) {
    finishActive()
    return animate(key, ({ element, content }) => {
      const expandedHeight = element.offsetHeight

      return progress => {
        element.style.height = `${expandedHeight * (1 - progress)}px`
        setOpacity(content, 1 - progress)
      }
    }, onComplete)
  }

  onScopeDispose(finishActive)

  return {
    enter,
    leave,
    finishActive,
  }
}
