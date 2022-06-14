//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const Watcher = require('../lib/Watcher')
const { mockWatcher } = require('chokidar')
const { helper } = require('../__fixtures__')

jest.mock('chokidar', () => {
  const EventEmitter = require('events')
  const mockWatcher = new EventEmitter()
  mockWatcher.close = jest.fn().mockImplementation(() => Promise.resolve())

  return {
    mockWatcher,
    watch: jest.fn().mockImplementation(() => {
      process.nextTick(() => mockWatcher.emit('ready'))
      return mockWatcher
    })
  }
})

describe('watcher', () => {
  let ac

  const onceEvent = (watcher, event) => new Promise(resolve => watcher.once(event, resolve))

  const nthChange = (watcher, n) => {
    return new Promise(resolve => {
      const paths = []
      watcher.run(path => {
        paths.push(path)
        if (paths.length >= n) {
          watcher.destroy()
          resolve(paths)
        }
      })
    })
  }

  beforeEach(() => {
    ac = new AbortController()
  })

  afterEach(() => {
    ac.abort()
  })

  it('should create a watcher', async () => {
    const watcher = new Watcher([], {
      signal: ac.signal,
      readFile: path => Promise.resolve(path)
    })
    expect(watcher).toBeInstanceOf(Watcher)
    await onceEvent(watcher, 'ready')
    setImmediate(() => {
      mockWatcher.emit('change', 'foo')
      mockWatcher.emit('change', 'bar')
    })
    const paths = await nthChange(watcher, 2)
    expect(paths).toEqual(['foo', 'bar'])
  })
})
