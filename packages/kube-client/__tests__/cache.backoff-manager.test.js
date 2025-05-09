//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import { BackoffManager } from '../lib/cache/index.js'

describe('kube-client', () => {
  describe('cache', () => {
    describe('BackoffManager', () => {
      const min = 800
      const max = 30 * 1000
      const resetDuration = 120 * 1000
      const factor = 2
      const jitter = 1
      const attempts = 7
      let mockRandom
      let backoffManager

      beforeAll(() => {
        jest.useFakeTimers({ legacyFakeTimers: true })
      })

      afterAll(() => {
        jest.useRealTimers()
      })

      beforeEach(() => {
        backoffManager = new BackoffManager()
        mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5)
      })

      afterEach(() => {
        backoffManager.clearTimeout()
      })

      it('should create a default BackoffManager instance', async () => {
        expect(backoffManager.min).toBe(min)
        expect(backoffManager.max).toBe(max)
        expect(backoffManager.resetDuration).toBe(resetDuration)
        expect(backoffManager.factor).toBe(factor)
        expect(backoffManager.jitter).toBe(jitter)
        const durations = []
        const expectedDurations = []
        for (let i = 0; i < attempts; i++) {
          durations.push(backoffManager.duration())
          expectedDurations.push(Math.min(min * Math.pow(2, i), max))
        }
        expect(clearTimeout).toHaveBeenCalledTimes(attempts)
        clearTimeout.mockClear()
        expect(setTimeout).toHaveBeenCalledTimes(attempts)
        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), resetDuration)
        expect(mockRandom).toHaveBeenCalledTimes(Math.floor(Math.log(max / min) / Math.log(factor)) + 1)
        expect(backoffManager.attempt).toBe(attempts)
        expect(durations).toEqual(expectedDurations)
        jest.runAllTimers()
        expect(backoffManager.attempt).toBe(0)
        backoffManager.clearTimeout()
        expect(clearTimeout).toHaveBeenCalledTimes(1)
      })
    })
  })
})
