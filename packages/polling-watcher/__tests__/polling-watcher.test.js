//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import fs from 'fs/promises'
import { globalLogger as logger } from '@gardener-dashboard/logger'
import createWatch from '../lib/index.js'

describe('polling-watcher', () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  describe('watch', () => {
    const noSuchFile = new Error('no such file')
    const filename = '/path/to/file'
    const oldContent = 'old'
    const newContent = 'new'
    let fn
    let stop

    async function startWatch (options) {
      const watch = await createWatch([filename], options)
      if (typeof watch === 'function') {
        stop = watch(fn)
      }
    }

    beforeEach(() => {
      fn = jest.fn()
      stop = undefined
      jest.spyOn(fs, 'readFile').mockResolvedValue(oldContent)
      logger.debug.mockClear()
      logger.info.mockClear()
      logger.error.mockClear()
    })

    afterEach(() => {
      fs.readFile.mockRestore()
      if (typeof stop === 'function') {
        stop()
      }
    })

    it('should create a file watch with default options', async () => {
      await startWatch()
      // Verify no changes are detected initially.
      expect(fn).toHaveBeenCalledTimes(0)

      // Simulate the passage of time without file changes.
      await jest.advanceTimersToNextTimerAsync(1)
      expect(fn).toHaveBeenCalledTimes(0)

      // Mock a file content change and verify that the callback is triggered.
      fs.readFile.mockResolvedValueOnce(newContent)
      await jest.advanceTimersToNextTimerAsync(1)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn.mock.calls[0]).toEqual([filename, newContent])

      // Stop the watcher and verify log messages.
      stop()
      expect(logger.debug).toHaveBeenCalledTimes(1)
      expect(logger.debug.mock.calls).toEqual([
        ['[polling-watcher] watch started with interval %dms', 300_000],
      ])
      expect(logger.info).toHaveBeenCalledTimes(3)
      expect(logger.info.mock.calls).toEqual([
        ['[polling-watcher] watch created for %d files', 1],
        ['[polling-watcher] detected file change `%s`', filename],
        ['[polling-watcher] watch aborted'],
      ])
      expect(logger.error).toHaveBeenCalledTimes(0)
    })

    it('should create a file watch with custom options', async () => {
      const ac = new AbortController()
      await startWatch({
        interval: 10,
        signal: ac.signal,
      })
      // Verify no changes are detected initially.
      expect(fn).toHaveBeenCalledTimes(0)

      // Mock a file content change and verify that the callback is triggered.
      fs.readFile.mockResolvedValueOnce(newContent)
      await jest.advanceTimersToNextTimerAsync(1)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn.mock.calls[0]).toEqual([filename, newContent])

      // Abort the watcher and verify log messages.
      ac.abort()
      expect(logger.debug).toHaveBeenCalledTimes(1)
      expect(logger.debug.mock.calls).toEqual([
        ['[polling-watcher] watch started with interval %dms', 10],
      ])
      expect(logger.info).toHaveBeenCalledTimes(3)
      expect(logger.info.mock.calls).toEqual([
        ['[polling-watcher] watch created for %d files', 1],
        ['[polling-watcher] detected file change `%s`', filename],
        ['[polling-watcher] watch aborted'],
      ])
      expect(logger.error).toHaveBeenCalledTimes(0)
    })

    it('should fail to read file', async () => {
      // Simulate a file read failure during polling.
      await startWatch()
      expect(fn).toHaveBeenCalledTimes(0)
      fs.readFile.mockRejectedValueOnce(noSuchFile)
      await jest.advanceTimersToNextTimerAsync(1)

      // Verify that the callback is not called and an error is logged.
      expect(fn).toHaveBeenCalledTimes(0)
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error.mock.calls).toEqual([
        ['[polling-watcher] failed to read file `%s`: %s', filename, noSuchFile.message],
      ])
    })

    it('should fail to initialize the watcher', async () => {
      // Test watcher initialization failure due to file read error.
      fs.readFile.mockRejectedValueOnce(noSuchFile)
      await expect(startWatch()).rejects.toThrow(noSuchFile.message)

      // Verify that the watcher is not started and no error is logged.
      expect(stop).toBeUndefined()
      expect(logger.error).toHaveBeenCalledTimes(0)
    })

    it('should immediately stop if signal is already aborted', async () => {
      // Ensure the watcher does not start if the abort signal is already triggered.
      const ac = new AbortController()
      ac.abort()
      await startWatch({
        interval: 10,
        signal: ac.signal,
      })

      // Simulate the passage of time and verify no file changes are detected.
      fs.readFile.mockResolvedValueOnce(newContent)
      await jest.advanceTimersToNextTimerAsync(1)
      expect(fn).toHaveBeenCalledTimes(0)
    })

    it('should throw an error if the watch function is called twice', async () => {
      const watch = await createWatch([filename])
      stop = watch(fn)
      expect(() => watch(fn)).toThrow('Watcher already started')
    })
  })
})
