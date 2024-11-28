//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs/promises')
const EventEmitter = require('events')
const { globalLogger: logger } = require('@gardener-dashboard/logger')

class PollingWatcher extends EventEmitter {
  #paths
  #interval
  #intervalId
  #state = 'initial'

  constructor (paths, options) {
    super()
    this.#paths = paths
    this.#interval = options?.interval ?? 300_000
    const signal = options?.signal
    if (signal instanceof AbortSignal) {
      if (!signal.aborted) {
        signal.addEventListener('abort', () => this.abort(), { once: true })
      } else {
        this.#state = 'aborted'
      }
    }
    process.nextTick(() => {
      if (this.#state === 'initial') {
        this.#state = 'ready'
        logger.debug('[polling-watcher] watcher is ready')
        this.emit('ready')
      }
    })
  }

  get interval () {
    return this.#interval
  }

  get state () {
    return this.#state
  }

  run (fn) {
    if (['initial', 'ready'].includes(this.#state)) {
      const tryReadFile = async path => {
        try {
          // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is not user input
          const value = await fs.readFile(path, 'utf8')
          logger.info('[polling-watcher] updated content of file `%s`', path)
          fn(path, value)
        } catch (err) {
          logger.error('[polling-watcher] failed to stat file `%s`: %s', path, err.message)
        }
      }
      this.#state = 'running'
      this.#intervalId = setInterval(() => {
        for (const path of this.#paths) {
          tryReadFile(path)
        }
      }, this.#interval)
    }
  }

  abort () {
    this.#state = 'aborted'
    clearInterval(this.#intervalId)
    logger.error('[polling-watcher] watcher has been aborted')
  }
}

function createPollingWatcher (...args) {
  return new PollingWatcher(...args)
}

createPollingWatcher.PollingWatcher = PollingWatcher

module.exports = createPollingWatcher
