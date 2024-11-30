//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs/promises')
const { globalLogger: logger } = require('@gardener-dashboard/logger')
const createWatch = require('../lib')

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
      expect(fn).toHaveBeenCalledTimes(0)
      await jest.advanceTimersToNextTimerAsync(1)
      expect(fn).toHaveBeenCalledTimes(0)
      fs.readFile.mockResolvedValueOnce(newContent)
      await jest.advanceTimersToNextTimerAsync(1)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn.mock.calls[0]).toEqual([filename, newContent])
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
      expect(fn).toHaveBeenCalledTimes(0)
      fs.readFile.mockResolvedValueOnce(newContent)
      await jest.advanceTimersToNextTimerAsync(1)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn.mock.calls[0]).toEqual([filename, newContent])
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
      await startWatch()
      expect(fn).toHaveBeenCalledTimes(0)
      fs.readFile.mockRejectedValueOnce(noSuchFile)
      await jest.advanceTimersToNextTimerAsync(1)
      expect(fn).toHaveBeenCalledTimes(0)
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error.mock.calls).toEqual([
        ['[polling-watcher] failed to read file `%s`: %s', filename, noSuchFile.message],
      ])
    })

    it('should fail to initialize the watcher', async () => {
      fs.readFile.mockRejectedValueOnce(noSuchFile)
      await expect(startWatch()).rejects.toThrow(noSuchFile.message)
      expect(stop).toBeUndefined()
      expect(logger.error).toHaveBeenCalledTimes(0)
    })

    it('should immediately stop if signal is already aborted', async () => {
      const ac = new AbortController()
      ac.abort()
      await startWatch({
        interval: 10,
        signal: ac.signal,
      })
      fs.readFile.mockResolvedValueOnce(newContent)
      await jest.advanceTimersToNextTimerAsync(1)
      expect(fn).toHaveBeenCalledTimes(0)
    })
  })
})
