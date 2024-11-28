//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
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
    const newContent = 'new content'
    const interval = 10
    let ac
    let fn

    const createWatcher = (signal = ac.signal) => {
      return createPollingWatcher([filename], {
        interval,
        signal,
      })
    }

    const isReady = watcher => new Promise((resolve, reject) => {
      switch (watcher.state) {
        case 'ready': {
          resolve()
          break
        }
        case 'initial': {
          const onReady = () => {
            clearTimeout(timeoutId)
            resolve()
          }
          const onError = err => {
            clearTimeout(timeoutId)
            reject(err)
          }
          const timeoutId = setTimeout(() => {
            reject(new Error('timed out'))
          }, 100)
          watcher.once('ready', onReady)
          watcher.once('error', onError)
          break
        }
        default: {
          reject(new Error('invalid state'))
          break
        }
      }
    })

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
      await isReady(watcher)
      expect(watcher.state).toBe('ready')
      watcher.run(fn)
      expect(fn).toHaveBeenCalledTimes(0)
      await jest.advanceTimersByTimeAsync(watcher.interval + 1)
      expect(fn).toHaveBeenCalledTimes(0)
      fs.readFile.mockResolvedValueOnce(newContent)
      await jest.advanceTimersByTimeAsync(watcher.interval + 1)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should read the file content and call the callback function', async () => {
      const watcher = createWatcher()
      await isReady(watcher)
      expect(watcher.state).toBe('ready')
      watcher.run(fn)
      expect(fn).toHaveBeenCalledTimes(0)
      fs.readFile.mockResolvedValueOnce(newContent)
      await jest.advanceTimersByTimeAsync(watcher.interval + 1)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn.mock.calls[0]).toEqual([filename, newContent])
      expect(logger.info).toHaveBeenCalledTimes(2)
      expect(logger.info.mock.calls).toEqual([
        ['[polling-watcher] watcher is ready'],
        ['[polling-watcher] updated content of file `%s`', filename],
      ])
    })

    it('should fail to read file content and not call the callback function', async () => {
      const error = new Error('no such file')
      const watcher = createWatcher()
      watcher.run(fn)
      expect(fn).toHaveBeenCalledTimes(0)
      fs.readFile.mockRejectedValueOnce(error)
      await jest.advanceTimersByTimeAsync(watcher.interval + 1)
      expect(fn).toHaveBeenCalledTimes(0)
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error.mock.calls[0]).toEqual(['[polling-watcher] failed to read file `%s`: %s', filename, error.message])
    })

    it('should do nothing if aborted before run', async () => {
      const watcher = createWatcher()
      expect(watcher.state).toBe('initial')
      await isReady(watcher)
      expect(watcher.state).toBe('ready')
      ac.abort()
      expect(watcher.state).toBe('aborted')
      watcher.run(fn)
      await jest.advanceTimersByTimeAsync(watcher.interval + 1)
      expect(fn).toHaveBeenCalledTimes(0)
    })

    it('should do nothing if already aborted', async () => {
      ac.abort()
      const watcher = createWatcher()
      expect(watcher.state).toBe('aborted')
      watcher.run(fn)
      await jest.advanceTimersByTimeAsync(watcher.interval + 1)
      expect(fn).toHaveBeenCalledTimes(0)
      expect(watcher.state).toBe('aborted')
    })

    it('should run a watcher without abort signal', async () => {
      const watcher = createWatcher(null)
      await isReady(watcher)
      expect(watcher.state).toBe('ready')
      ac.abort()
      expect(watcher.state).toBe('ready')
      watcher.run(fn)
      fs.readFile.mockResolvedValueOnce(newContent)
      await jest.advanceTimersByTimeAsync(watcher.interval + 1)
      expect(fn).toHaveBeenCalledTimes(1)
      watcher.abort()
      expect(watcher.state).toBe('aborted')
    })

    it('should fail to initialize the watcher', async () => {
      const error = new Error('no such file')
      fs.readFile.mockRejectedValueOnce(error)
      const watcher = createWatcher()
      await expect(isReady(watcher)).rejects.toThrow(error.message)
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error.mock.calls[0]).toEqual(['[polling-watcher] failed to initialize file hashes: %s', error.message])
    })
  })
})
