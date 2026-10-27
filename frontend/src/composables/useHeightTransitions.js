//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  onScopeDispose,
  shallowRef,
  watch,
} from 'vue'
import {
  transition,
  TransitionPresets,
} from '@vueuse/core'

import {
  getOffsetWithin,
  getScrollTopToReveal,
  getScrollTop,
  getViewportHeight,
  setScrollTop,
} from '@/utils/scroll'

export function prefersReducedMotion () {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function tween ({
  duration,
  easing = TransitionPresets.easeInOutCubic,
  onFrame,
  onDone,
}) {
  let stopped = false
  const progress = shallowRef()

  function done () {
    if (stopped) {
      return
    }
    stopped = true
    stopWatching()
    onDone?.()
  }

  const stopWatching = watch(progress, value => {
    const nextProgress = Math.min(1, Math.max(0, value))
    onFrame(nextProgress)
    if (nextProgress === 1) {
      done()
    }
  }, { flush: 'sync' })

  if (duration <= 0 || prefersReducedMotion()) {
    progress.value = 0
    progress.value = 1
  } else {
    transition(progress, 0, 1, {
      duration,
      easing,
      abort: () => stopped,
    })
  }

  return {
    finish () {
      if (!stopped) {
        progress.value = 1
      }
    },
    cancel () {
      if (stopped) {
        return
      }
      stopped = true
      stopWatching()
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
        const finalScrollTop = getScrollTopToReveal({
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
