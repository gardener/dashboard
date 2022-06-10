//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const { Readable } = require('stream')
const chokidar = require('chokidar')
const { globalLogger: logger } = require('@gardener-dashboard/logger')

class Watcher extends Readable {
  #paths
  #timeout
  #watching
  #fsWatcher

  constructor (paths, { readyTimeout = 15000, ...options } = {}) {
    super({
      ...options,
      objectMode: true
    })
    this.#paths = paths
    this.#timeout = readyTimeout
    this.#watching = false
    this.#fsWatcher = null
  }

  _construct (callback) {
    const timeoutID = setTimeout(() => {
      callback(new Error(`FSWatcher timed out after ${this.#timeout} milliseconds`))
    }, this.#timeout)

    this.#fsWatcher = chokidar.watch(this.#paths, {
      persistent: true,
      awaitWriteFinish: true,
      ignoreInitial: true,
      followSymlinks: false,
      disableGlobbing: true
    })
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
    if (!this.#watching) {
      this.#watching = true
      this.#fsWatcher
        .on('change', path => {
          fs.readFile(path, 'utf8', (err, value) => {
            if (err) {
              this.destroy(err)
            } else {
              this.push([path, value])
            }
          })
        })
    }
  }

  _destroy (error, callback) {
    this.#fsWatcher.close()
      .then(() => callback(error))
      .catch(closeError => callback(closeError || error))
  }
}

module.exports = Watcher
