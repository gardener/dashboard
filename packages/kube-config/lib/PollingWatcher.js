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
    process.nextTick(() => {
      this.#state = 'ready'
      logger.debug('[kube-config] watcher ready')
      this.emit('ready')
    })
    const signal = options?.signal
    if (signal instanceof AbortSignal) {
      if (!signal.aborted) {
        signal.addEventListener('abort', () => this.abort(), { once: true })
      } else {
        this.#state = 'aborted'
      }
    }
  }

  run (fn) {
    if (['initial', 'ready'].includes(this.#state)) {
      const tryReadFile = async path => {
        try {
          // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is not user input
          const value = await fs.readFile(path, 'utf8')
          logger.info('[kube-config] updated content of file `%s`', path)
          fn(path, value)
        } catch (err) {
          logger.error('[kube-config] failed to stat file `%s`: %s', path, err.message)
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
  }
}

module.exports = PollingWatcher
