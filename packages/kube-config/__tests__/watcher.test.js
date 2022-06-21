//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const EventEmitter = require('events')
const chokidar = require('chokidar')
const { globalLogger: logger } = require('@gardener-dashboard/logger')
const Watcher = require('../lib/Watcher')
const { onceEvent } = fixtures.helper

describe('watcher', () => {
  const paths = [
    '/path/to/certificate-authority.pem',
    '/path/to/token/file'
  ]
  let mockWatch
  let emitter
  let ac

  const createWatcher = async options => {
    const watcher = new Watcher(paths, options)
    expect(mockWatch).toBeCalledTimes(1)
    expect(mockWatch.mock.calls[0]).toEqual([
      paths,
      {
        persistent: true,
        awaitWriteFinish: true,
        ignoreInitial: true,
        followSymlinks: false,
        disableGlobbing: true
      }
    ])
    setImmediate(() => emitter.emit('ready'))
    await onceEvent(watcher, 'ready')
    return watcher
  }

  beforeEach(() => {
    ac = new AbortController()
    emitter = new EventEmitter()
    emitter.close = jest.fn().mockImplementation(() => Promise.resolve())
    mockWatch = jest.spyOn(chokidar, 'watch').mockReturnValueOnce(emitter)
  })

  afterEach(() => {
    mockWatch.mockRestore()
    ac.abort()
  })

  it('should create a watcher with defaults', async () => {
    expect.assertions(2)
    const watcher = await createWatcher()
    watcher.destroy()
  })

  it('should run a watcher and log errors', async () => {
    const watcher = await createWatcher({
      signal: ac.signal,
      readFile: path => Promise.resolve(path)
    })
    const results = []
    watcher.run((...args) => {
      results.push(args)
      if (results.length >= 2) {
        watcher.destroy()
      }
    })
    emitter.emit('change', 'foo')
    emitter.emit('error', new Error('foo'))
    emitter.emit('change', 'bar')
    emitter.emit('error', new Error('bar'))
    await onceEvent(watcher, 'close')
    expect(results).toEqual([
      ['foo', 'foo'],
      ['bar', 'bar']
    ])
    expect(logger.error).toBeCalledTimes(2)
    expect(logger.error.mock.calls).toEqual([
      ['[kube-config] watch files error: %s', 'foo'],
      ['[kube-config] watch files error: %s', 'bar']
    ])
  })

  it('should throw a timeout error when creating a watcher', async () => {
    const milliseconds = 1
    const watcher = new Watcher(paths, {
      signal: ac.signal,
      readyTimeout: milliseconds
    })
    const err = await onceEvent(watcher, 'error')
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toEqual(`FSWatcher timed out after ${milliseconds} milliseconds`)
  })

  it('should throw a close error when destroying a watcher', async () => {
    const closeError = new Error('close error')
    const watcher = await createWatcher()
    emitter.close.mockImplementationOnce(() => Promise.reject(closeError))
    watcher.destroy()
    const err = await onceEvent(watcher, 'error')
    expect(err).toBe(closeError)
  })

  it('should throw a read file error when running a watcher', async () => {
    const readFileError = new Error('read file error')
    const watcher = await createWatcher({
      signal: ac.signal,
      readFile: () => Promise.reject(readFileError)
    })
    const fn = jest.fn()
    watcher.run(fn)
    emitter.emit('change', 'foo')
    const [err] = await Promise.all([
      onceEvent(watcher, 'error'),
      onceEvent(watcher, 'close')
    ])
    expect(fn).not.toBeCalled()
    expect(err).toBe(readFileError)
  })
})
