//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { effectScope } from 'vue'

import {
  tween,
  useHeightTransitions,
} from '@/composables/useHeightTransitions'

import { getRevealScrollTop } from '@/utils/scroll'

function mockReducedMotion (matches) {
  vi.mocked(window.matchMedia).mockImplementation(query => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

describe('useHeightTransitions', () => {
  beforeEach(() => {
    mockReducedMotion(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getRevealScrollTop', () => {
    it.each([
      {
        description: 'keeps an already visible element in place',
        input: { scrollTop: 100, viewportHeight: 300, top: 150, height: 100 },
        expected: 100,
      },
      {
        description: 'aligns the bottom margin of an element below the viewport',
        input: { scrollTop: 100, viewportHeight: 300, top: 400, height: 50 },
        expected: 166,
      },
      {
        description: 'aligns the top margin of an element above the viewport',
        input: { scrollTop: 100, viewportHeight: 300, top: 50, height: 50 },
        expected: 34,
      },
      {
        description: 'aligns the top of an element taller than the viewport',
        input: { scrollTop: 0, viewportHeight: 300, top: 400, height: 500 },
        expected: 384,
      },
      {
        description: 'uses the configured margin',
        input: { scrollTop: 0, viewportHeight: 300, top: 280, height: 30, margin: 10 },
        expected: 20,
      },
      {
        description: 'clamps the target at the start of the scroll area',
        input: { scrollTop: 100, viewportHeight: 300, top: 5, height: 50 },
        expected: 0,
      },
    ])('$description', ({ input, expected }) => {
      expect(getRevealScrollTop(input)).toBe(expected)
    })
  })

  it('runs monotonic animation frames and completes once', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance', 'Date'] })
    const frames = []
    const onDone = vi.fn()

    tween({
      duration: 100,
      easing: progress => progress,
      onFrame: progress => frames.push(progress),
      onDone,
    })

    expect(frames).toEqual([0])
    vi.advanceTimersByTime(50)
    expect(frames.at(-1)).toBeGreaterThan(0)
    expect(frames.at(-1)).toBeLessThan(1)
    vi.runAllTimers()

    expect(frames.at(-1)).toBe(1)
    expect(frames).toEqual([...frames].sort((left, right) => left - right))
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('finishes an animation immediately', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance', 'Date'] })
    const frames = []
    const onDone = vi.fn()
    const transition = tween({
      duration: 100,
      onFrame: progress => frames.push(progress),
      onDone,
    })

    transition.finish()
    transition.finish()
    vi.runAllTimers()

    expect(frames).toEqual([0, 1])
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('cancels without completing', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance', 'Date'] })
    const onDone = vi.fn()
    const transition = tween({
      duration: 100,
      onFrame: vi.fn(),
      onDone,
    })

    transition.cancel()
    vi.runAllTimers()

    expect(onDone).not.toHaveBeenCalled()
  })

  it('finishes synchronously when reduced motion is preferred', () => {
    mockReducedMotion(true)
    const frames = []
    const onDone = vi.fn()

    tween({
      duration: 100,
      onFrame: progress => frames.push(progress),
      onDone,
    })

    expect(frames).toEqual([0, 1])
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('keeps the animated element top visible when the full reveal range does not fit', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance', 'Date'] })
    const container = document.createElement('div')
    const element = document.createElement('div')
    const content = document.createElement('div')
    const revealUntil = document.createElement('button')
    element.append(content)
    container.append(element, revealUntil)
    document.body.append(container)
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 100 })
    Object.defineProperty(element, 'scrollHeight', { configurable: true, value: 200 })
    container.getBoundingClientRect = vi.fn(() => ({ top: 0 }))
    element.getBoundingClientRect = vi.fn(() => ({
      top: 150 - container.scrollTop,
      bottom: 350 - container.scrollTop,
    }))
    revealUntil.getBoundingClientRect = vi.fn(() => ({
      top: 350 - container.scrollTop,
      bottom: 370 - container.scrollTop,
    }))
    const scope = effectScope()
    const transitions = scope.run(() => useHeightTransitions({
      getElement: () => element,
      getScrollContainer: () => container,
      duration: 100,
    }))

    const finished = transitions.enter('worker', { revealUntil })
    vi.runAllTimers()
    await finished

    expect(container.scrollTop).toBe(134)
    scope.stop()
    container.remove()
  })
})
