//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const crypto = require('crypto')
const fs = require('fs/promises')
const EventEmitter = require('events')
const { globalLogger: logger } = require('@gardener-dashboard/logger')

function sha256 (data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

class PollingWatcher extends EventEmitter {
  #paths
  #interval
  #intervalId
  #state = 'initial'
  #hashes

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
    const init = async () => {
      try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is not user input
        const createHashEntry = async path => [path, sha256(await fs.readFile(path))]
        const hashEntries = await Promise.all(paths.map(createHashEntry))
        this.#hashes = new Map(hashEntries)
        if (this.#state === 'initial') {
          this.#state = 'ready'
          logger.info('[polling-watcher] watcher is ready')
          this.emit('ready')
        }
      } catch (err) {
        clearInterval(this.#intervalId)
        this.#state = 'error'
        logger.error('[polling-watcher] failed to initialize file hashes: %s', err.message)
        this.emit('error', err)
      }
    }
    init()
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
          const data = await fs.readFile(path)
          const newHash = sha256(data)
          const oldHash = this.#hashes.get(path)
          if (newHash !== oldHash) {
            logger.info('[polling-watcher] updated content of file `%s`', path)
            this.#hashes.set(path, newHash)
            fn(path, data.toString('utf8'))
          }
        } catch (err) {
          logger.error('[polling-watcher] failed to read file `%s`: %s', path, err.message)
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
    logger.info('[polling-watcher] watcher has been aborted')
  }
}

function createPollingWatcher (...args) {
  return new PollingWatcher(...args)
}

createPollingWatcher.PollingWatcher = PollingWatcher

module.exports = createPollingWatcher
