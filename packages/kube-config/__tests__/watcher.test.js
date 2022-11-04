//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const EventEmitter = require('events')
const { basename } = require('path')
const chokidar = require('chokidar')
const { globalLogger: logger } = require('@gardener-dashboard/logger')
const Watcher = require('../lib/Watcher')
const { onceEvent } = fixtures.helper

describe('watcher', () => {
  const paths = [
    '/path/to/ca.crt',
    '/path/to/token'
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
        followSymlinks: true,
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
    logger.error.mockReset()
    ac.abort()
  })

  afterAll(() => {
    mockWatch.mockRestore()
  })

  it('should create a watcher with defaults', async () => {
    expect.assertions(2)
    const watcher = await createWatcher()
    watcher.destroy()
  })

  it('should run a watcher and log errors', async () => {
    const watcher = await createWatcher({
      signal: ac.signal,
      readFile: path => Promise.resolve(basename(path))
    })
    const mockHandler = jest.fn((key, value) => {
      if (value === 'ca.crt') {
        watcher.destroy()
      }
    })
    watcher.run(mockHandler)
    emitter.emit('change', '/path/to/token')
    emitter.emit('error', new Error('foo'))
    emitter.emit('change', '/path/to/ca.crt')
    emitter.emit('error', new Error('bar'))
    await onceEvent(watcher, 'close')
    expect(mockHandler).toBeCalledTimes(2)
    expect(mockHandler.mock.calls).toEqual([
      ['/path/to/token', 'token'],
      ['/path/to/ca.crt', 'ca.crt']
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

  it('should log a read file error when running a watcher', async () => {
    const readFileError = new Error('read file error')
    readFileError.code = 'EREADFILE'
    const watcher = await createWatcher({
      signal: ac.signal,
      readFile: path => path === '/path/to/token'
        ? Promise.resolve(basename(path))
        : Promise.reject(readFileError)
    })
    const mockHandler = jest.fn(() => watcher.destroy())
    watcher.run(mockHandler)
    emitter.emit('change', '/path/to/ca.crt')
    emitter.emit('change', '/path/to/..data')
    emitter.emit('change', '/path/to/token')
    await onceEvent(watcher, 'close')
    expect(mockHandler).toBeCalledTimes(1)
    expect(mockHandler.mock.calls).toEqual([
      ['/path/to/token', 'token']
    ])
    expect(logger.error).toBeCalledTimes(1)
    expect(logger.error.mock.calls).toEqual([
      ['[kube-config] read file error %s: %s', 'EREADFILE', 'read file error']
    ])
  })
})
