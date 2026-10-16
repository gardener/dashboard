//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'
import { BackoffManager } from '../lib/cache/index.js'

describe('kube-client', () => {
  describe('cache', () => {
    describe('BackoffManager', () => {
      const min = 800
      const max = 30 * 1000
      const resetDuration = 120 * 1000
      const factor = 2
      const jitter = 1
      let mockRandom
      let backoffManager

      beforeAll(() => {
        vi.useFakeTimers()
      })

      afterAll(() => {
        vi.useRealTimers()
      })

      beforeEach(() => {
        backoffManager = new BackoffManager()
        mockRandom = vi.spyOn(Math, 'random')
      })

      afterEach(() => {
        backoffManager.clearTimeout()
      })

      it('should create a default BackoffManager instance', () => {
        expect(backoffManager.min).toBe(min)
        expect(backoffManager.max).toBe(max)
        expect(backoffManager.resetDuration).toBe(resetDuration)
        expect(backoffManager.factor).toBe(factor)
        expect(backoffManager.jitter).toBe(jitter)
      })

      it.each([
        [0, 800],
        [0.5, 1200],
        [1 - Number.EPSILON, 1599],
      ])('should add positive jitter for a random sample of %s', (sample, expected) => {
        mockRandom.mockReturnValue(sample)
        expect(backoffManager.duration()).toBe(expected)
      })

      it('should never return less than the current base', () => {
        mockRandom.mockReturnValue(0)
        expect(Array.from({ length: 8 }, () => backoffManager.duration())).toEqual([
          800,
          1600,
          3200,
          6400,
          12800,
          25600,
          30000,
          30000,
        ])
      })

      it('should cap the exponential base before applying jitter', () => {
        mockRandom.mockReturnValue(1 - Number.EPSILON)
        const durations = Array.from({ length: 8 }, () => backoffManager.duration())
        expect(durations.slice(-2)).toEqual([59999, 59999])
        expect(durations.every((duration, attempt) => {
          const base = Math.min(min * Math.pow(factor, attempt), max)
          return duration >= base && duration < 2 * base
        })).toBe(true)
      })

      it('should reset to the initial base after the reset interval', async () => {
        mockRandom.mockReturnValue(0)
        expect(backoffManager.duration()).toBe(800)
        expect(backoffManager.duration()).toBe(1600)

        await vi.advanceTimersByTimeAsync(resetDuration)

        expect(backoffManager.duration()).toBe(800)
      })

      it('should use one reset timer for repeated calls in the same backoff window', () => {
        mockRandom.mockReturnValue(0)
        backoffManager.duration()
        backoffManager.duration()
        expect(vi.getTimerCount()).toBe(1)
      })
    })
  })
})
