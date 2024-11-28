//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs/promises')
const { globalLogger: logger } = require('@gardener-dashboard/logger')
const createPollingWatcher = require('../lib')

describe('polling-watcher', () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  describe('#run', () => {
    const filename = '/path/to/file'
    const content = 'content'
    const interval = 10
    let ac
    let fn

    const createWatcher = (signal = ac.signal) => {
      return createPollingWatcher([filename], {
        interval,
        signal,
      })
    }

    const advanceTimersByOneInterval = i => {
      return jest.advanceTimersByTimeAsync(i + 1)
    }

    beforeEach(() => {
      ac = new AbortController()
      fn = jest.fn()
      jest.spyOn(fs, 'readFile').mockResolvedValue(content)
      logger.info.mockClear()
      logger.error.mockClear()
    })

    afterEach(() => {
      fs.readFile.mockRestore()
      ac.abort()
    })


    it('should create and run a watcher with default interval', async () => {
      const watcher = createPollingWatcher([filename], {
        signal: ac.signal,
      })
      jest.runAllTicks()
      expect(watcher.state).toBe('ready')
      watcher.run(fn)
      expect(fn).toHaveBeenCalledTimes(0)
      await advanceTimersByOneInterval(watcher.interval)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should read the file content and call the callback function', async () => {
      const watcher = createWatcher()
      jest.runAllTicks()
      expect(watcher.state).toBe('ready')
      watcher.run(fn)
      expect(fn).toHaveBeenCalledTimes(0)
      await advanceTimersByOneInterval(watcher.interval)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn.mock.calls[0]).toEqual([filename, content])
      expect(logger.info).toHaveBeenCalledTimes(1)
      expect(logger.info.mock.calls[0]).toEqual(['[polling-watcher] updated content of file `%s`', filename])
    })

    it('should fail to read file content and not call the callback function', async () => {
      const error = new Error('no such file')
      fs.readFile.mockRejectedValueOnce(error)
      const watcher = createWatcher()
      watcher.run(fn)
      expect(fn).toHaveBeenCalledTimes(0)
      await advanceTimersByOneInterval(watcher.interval)
      expect(fn).toHaveBeenCalledTimes(0)
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error.mock.calls[0]).toEqual(['[polling-watcher] failed to stat file `%s`: %s', filename, error.message])
    })

    it('should do nothing if abortet before run', async () => {
      const watcher = createWatcher()
      expect(watcher.state).toBe('initial')
      jest.runAllTicks()
      expect(watcher.state).toBe('ready')
      ac.abort()
      expect(watcher.state).toBe('aborted')
      watcher.run(fn)
      await advanceTimersByOneInterval(watcher.interval)
      expect(fn).toHaveBeenCalledTimes(0)
    })

    it('should do nothing if already abortet', async () => {
      ac.abort()
      const watcher = createWatcher()
      expect(watcher.state).toBe('aborted')
      watcher.run(fn)
      await advanceTimersByOneInterval(watcher.interval)
      expect(fn).toHaveBeenCalledTimes(0)
      expect(watcher.state).toBe('aborted')
    })

    it('should run a watcher without abort signal', async () => {
      const watcher = createWatcher(null)
      jest.runAllTicks()
      expect(watcher.state).toBe('ready')
      ac.abort()
      expect(watcher.state).toBe('ready')
      watcher.run(fn)
      await advanceTimersByOneInterval(watcher.interval)
      expect(fn).toHaveBeenCalledTimes(1)
      watcher.abort()
      expect(watcher.state).toBe('aborted')
    })
  })
})
