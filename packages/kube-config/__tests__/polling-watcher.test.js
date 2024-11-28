//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs/promises')
const { globalLogger: logger } = require('@gardener-dashboard/logger')
const PollingWatcher = require('../lib/PollingWatcher')

const actualNextTick = jest.requireActual('process').nextTick
const flushPromises = () => new Promise(actualNextTick)

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
      return new PollingWatcher([filename], {
        interval,
        signal,
      })
    }

    const advanceTimersByOneInterval = async () => {
      jest.advanceTimersByTime(interval + 1)
      await flushPromises()
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

    it('should read the file content and call the callback function', async () => {
      createWatcher().run(fn)
      expect(fn).toHaveBeenCalledTimes(0)
      await advanceTimersByOneInterval()
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn.mock.calls[0]).toEqual([filename, content])
      expect(logger.info).toHaveBeenCalledTimes(1)
      expect(logger.info.mock.calls[0]).toEqual(['[kube-config] updated content of file `%s`', filename])
    })

    it('should fail to read file content and not call the callback function', async () => {
      const error = new Error('no such file')
      fs.readFile.mockRejectedValueOnce(error)
      createWatcher().run(fn)
      expect(fn).toHaveBeenCalledTimes(0)
      await advanceTimersByOneInterval()
      expect(fn).toHaveBeenCalledTimes(0)
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error.mock.calls[0]).toEqual(['[kube-config] failed to stat file `%s`: %s', filename, error.message])
    })

    it('should do nothing if abortet before run', async () => {
      const watcher = createWatcher()
      ac.abort()
      watcher.run(fn)
      await advanceTimersByOneInterval()
      expect(fn).toHaveBeenCalledTimes(0)
    })

    it('should do nothing if already abortet', async () => {
      ac.abort()
      const watcher = createWatcher()
      watcher.run(fn)
      await advanceTimersByOneInterval()
      expect(fn).toHaveBeenCalledTimes(0)
    })

    it('should run a watcher without abort signal', async () => {
      const watcher = createWatcher(null)
      ac.abort()
      watcher.run(fn)
      await advanceTimersByOneInterval()
      expect(fn).toHaveBeenCalledTimes(1)
      watcher.abort()
    })
  })
})
