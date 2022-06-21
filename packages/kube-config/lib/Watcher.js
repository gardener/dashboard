//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fsPromises = require('fs/promises')
const { Readable } = require('stream')
const chokidar = require('chokidar')
const { globalLogger: logger } = require('@gardener-dashboard/logger')

class Watcher extends Readable {
  #paths
  #timeout
  #watching
  #fsWatcher
  #readFile

  constructor (paths, { readyTimeout = 15000, readFile = fsPromises.readFile, ...options } = {}) {
    super({
      ...options,
      objectMode: true
    })
    this.#paths = paths
    this.#timeout = readyTimeout
    this.#readFile = readFile
    this.#watching = false
    this.#fsWatcher = chokidar.watch(this.#paths, {
      persistent: true,
      awaitWriteFinish: true,
      ignoreInitial: true,
      followSymlinks: false,
      disableGlobbing: true
    })
  }

  _construct (callback) {
    const timeoutID = setTimeout(() => {
      callback(new Error(`FSWatcher timed out after ${this.#timeout} milliseconds`))
    }, this.#timeout)
    this.#fsWatcher
      .once('ready', () => {
        this.emit('ready')
        clearTimeout(timeoutID)
        callback()
      })
      .on('error', err => {
        logger.error('[kube-config] watch files error: %s', err.message)
      })
  }

  _read () {
    if (this.#watching !== true) {
      this.#watching = true
      this.#fsWatcher.on('change', async path => {
        try {
          const value = await this.#readFile(path, 'utf8')
          this.push([path, value])
        } catch (err) {
          this.destroy(err)
        }
      })
    }
  }

  _destroy (error, callback) {
    const done = closeError => callback(closeError || error)
    this.#fsWatcher.close().then(done, done)
  }

  async run (fn) {
    try {
      for await (const args of this) {
        fn(...args)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        logger.error('[kube-config] watch files ended with error: %s', err.message)
      }
    }
  }
}

module.exports = Watcher
